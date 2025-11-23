// En: backend/routes/agendaRoutes.js

const express = require('express');
const admin = require('firebase-admin');
const { isMedico, isPaciente, isAdmin, checkAuth } = require('../middleware/authMiddleware'); // ¡Importamos al guardia 'isMedico'!

const router = express.Router();

// --- RUTA POST para CREAR DISPONIBILIDAD (RQF-02) ---
// (Ahora la pueden usar Médicos (para sí mismos) o Admins (para cualquiera))
router.post('/disponibilidad', checkAuth, async (req, res) => {
    const db = admin.firestore();
    try {
        const { rol, uid, name } = req.user; // Datos del token
        const { fecha, horaInicio, horaFin, medicoId } = req.body; // Datos del formulario

        let finalMedicoId;
        let finalMedicoNombre;
        let finalEspecialidadNombre;

        if (rol === 'administrador') {
            // Si es Admin, DEBE enviar un medicoId en el body
            if (!medicoId) {
                return res.status(400).send({ message: 'Admin debe especificar un medicoId.' });
            }
            finalMedicoId = medicoId;
            // 1. Buscamos el documento del médico en la colección 'medicos'
            const medicoRef = db.collection('medicos').doc(medicoId);
            const medicoDoc = await medicoRef.get();

            if (!medicoDoc.exists) {
                return res.status(404).send({ message: 'El médico seleccionado no existe en la base de datos de Médicos.' });
            }

            // 2. Usamos el nombre real del médico
            finalMedicoNombre = medicoDoc.data().nombre;
            finalEspecialidadNombre = medicoDoc.data().especialidad.nombre;

        } else if (rol === 'medico') {
            // Si es Médico, se le asigna a él mismo
            finalMedicoId = uid;
            finalMedicoNombre = name;
            // ¡El médico también necesita buscar su propia especialidad!
            const medicoRef = db.collection('medicos').doc(uid);
            const medicoDoc = await medicoRef.get();
            if (!medicoDoc.exists) {
                return res.status(404).send({ message: 'No se encontró tu perfil de médico. Contacta al admin.' });
            }
            finalEspecialidadNombre = medicoDoc.data().especialidad.nombre;
        } else {
            return res.status(403).send({ message: 'No autorizado.' });
        }

        if (!fecha || !horaInicio || !horaFin) {
            return res.status(400).send({ message: 'Fecha, hora de inicio y hora de fin son requeridas.' });
        }

        const dispoRef = await db.collection('disponibilidad').add({
            medicoId: finalMedicoId,
            medicoNombre: finalMedicoNombre,
            especialidadNombre: finalEspecialidadNombre,
            fecha: fecha,
            horaInicio: horaInicio,
            horaFin: horaFin,
            estado: 'disponible',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(201).send({ id: dispoRef.id });

    } catch (error) {
        console.error('Error al crear disponibilidad:', error);
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

// Ruta: GET /api/agenda/disponibilidad?medicoId=...
router.get('/disponibilidad', isPaciente, async (req, res) => {
    const db = admin.firestore();
    try {
        // 1. ¡Leemos el medicoId de la URL!
        const { medicoId } = req.query;

        if (!medicoId) {
            return res.status(400).send({ message: "Se requiere un ID de médico." });
        }

        // 2. Construimos la consulta
        const snapshot = await db.collection('disponibilidad')
            .where('medicoId', '==', medicoId)       // Solo de este médico
            .where('estado', '==', 'disponible')   // Solo slots disponibles
            .orderBy('fecha', 'asc')             // Ordenados
            .get();

        const disponibilidad = [];
        snapshot.forEach((doc) => {
            disponibilidad.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).send(disponibilidad); // Enviamos el array de horas

    } catch (error) {
        console.error('Error al obtener disponibilidad:', error);
        // ¡OJO! Esta consulta REQUERIRÁ UN ÍNDICE!
        // (disponibilidad, where medicoId, where estado, orderBy fecha)
        if (error.code === 9) {
            return res.status(500).send({ message: 'Error de BD. Revisa la terminal del backend para crear el índice.' });
        }
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

// RUTA GET /api/agenda/medico/:medicoId
// (Admin o Médico pueden ver la agenda COMPLETA de un médico)
router.get('/medico/:medicoId', checkAuth, async (req, res) => {
    const db = admin.firestore();
    const { medicoId } = req.params;
    const { rol, uid } = req.user;

    // Seguridad: O eres Admin, o eres el Médico dueño de esta agenda
    if (rol !== 'administrador' && medicoId !== uid) {
        return res.status(403).send({ message: 'No tienes permiso para ver esta agenda.' });
    }

    try {
        const snapshot = await db.collection('disponibilidad')
            .where('medicoId', '==', medicoId)
            .get();

        const disponibilidad = [];
        snapshot.forEach((doc) => {
            disponibilidad.push({ id: doc.id, ...doc.data() });
        });
        res.status(200).send(disponibilidad);
    } catch (error) {
        console.error('Error al obtener agenda de médico:', error);
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});


// --- RUTA DELETE /api/agenda/:id ---
// (Admin o Médico pueden BORRAR un bloque de disponibilidad)
router.delete('/:id', checkAuth, async (req, res) => {
    const db = admin.firestore();
    const { id } = req.params;
    const { rol, uid } = req.user;

    try {
        const dispoRef = db.collection('disponibilidad').doc(id);
        const doc = await dispoRef.get();

        if (!doc.exists) {
            return res.status(404).send({ message: 'Bloque no encontrado.' });
        }

        // Seguridad: O eres Admin, o eres el Médico dueño
        if (rol !== 'administrador' && doc.data().medicoId !== uid) {
            return res.status(403).send({ message: 'No tienes permiso para borrar esto.' });
        }

        // No dejamos borrar si ya está reservado (primero hay que cancelar la cita)
        if (doc.data().estado === 'reservado') {
            return res.status(400).send({ message: 'No se puede borrar un horario que ya tiene una cita reservada.' });
        }

        await dispoRef.delete();
        res.status(200).send({ message: 'Bloque de disponibilidad eliminado.' });

    } catch (error) {
        console.error('Error al eliminar disponibilidad:', error);
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

module.exports = router;
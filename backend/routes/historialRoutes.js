// En: backend/routes/historialRoutes.js

const express = require('express');
const admin = require('firebase-admin');
// ¡Solo el Médico puede consultar el historial clínico!
const { isMedico } = require('../middleware/authMiddleware');

const router = express.Router();

// --- RUTA GET para LEER EL HISTORIAL DE UN PACIENTE ESPECÍFICO ---
// (Requisito del Médico)
// Ruta: GET /api/historial/paciente/:pacienteId
router.get('/paciente/:pacienteId', isMedico, async (req, res) => {
    const db = admin.firestore();
    try {
        // Obtenemos el ID del paciente desde la URL
        const { pacienteId } = req.params;

        if (!pacienteId) {
            return res.status(400).send({ message: 'Se requiere el ID del paciente.' });
        }

        // Buscamos en la colección 'citas'
        const snapshot = await db.collection('citas')
            .where('pacienteId', '==', pacienteId)
            // Buscamos citas que ya han sido procesadas
            .where('estadoCita', 'in', ['completada', 'no_presento'])
            .orderBy('fecha', 'desc') // Las más recientes primero
            .get();

        const historial = [];
        snapshot.forEach((doc) => {
            historial.push({
                id: doc.id,
                ...doc.data()
                // ¡Enviamos toda la data (incluyendo notas/diagnóstico)
                // porque el solicitante es un Médico!
            });
        });

        res.status(200).send(historial); // Enviamos el array

    } catch (error) {
        console.error('Error al obtener historial del paciente:', error);
        // ¡OJO! Esta consulta REQUERIRÁ UN ÍNDICE!
        // (citas, where pacienteId, where estadoCita (IN), orderBy fecha)
        if (error.code === 9) { // 9 = FAILED_PRECONDITION (requiere índice)
            return res.status(500).send({ message: 'Error de BD. Revisa la terminal del backend para crear el índice.' });
        }
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

module.exports = router;
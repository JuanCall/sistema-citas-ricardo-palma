// En: backend/routes/medicosRoutes.js

const express = require('express');
const admin = require('firebase-admin');
const { isAdmin, checkAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// --- RUTA GET para LEER MÉDICOS (¡Con Búsqueda y Filtro!) ---
router.get('/', checkAuth, async (req, res) => {
    const db = admin.firestore();
    try {
        const { nombre, especialidadId } = req.query; // ¡Nuevos query params!

        let query = db.collection('medicos');

        // ¡Filtro por especialidad!
        if (especialidadId) {
            query = query.where('especialidad.id', '==', especialidadId);
        }

        // ¡Búsqueda por nombre! (Simula "empieza con...")
        if (nombre) {
            query = query.where('nombre', '>=', nombre)
                .where('nombre', '<=', nombre + '\uf8ff');
        }

        // Ordenamos por nombre (¡requerirá índices!)
        query = query.orderBy('nombre', 'asc');

        const snapshot = await query.get();
        const medicos = [];
        snapshot.forEach(doc => {
            medicos.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).send(medicos);
    } catch (error) {
        console.error('Error al obtener médicos:', error);
        // ¡OJO! Prepárate para cazar índices en la terminal
        if (error.code === 9) {
            return res.status(500).send({ message: 'Error de BD. Revisa la terminal del backend para crear el índice.' });
        }
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

// --- RUTA PUT para ACTUALIZAR MÉDICO ---
router.put('/:id', isAdmin, async (req, res) => {
    const db = admin.firestore();
    try {
        const { id } = req.params;
        const { nombre, especialidadId, especialidadNombre, contacto, horario, estado } = req.body;

        if (!nombre || !especialidadId || !especialidadNombre || !estado) {
            return res.status(400).send({ message: 'Nombre, especialidad y estado son requeridos.' });
        }

        const medicoRef = db.collection('medicos').doc(id);
        await medicoRef.update({
            nombre: nombre,
            contacto: contacto || null,
            horario: horario || 'No especificado',
            estado: estado, // 'activo' o 'inactivo'
            especialidad: {
                id: especialidadId,
                nombre: especialidadNombre
            }
        });

        res.status(200).send({ message: 'Médico actualizado exitosamente.' });
    } catch (error) {
        console.error('Error al actualizar médico:', error);
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

// --- RUTA PUT para INHABILITAR MÉDICO (Cambio de estado) ---
// (Es más seguro que un DELETE, así no rompemos citas antiguas)
router.put('/:id/inhabilitar', isAdmin, async (req, res) => {
    const db = admin.firestore();
    try {
        const { id } = req.params;
        await db.collection('medicos').doc(id).update({
            estado: 'inactivo'
        });
        res.status(200).send({ message: 'Médico inhabilitado exitosamente.' });
    } catch (error) {
        console.error('Error al inhabilitar médico:', error);
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

module.exports = router;
// En: backend/routes/especialidadesRoutes.js

const express = require('express');
const admin = require('firebase-admin');
// ¡Importamos los guardias!
const { isAdmin, checkAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// --- RUTA POST para CREAR ESPECIALIDAD ---
// (Admin)
router.post('/', isAdmin, async (req, res) => {
    const db = admin.firestore();
    try {
        const { nombre, descripcion } = req.body;
        if (!nombre) {
            return res.status(400).send({ message: 'El nombre de la especialidad es requerido.' });
        }

        const especialidadRef = await db.collection('especialidades').add({
            nombre: nombre,
            descripcion: descripcion || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).send({ message: 'Especialidad creada exitosamente', id: especialidadRef.id });

    } catch (error) {
        console.error('Error al crear especialidad:', error);
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

// --- RUTA GET para LEER TODAS LAS ESPECIALIDADES ---
// (Cualquier usuario autenticado, para que el paciente pueda verlas)
router.get('/', checkAuth, async (req, res) => {
    const db = admin.firestore();
    try {
        const snapshot = await db.collection('especialidades').orderBy('nombre', 'asc').get();
        const especialidades = [];
        snapshot.forEach(doc => {
            especialidades.push({ id: doc.id, ...doc.data() });
        });
        res.status(200).send(especialidades);
    } catch (error) {
        console.error('Error al obtener especialidades:', error);
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

// --- RUTA PUT para ACTUALIZAR ESPECIALIDAD ---
// (Admin)
router.put('/:id', isAdmin, async (req, res) => {
    const db = admin.firestore();
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;

        if (!nombre) {
            return res.status(400).send({ message: 'El nombre es requerido.' });
        }

        const especialidadRef = db.collection('especialidades').doc(id);
        await especialidadRef.update({
            nombre: nombre,
            descripcion: descripcion
        });

        res.status(200).send({ message: 'Especialidad actualizada exitosamente.' });
    } catch (error) {
        console.error('Error al actualizar especialidad:', error);
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

// --- RUTA DELETE para ELIMINAR ESPECIALIDAD ---
// (Admin)
router.delete('/:id', isAdmin, async (req, res) => {
    const db = admin.firestore();
    try {
        const { id } = req.params;
        // (En un sistema real, primero verificaríamos que ningún médico
        // esté usando esta especialidad antes de borrarla)
        await db.collection('especialidades').doc(id).delete();
        res.status(200).send({ message: 'Especialidad eliminada exitosamente.' });
    } catch (error) {
        console.error('Error al eliminar especialidad:', error);
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

module.exports = router;
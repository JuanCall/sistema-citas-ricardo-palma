// En: backend/routes/perfilRoutes.js

const express = require('express');
const admin = require('firebase-admin');
// ¡Solo necesitamos 'checkAuth', ya que CUALQUIER rol puede editar su PROPIO perfil!
const { checkAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// --- RUTA GET para LEER MI PERFIL ---
// Ruta: GET /api/perfil/
router.get('/', checkAuth, async (req, res) => {
    const db = admin.firestore();
    try {
        // Obtenemos el ID del usuario desde su token
        const uid = req.user.uid;

        const userRef = db.collection('users').doc(uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            return res.status(404).send({ message: 'Perfil de usuario no encontrado.' });
        }

        res.status(200).send(doc.data());

    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

// --- RUTA PUT para ACTUALIZAR MI PERFIL ---
// Ruta: PUT /api/perfil/
router.put('/', checkAuth, async (req, res) => {
    const db = admin.firestore();
    try {
        const uid = req.user.uid;

        // 1. ¡Obtenemos los nuevos datos del frontend!
        const { nombre, telefono, edad, preferencias } = req.body;

        if (!nombre) {
            return res.status(400).send({ message: 'El nombre es obligatorio.' });
        }

        // 2. Actualizamos el 'displayName' en Firebase Authentication
        await admin.auth().updateUser(uid, {
            displayName: nombre
        });

        // 3. Preparamos el objeto de datos para Firestore
        const datosParaActualizar = {
            nombre: nombre,
            telefono: telefono || null,
            edad: edad || null,
            // ¡Guardamos el objeto de preferencias!
            preferencias: {
                recordatoriosPorEmail: preferencias?.recordatoriosPorEmail || false
                // (Aquí podríamos añadir 'recordatoriosPorWhatsApp' en el futuro)
            }
        };

        // 4. Actualizamos los datos en nuestra colección 'users' de Firestore
        const userRef = db.collection('users').doc(uid);
        await userRef.update(datosParaActualizar);

        res.status(200).send({ message: 'Perfil actualizado exitosamente.' });

    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

module.exports = router;
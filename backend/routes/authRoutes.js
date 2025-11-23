// En: backend/routes/authRoutes.js

const express = require('express');
const admin = require('firebase-admin');

const router = express.Router();

// --- API Endpoint para REGISTRO DE USUARIO (RQF-16) ---
// Ruta: POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        // 1. Obtenemos los datos (el rol siempre será 'paciente')
        const { email, password, nombre, rol } = req.body;

        if (!email || !password || !nombre) {
            return res.status(400).send({ message: 'Faltan campos obligatorios.' });
        }

        // 2. Verificamos que el rol sea 'paciente' (seguridad)
        if (rol !== 'paciente') {
            return res.status(400).send({ message: 'El registro público es solo para pacientes.' });
        }

        // 3. Creamos el usuario en Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: nombre,
        });

        // --- Lógica Simplificada ---

        // 4. ¡Le damos el rol de 'paciente' INMEDIATAMENTE!
        await admin.auth().setCustomUserClaims(userRecord.uid, { rol: 'paciente' });

        // 5. Guardamos sus datos en Firestore
        await admin.firestore().collection('users').doc(userRecord.uid).set({
            nombre: nombre,
            email: email,
            rol: 'paciente',
            estado: 'aprobado', // Los pacientes siempre están aprobados
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 6. Enviamos una respuesta exitosa
        res.status(201).send({
            message: 'Usuario creado exitosamente!',
            uid: userRecord.uid,
            status: 'aprobado'
        });

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        // Manejo de errores comunes de Firebase Auth
        if (error.code === 'auth/email-already-exists') {
            return res.status(400).send({ message: 'El correo electrónico ya está en uso.' });
        }
        res.status(500).send({ message: 'Error interno del servidor.', error: error.message });
    }
});

module.exports = router;
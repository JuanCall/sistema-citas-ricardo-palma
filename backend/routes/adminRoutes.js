// En: backend/routes/adminRoutes.js

const express = require('express');
const admin = require('firebase-admin');
const { isAdmin } = require('../middleware/authMiddleware'); // ¡Solo el Admin puede hacer esto!

const router = express.Router();

// --- Helper function to get YYYY-MM-DD for a Date object ---
const toYYYYMMDD = (date) => {
    return date.toLocaleDateString('en-CA'); // 'en-CA' format es YYYY-MM-DD
};

// Ruta: POST /api/admin/crear-medico
router.post('/crear-medico', isAdmin, async (req, res) => {
    const db = admin.firestore();

    try {
        // 1. Obtenemos los datos del formulario del Admin
        const { email, password, nombre, especialidadId, especialidadNombre, contacto, horario } = req.body;

        if (!email || !password || !nombre || !especialidadId || !especialidadNombre) {
            return res.status(400).send({ message: 'Email, contraseña, nombre y especialidad son requeridos.' });
        }

        // 2. Creamos el usuario en Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: nombre,
        });

        const uid = userRecord.uid;

        // 3. ¡Le damos el ROL (Custom Claim) de 'medico' inmediatamente!
        await admin.auth().setCustomUserClaims(uid, { rol: 'medico' });

        // 4. Creamos su perfil en la colección 'users'
        await db.collection('users').doc(uid).set({
            nombre: nombre,
            email: email,
            rol: 'medico',
            estado: 'aprobado', // Nace aprobado
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 5. Creamos su perfil profesional en la colección 'medicos'
        await db.collection('medicos').doc(uid).set({
            nombre: nombre,
            contacto: contacto || email,
            horario: horario || 'Por Definir',
            estado: 'activo',
            especialidad: {
                id: especialidadId,
                nombre: especialidadNombre
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(201).send({ message: `¡Cuenta de Médico para ${nombre} creada exitosamente!`, uid: uid });

    } catch (error) {
        // ... (el 'catch' block de siempre)
        console.error('Error al crear cuenta de médico:', error);
        if (error.code === 'auth/email-already-exists') {
            return res.status(400).send({ message: 'El correo electrónico ya está en uso.' });
        }
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

// (Requisito del Admin)
// Ruta: GET /api/admin/historial-pagos
router.get('/historial-pagos', isAdmin, async (req, res) => {
    const db = admin.firestore();
    try {
        // Buscamos en la colección 'citas'
        const snapshot = await db.collection('citas')
            // Buscamos solo citas que tengan un ID de pago
            .where('paymentId', '!=', null)
            .orderBy('paymentId') // Requerido por el '!='
            .orderBy('fechaPago', 'desc') // Las más recientes primero
            .get();

        const historialPagos = [];
        let contador = 1; // Para el 'numero de referencia'

        snapshot.forEach((doc) => {
            const cita = doc.data();

            // Formateamos el número de referencia como pediste (P-000001-2025)
            const refNumber = `P-${String(contador).padStart(6, '0')}-${new Date(cita.fechaPago).getFullYear()}`;
            contador++;

            historialPagos.push({
                id: doc.id,
                numeroReferencia: refNumber,
                paciente: cita.pacienteNombre,
                especialidad: cita.medicoNombre, // Asumimos que la especialidad es la del médico
                monto: cita.precio,
                metodo: cita.metodoPago,
                fecha: new Date(cita.fechaPago).toLocaleString('es-PE'), // Formato legible
            });
        });

        res.status(200).send(historialPagos); // Enviamos el array

    } catch (error) {
        console.error('Error al obtener historial de pagos:', error);
        // (citas, where paymentId != null, orderBy paymentId, orderBy fechaPago)
        if (error.code === 9) { // 9 = FAILED_PRECONDITION (requiere índice)
            return res.status(500).send({ message: 'Error de BD. Revisa la terminal del backend para crear el índice.' });
        }
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

// Ruta: GET /api/admin/buscar-citas?rangoFecha=...
router.get('/buscar-citas', isAdmin, async (req, res) => {
    const db = admin.firestore();
    try {
        // 1. Obtenemos el filtro de rango de fecha
        const { rangoFecha } = req.query; // (hoy, semana, mes, todo)

        let query = db.collection('citas');
        const hoy = new Date();

        // --- 2. Aplicamos el Filtro de Rango de Fecha (si existe) ---
        if (rangoFecha === 'hoy') {
            query = query.where('fecha', '==', toYYYYMMDD(hoy));

        } else if (rangoFecha === 'semana') {
            const d = new Date();
            const day = d.getDay(); // 0=Domingo, 1=Lunes
            const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar a Lunes
            const inicioSemana = new Date(d.setDate(diff));

            query = query.where('fecha', '>=', toYYYYMMDD(inicioSemana))
                .where('fecha', '<=', toYYYYMMDD(hoy));

        } else if (rangoFecha === 'mes') {
            const d = new Date();
            const inicioMes = new Date(d.getFullYear(), d.getMonth(), 1); // Primer día del mes

            query = query.where('fecha', '>=', toYYYYMMDD(inicioMes))
                .where('fecha', '<=', toYYYYMMDD(hoy));
        }
        // Si rangoFecha es 'todo' (o no se envía), no aplicamos filtro de fecha

        // 3. Ordenamos (¡prepárate para índices!)
        // Necesitamos ordenar por fecha para que los filtros de rango funcionen
        query = query.orderBy('fecha', 'desc');

        const snapshot = await query.get();
        const citas = [];
        snapshot.forEach(doc => {
            citas.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).send(citas); // ¡Enviamos la lista completa!

    } catch (error) {
        console.error('Error al buscar citas:', error);
        // ¡OJO! Prepárate para cazar índices (ej. citas, where fecha >=, where fecha <=, orderBy fecha)
        if (error.code === 9) {
            return res.status(500).send({ message: 'Error de BD. Revisa la terminal del backend para crear el índice.' });
        }
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

module.exports = router;
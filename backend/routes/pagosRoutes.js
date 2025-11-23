// En: backend/routes/pagosRoutes.js

const express = require('express');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const admin = require('firebase-admin');
const { isPaciente } = require('../middleware/authMiddleware');
const { createPaymentPreference } = require('../services/paymentService');

const { enviarEmailConfirmacion } = require('../utils/emailService');

const router = express.Router();

const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});


// --- Ruta POST para CREAR PREFERENCIA (¡AHORA USA EL SERVICIO!) ---
router.post('/crear-preferencia', isPaciente, async (req, res) => {
    try {
        const { disponibilidadId, motivoConsulta } = req.body;

        // Preparamos el objeto usuario
        const user = {
            uid: req.user.uid,
            email: req.user.email,
            name: req.user.name
        };

        if (!disponibilidadId || !motivoConsulta) {
            return res.status(400).send({ message: 'Faltan datos.' });
        }

        // 2. Usamos el servicio compartido
        const init_point = await createPaymentPreference(disponibilidadId, user, motivoConsulta);

        res.status(201).send({ init_point });

    } catch (error) {
        console.error('Error al crear preferencia:', error);
        res.status(500).send({ message: error.message || 'Error interno.' });
    }
});


// --- Ruta POST PARA CONFIRMAR PAGO Y RESERVAR CITA (CON EMAIL)---
router.post('/confirmar-pago', isPaciente, async (req, res) => {
    const db = admin.firestore();

    try {
        // 1. Obtenemos TODOS los datos del frontend
        const { payment_id, status, preference_id } = req.body; // <-- ¡NUEVO!

        if (status !== 'approved') { throw new Error('El pago no fue aprobado.'); }

        // 2. Verificamos el PAGO (para el status)
        const payment = await new Payment(client).get({ id: payment_id });
        if (!payment || payment.status !== 'approved') { throw new Error('El pago no pudo ser verificado o no fue aprobado.'); }

        // 3. ¡OBTENEMOS LA PREFERENCIA (para la metadata)!
        const preference = await new Preference(client).get({ preferenceId: preference_id });
        if (!preference || !preference.metadata) {
            throw new Error('La preferencia de pago no fue encontrada o no tiene metadata.');
        }

        // 4. ¡Ahora sí leemos la metadata del lugar correcto!
        const { pacienteId, disponibilidadId, motivoConsulta } = preference.metadata;

        // 5. ¡Verificación de seguridad! (Ahora SÍ va a funcionar)
        if (pacienteId !== req.user.uid) {
            throw new Error('El pago no corresponde a este usuario.');
        }

        // 6. --- ¡LÓGICA DE TRANSACCIÓN (sigue igual) ---
        const dispoRef = db.collection('disponibilidad').doc(disponibilidadId);
        const citaRef = db.collection('citas').doc();
        // --- Variables para guardar los datos para el email ---
        let emailData = {};

        await db.runTransaction(async (transaction) => {
            const dispoDoc = await transaction.get(dispoRef);

            if (!dispoDoc.exists) { throw new Error('El bloque de horario ya no existe.'); }
            if (dispoDoc.data().estado !== 'disponible') { throw new Error('Este horario ya fue reservado.'); }

            const pacienteNombre = req.user.name;
            const dispoData = dispoDoc.data();

            emailData = {
                pacienteNombre: pacienteNombre,
                pacienteEmail: req.user.email,
                medicoNombre: dispoData.medicoNombre,
                fecha: dispoData.fecha,
                horaInicio: dispoData.horaInicio
            };

            transaction.set(citaRef, {
                pacienteId: pacienteId,
                pacienteNombre: pacienteNombre,
                medicoId: dispoData.medicoId,
                medicoNombre: dispoData.medicoNombre,
                especialidadNombre: dispoData.especialidadNombre,
                fecha: dispoData.fecha,
                horaInicio: dispoData.horaInicio,
                horaFin: dispoData.horaFin,
                estadoCita: 'reservada',
                disponibilidadId: disponibilidadId,
                motivoConsulta: motivoConsulta,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),

                paymentId: payment_id,
                precio: payment.transaction_amount,
                metodoPago: payment.payment_type_id, // ej. 'debit_card', 'credit_card'
                fechaPago: payment.date_approved // Fecha exacta en que se aprobó
            });

            transaction.update(dispoRef, {
                estado: 'reservado',
                pacienteId: pacienteId
            });
        });
        // --- ¡FIN DE LA TRANSACCIÓN! ---

        // --- ¡ENVÍA EL CORREO DE CONFIRMACIÓN! ---
        // (Lo hacemos *después* de la transacción, para asegurarnos de que la cita se creó)
        await enviarEmailConfirmacion(
            emailData.pacienteEmail,
            emailData.pacienteNombre,
            emailData.medicoNombre,
            emailData.fecha,
            emailData.horaInicio
        );

        res.status(201).send({ message: '¡Pago confirmado! Tu cita ha sido reservada exitosamente.' });

    } catch (error) {
        console.error('Error al confirmar el pago:', error);

        // Si falla el envío del correo, no queremos fallar toda la transacción
        // (por eso lo pusimos después), pero sí debemos reportarlo.
        if (error.message.includes('enviar el correo')) {
            // El pago se procesó PERO el correo falló.
            // Enviamos el éxito al usuario de todas formas, pero lo logueamos en el server.
            console.error("¡ERROR CRÍTICO DE EMAIL! La cita se cobró pero el correo no se envió.");
            return res.status(201).send({ message: '¡Pago confirmado! Tu cita se reservó (pero hubo un error al enviar el email de confirmación).' });
        }

        // Si fue un error de la transacción (ej. "ya fue reservado")
        res.status(500).send({ message: error.message || 'Error interno del servidor.' });
    }
});

module.exports = router;
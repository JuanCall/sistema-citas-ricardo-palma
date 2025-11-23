const { MercadoPagoConfig, Preference } = require('mercadopago');
const admin = require('firebase-admin');

const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN
});

/**
 * Crea una preferencia de pago en Mercado Pago
 * @param {string} disponibilidadId - ID del slot a reservar
 * @param {object} user - Objeto usuario { uid, email, name }
 * @param {string} motivoConsulta - Motivo o nota para el médico
 */
async function createPaymentPreference(disponibilidadId, user, motivoConsulta) {
    const db = admin.firestore();
    const precioCita = 8; // Precio fijo por ahora

    // 1. Validar Disponibilidad
    const dispoRef = db.collection('disponibilidad').doc(disponibilidadId);
    const dispoDoc = await dispoRef.get();

    if (!dispoDoc.exists || dispoDoc.data().estado !== 'disponible') {
        throw new Error('Este horario ya no está disponible.');
    }

    const medicoNombre = dispoDoc.data().medicoNombre;

    // 2. Crear Preferencia en Mercado Pago
    const preference = new Preference(client);

    const body = {
        items: [
            {
                id: disponibilidadId,
                title: `Cita Médica con ${medicoNombre}`,
                description: `Motivo: ${motivoConsulta.substring(0, 200)}`, // MP tiene límite de caracteres
                quantity: 1,
                unit_price: Number(precioCita),
                currency_id: 'PEN',
            },
        ],
        payer: {
            email: user.email,
            name: user.name
        },
        back_urls: {
            // Asegúrate de que esta URL coincida con tu túnel actual de ngrok
            success: 'https://transnational-garrison-unserviceably.ngrok-free.dev/pago/exito',
            failure: 'https://transnational-garrison-unserviceably.ngrok-free.dev/pago/fallo',
            pending: 'https://transnational-garrison-unserviceably.ngrok-free.dev/pago/pendiente',
        },
        auto_return: 'approved',
        metadata: {
            pacienteId: user.uid,
            disponibilidadId: disponibilidadId,
            motivoConsulta: motivoConsulta
        },
    };

    const result = await preference.create({ body });
    return result.init_point;
}

module.exports = { createPaymentPreference };
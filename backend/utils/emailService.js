// En: backend/utils/emailService.js

const nodemailer = require('nodemailer');

// 1. Configuramos el "transportador" (el servicio que envía, en este caso Gmail)
// Lee las variables secretas que pusimos en .env
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
        user: process.env.EMAIL_USER, // Tu correo de Gmail
        pass: process.env.EMAIL_PASS, // Tu contraseña de aplicación de 16 dígitos
    },
});

// 2. Creamos una función reutilizable para enviar correos
/**
 * Envía un correo de confirmación de cita.
 * @param {string} destinatarioEmail - Email del paciente.
 * @param {string} pacienteNombre - Nombre del paciente.
 * @param {string} medicoNombre - Nombre del médico.
 * @param {string} fecha - Fecha de la cita (ej. "2025-11-20").
 * @param {string} horaInicio - Hora de la cita (ej. "10:00").
 */
const enviarEmailConfirmacion = async (destinatarioEmail, pacienteNombre, medicoNombre, fecha, horaInicio) => {

    const mailOptions = {
        from: `"Clínica Ricardo Palma" <${process.env.EMAIL_USER}>`, // Remitente
        to: destinatarioEmail, // Destinatario
        subject: '¡Tu cita ha sido confirmada! (Clínica Ricardo Palma)', // Asunto

        // Cuerpo del correo en texto plano
        text: `Hola ${pacienteNombre},\n\nTu cita con el Dr./Dra. ${medicoNombre} ha sido confirmada.\n\nFecha: ${fecha}\nHora: ${horaInicio}\n\nGracias por confiar en nosotros.\nClínica Ricardo Palma`,

        // Cuerpo del correo en HTML (más bonito)
        html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>¡Hola, ${pacienteNombre}!</h2>
        <p>Tu cita en la <strong>Clínica Ricardo Palma</strong> ha sido confirmada exitosamente.</p>
        <hr>
        <h3>Detalles de la Cita:</h3>
        <ul>
          <li><strong>Médico:</strong> Dr./Dra. ${medicoNombre}</li>
          <li><strong>Fecha:</strong> ${fecha}</li>
          <li><strong>Hora:</strong> ${horaInicio}</li>
        </ul>
        <hr>
        <p>Gracias por confiar en nosotros.</p>
        <p><em>Este es un correo automático, por favor no respondas.</em></p>
      </div>
    `,
    };

    try {
        // 3. Enviamos el correo
        let info = await transporter.sendMail(mailOptions);
        console.log('Correo de confirmación enviado:', info.messageId);
        return true;
    } catch (error) {
        console.error('Error al enviar el correo de confirmación:', error);
        return false;
    }
};

// 4. Exportamos la función para que otras rutas la usen
module.exports = {
    enviarEmailConfirmacion,
};
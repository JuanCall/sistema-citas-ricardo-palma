// En: backend/routes/citasRoutes.js

const express = require('express');
const admin = require('firebase-admin');
const { isPaciente, isMedico, isAdmin } = require('../middleware/authMiddleware');

const PDFDocument = require('pdfkit');

const router = express.Router();

// Ruta: GET /api/citas/mis-citas
router.get('/mis-citas', isPaciente, async (req, res) => {
    const db = admin.firestore();
    try {
        // Obtenemos el ID del paciente desde su token
        const pacienteId = req.user.uid;

        // Buscamos en la colección 'citas'
        const snapshot = await db.collection('citas')
            .where('pacienteId', '==', pacienteId) // Solo las de este paciente
            .orderBy('fecha', 'asc') // Ordenadas por fecha
            .get();

        const misCitas = [];
        snapshot.forEach((doc) => {
            misCitas.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).send(misCitas); // Enviamos el array

    } catch (error) {
        console.error('Error al obtener mis citas:', error);
        // ¡OJO! Esta consulta también podría necesitar un índice
        // Si falla, la terminal del backend nos dará el enlace para crearlo.
        if (error.code === 9) { // 9 = FAILED_PRECONDITION (requiere índice)
            return res.status(500).send({ message: 'Error de base de datos. Revisa la terminal del backend para crear un índice.' });
        }
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

// Ruta: PUT /api/citas/:citaId/cancelar
router.put('/:citaId/cancelar', isPaciente, async (req, res) => {
    const db = admin.firestore();

    // 1. Obtenemos el ID de la cita de los parámetros de la URL
    const { citaId } = req.params;
    // Obtenemos el ID del paciente desde su token (para seguridad)
    const pacienteId = req.user.uid;

    // 2. Definimos las referencias
    const citaRef = db.collection('citas').doc(citaId);

    try {
        // 3. --- ¡INICIA LA TRANSACCIÓN! ---
        await db.runTransaction(async (transaction) => {

            // 3.1. Lee el documento de la cita
            const citaDoc = await transaction.get(citaRef);

            if (!citaDoc.exists) {
                throw new Error('La cita que intentas cancelar no existe.');
            }

            const citaData = citaDoc.data();

            // 3.2. ¡Verificación de seguridad!
            // Nos aseguramos de que el paciente que cancela sea el dueño de la cita
            if (citaData.pacienteId !== pacienteId) {
                throw new Error('No tienes permiso para cancelar esta cita.');
            }

            // 3.3. Verifica que la cita no esté ya cancelada o completada
            if (citaData.estadoCita !== 'reservada') {
                throw new Error('Esta cita no se puede cancelar (posiblemente ya fue cancelada o completada).');
            }

            // 3.4. ¡Encontramos el bloque de disponibilidad original!
            const dispoRef = db.collection('disponibilidad').doc(citaData.disponibilidadId);

            // 3.5. ¡Actualizamos la cita!
            transaction.update(citaRef, {
                estadoCita: 'cancelada'
            });

            // 3.6. ¡Actualizamos (liberamos) el bloque de disponibilidad!
            // Lo ponemos de nuevo 'disponible' y quitamos la referencia al paciente
            transaction.update(dispoRef, {
                estado: 'disponible',
                pacienteId: admin.firestore.FieldValue.delete() // Borramos el campo
            });
        });
        // --- ¡FIN DE LA TRANSACCIÓN! ---

        // 4. Si todo salió bien
        res.status(200).send({ message: '¡Cita cancelada exitosamente! El horario ha sido liberado.' });

    } catch (error) {
        console.error('Error al cancelar la cita:', error);
        res.status(500).send({ message: error.message || 'Error interno del servidor.' });
    }
});

// Ruta: GET /api/citas/medico
router.get('/medico', isMedico, async (req, res) => {
    const db = admin.firestore();
    try {
        // Obtenemos el ID del médico desde su token
        const medicoId = req.user.uid;
        const { filtro } = req.query;

        let query = db.collection('citas')
            .where('medicoId', '==', medicoId)
            .where('estadoCita', '==', 'reservada');

        if (filtro === 'hoy') {
            // Obtenemos la fecha de HOY en formato "YYYY-MM-DD"
            // (Importante: esto usa la zona horaria del servidor,
            // para Perú (UTC-5) esto funciona bien)
            const hoy = new Date().toLocaleDateString('en-CA'); // 'en-CA' da YYYY-MM-DD

            query = query.where('fecha', '==', hoy);
        }

        query = query.orderBy('fecha', 'asc');
        const snapshot = await query.get();

        const misPacientes = [];
        snapshot.forEach((doc) => {
            misPacientes.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).send(misPacientes); // Enviamos el array

    } catch (error) {
        console.error('Error al obtener citas de médico:', error);
        // (citas, where medicoId, where estadoCita, orderBy fecha)
        if (error.code === 9) {
            return res.status(500).send({ message: 'Error de BD. Revisa la terminal del backend para crear un índice.' });
        }
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

// PUT PARA COMPLETAR CITA Y GENERAR PDF
// Ruta: PUT /api/citas/:citaId/completar
router.put('/:citaId/completar', isMedico, async (req, res) => {
    const db = admin.firestore();

    // 1. Obtenemos el "disco duro" de la nube (Storage Bucket)
    const bucket = admin.storage().bucket();

    const { citaId } = req.params;
    const medicoId = req.user.uid;
    const { notas, diagnostico, receta } = req.body; // 'receta' es un array

    if (!diagnostico) {
        return res.status(400).send({ message: 'Se requiere un diagnóstico.' });
    }
    if (!receta || !Array.isArray(receta)) {
        return res.status(400).send({ message: 'El formato de la receta no es válido.' });
    }

    const citaRef = db.collection('citas').doc(citaId);

    try {
        const citaDoc = await citaRef.get();
        if (!citaDoc.exists) { throw new Error('La cita no existe.'); }

        const citaData = citaDoc.data();

        if (citaData.medicoId !== medicoId) {
            throw new Error('No tienes permiso para actualizar esta cita.');
        }

        // --- 2. ¡INICIA LA CREACIÓN DEL PDF! ---
        const filePath = `recetas/cita_${citaId}_paciente_${citaData.pacienteId}.pdf`;
        const file = bucket.file(filePath);
        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        const uploadPromise = new Promise((resolve, reject) => {
            const stream = file.createWriteStream({ metadata: { contentType: 'application/pdf' } });
            doc.pipe(stream);

            // --- 3. ¡NUEVO CÓDIGO DE PDFKIT! ---
            // Encabezado
            doc.fontSize(20).text('Receta Médica - Clínica Ricardo Palma', { align: 'center' });
            doc.moveDown(2);

            // Info del Paciente
            doc.fontSize(12).text(`Paciente: ${citaData.pacienteNombre}`);
            doc.fontSize(12).text(`Médico: ${citaData.medicoNombre}`);
            doc.fontSize(12).text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-PE')}`);
            doc.moveDown();

            // Diagnóstico
            doc.fontSize(16).text('Diagnóstico:', { underline: true });
            doc.fontSize(12).text(diagnostico);
            doc.moveDown();

            // --- ¡LA NUEVA TABLA DE RECETA! ---
            // --- ¡LA NUEVA TABLA DE RECETA (CORREGIDA!) ---
            doc.fontSize(16).text('Prescripción:', { underline: true });
            doc.moveDown();

            const tableTop = doc.y; // Dónde empieza la tabla
            const initialX = doc.x; // La posición X inicial (generalmente 50)
            const cellMargin = 10;  // Espacio entre columnas

            // Definimos anchos fijos. La clave es que el texto se *ajustará* (wrap)
            const colWidths = [180, 100, 100, 100];
            const tableHeaders = ['Medicamento', 'Dosis', 'Frecuencia', 'Duración'];

            // --- 1. Dibuja los Encabezados ---
            doc.fontSize(10).font('Helvetica-Bold');
            let currentX = initialX;
            tableHeaders.forEach((header, i) => {
                doc.text(header, currentX, tableTop);
                currentX += colWidths[i] + cellMargin;
            });
            doc.y = tableTop + 20; // Mueve 'Y' hacia abajo, listo para la primera fila
            doc.font('Helvetica');
            // ---

            // --- 2. Dibuja las Filas (El Bucle Corregido) ---
            receta.forEach(item => {
                const rowTop = doc.y; // Guarda la posición Y actual de esta fila
                currentX = initialX; // Resetea X al inicio de la línea

                const rowValues = [
                    item.medicamento || 'N/A',
                    item.dosis || 'N/A',
                    item.frecuencia || 'N/A',
                    item.duracion || 'N/A'
                ];

                // ¡Paso Clave A: Calcular la altura máxima de esta fila!
                // (Calculamos cuánto medirá el texto *con* autoajuste)
                let maxHeight = 0;
                rowValues.forEach((text, i) => {
                    const height = doc.heightOfString(text, { width: colWidths[i] });
                    if (height > maxHeight) {
                        maxHeight = height;
                    }
                });

                // ¡Paso Clave B: Dibujar las celdas, todas alineadas a 'rowTop'!
                // (Usamos el 'width' para que el texto se autoajuste verticalmente)
                rowValues.forEach((text, i) => {
                    doc.text(text, currentX, rowTop, {
                        width: colWidths[i],
                        align: 'left'
                    });
                    currentX += colWidths[i] + cellMargin; // Mueve X para la siguiente celda
                });

                // ¡Paso Clave C: Mover 'Y' hacia abajo por la altura máxima!
                // (Esto asegura que la siguiente fila empiece *después* de la celda más alta)
                doc.y = rowTop + maxHeight + 10; // +10 de padding
            });
            // --- FIN DE LA TABLA ---

            doc.moveDown(3);
            doc.fontSize(10).text('Firma del Médico: _________________________', { align: 'center' });

            doc.end(); // Finaliza el PDF

            stream.on('finish', resolve);
            stream.on('error', reject);
        });

        // --- 4. ESPERAMOS A QUE SUBA EL PDF ---
        await uploadPromise;

        // --- 5. OBTENEMOS LA URL DE DESCARGA ---
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491',
        });

        // --- 6. ¡ACTUALIZAMOS FIRESTORE CON EL ARRAY! ---
        await citaRef.update({
            estadoCita: 'completada',
            historial: {
                diagnostico: diagnostico,
                notas: notas || null,
                receta: receta, // ¡Guardamos el array completo!
                recetaUrl: url,
                atendidoEn: admin.firestore.FieldValue.serverTimestamp()
            }
        });

        res.status(200).send({ message: 'Cita completada y receta PDF generada exitosamente.' });

    } catch (error) {
        console.error('Error al completar la cita y generar PDF:', error);
        res.status(500).send({ message: error.message || 'Error interno del servidor.' });
    }
});

// Ruta: GET /api/citas/mi-historial
router.get('/mi-historial', isPaciente, async (req, res) => {
    const db = admin.firestore();
    try {
        // Obtenemos el ID del paciente desde su token
        const pacienteId = req.user.uid;

        // Buscamos en la colección 'citas'
        const snapshot = await db.collection('citas')
            .where('pacienteId', '==', pacienteId) // Solo las de este paciente
            .where('estadoCita', '==', 'completada') // ¡Solo las completadas!
            .orderBy('fecha', 'desc') // Las más recientes primero
            .get();

        const miHistorial = [];
        snapshot.forEach((doc) => {

            // En lugar de enviar todo (...doc.data()),
            // seleccionamos SOLO los campos seguros para el paciente.
            const data = doc.data();
            miHistorial.push({
                id: doc.id,
                fecha: data.fecha,
                horaInicio: data.horaInicio,
                medicoNombre: data.medicoNombre,
                diagnostico: data.historial?.diagnostico || 'N/A',
                estadoCita: data.estadoCita,
                recetaUrl: data.historial?.recetaUrl || null
            });

        });

        res.status(200).send(miHistorial); // Enviamos el array "limpio"

    } catch (error) {
        console.error('Error al obtener el historial:', error);
        // (citas, where pacienteId, where estadoCita, orderBy fecha)
        if (error.code === 9) { // 9 = FAILED_PRECONDITION (requiere índice)
            return res.status(500).send({ message: 'Error de BD. Revisa la terminal del backend para crear un índice.' });
        }
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

// Ruta: PUT /api/citas/:citaId/reprogramar
router.put('/:citaId/reprogramar', isPaciente, async (req, res) => {
    const db = admin.firestore();

    // 1. Obtenemos los IDs
    const { citaId } = req.params; // Cita VIEJA
    const { newDisponibilidadId } = req.body; // Slot NUEVO
    const pacienteId = req.user.uid;
    const pacienteNombre = req.user.name;

    if (!newDisponibilidadId) {
        return res.status(400).send({ message: 'Se requiere el ID del nuevo bloque de disponibilidad.' });
    }

    // 2. Definimos las 4 REFERENCIAS que vamos a tocar
    const oldCitaRef = db.collection('citas').doc(citaId);
    const newDispoRef = db.collection('disponibilidad').doc(newDisponibilidadId);
    const newCitaRef = db.collection('citas').doc(); // Una cita nueva

    try {
        // 3. --- ¡INICIA LA SÚPER TRANSACCIÓN! ---
        await db.runTransaction(async (transaction) => {

            // 3.1. LEER la cita VIEJA
            const oldCitaDoc = await transaction.get(oldCitaRef);
            if (!oldCitaDoc.exists) { throw new Error('La cita original no existe.'); }

            const oldCitaData = oldCitaDoc.data();

            // 3.2. LEER el slot NUEVO
            const newDispoDoc = await transaction.get(newDispoRef);
            if (!newDispoDoc.exists) { throw new Error('El nuevo horario seleccionado ya no existe.'); }

            // 3.3. LEER el slot VIEJO (que vamos a liberar)
            const oldDispoRef = db.collection('disponibilidad').doc(oldCitaData.disponibilidadId);


            // 3.4. ¡VERIFICACIONES DE SEGURIDAD!
            if (oldCitaData.pacienteId !== pacienteId) {
                throw new Error('No tienes permiso para reprogramar esta cita.');
            }
            if (oldCitaData.estadoCita !== 'reservada') {
                throw new Error('Esta cita no se puede reprogramar (ya fue cancelada o completada).');
            }
            if (newDispoDoc.data().estado !== 'disponible') {
                throw new Error('El nuevo horario acaba de ser reservado por alguien más.');
            }


            // 3.5. ¡EJECUTAR LOS 4 CAMBIOS!

            // a) Actualizar Cita VIEJA -> 'reprogramada'
            transaction.update(oldCitaRef, {
                estadoCita: 'reprogramada'
            });

            // b) Liberar Slot VIEJO -> 'disponible'
            transaction.update(oldDispoRef, {
                estado: 'disponible',
                pacienteId: admin.firestore.FieldValue.delete()
            });

            // c) Ocupar Slot NUEVO -> 'reservado'
            transaction.update(newDispoRef, {
                estado: 'reservado',
                pacienteId: pacienteId
            });

            // d) Crear Cita NUEVA -> 'reservada'
            const newDispoData = newDispoDoc.data();
            transaction.set(newCitaRef, {
                pacienteId: pacienteId,
                pacienteNombre: pacienteNombre,
                medicoId: newDispoData.medicoId,
                medicoNombre: newDispoData.medicoNombre,
                especialidadNombre: newDispoData.especialidadNombre,
                fecha: newDispoData.fecha,
                horaInicio: newDispoData.horaInicio,
                horaFin: newDispoData.horaFin,
                estadoCita: 'reservada',
                disponibilidadId: newDisponibilidadId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                // ¡Marcamos que esta cita vino de una reprogramación!
                reprogramadaDe: citaId,
                // Copiamos el ID de pago de la cita original
                paymentId: oldCitaData.paymentId || null
            });
        });
        // --- ¡FIN DE LA TRANSACCIÓN! ---

        // 4. Si todo salió bien
        res.status(200).send({ message: '¡Cita reprogramada exitosamente!' });

    } catch (error) {
        console.error('Error al reprogramar la cita:', error);
        res.status(500).send({ message: error.message || 'Error interno del servidor.' });
    }
});

// Ruta: GET /api/citas/buscar?fecha=...&paciente=...&medico=...
router.get('/buscar', isAdmin, async (req, res) => {
    const db = admin.firestore();
    try {
        // 1. Obtenemos los términos de búsqueda desde la URL (query params)
        const { fecha, paciente, medico } = req.query;

        // 2. Empezamos a construir la consulta a la colección 'citas'
        let query = db.collection('citas');

        // 3. Añadimos filtros a la consulta SIEMPRE que existan
        if (fecha) {
            // Si buscas por fecha, filtramos por 'fecha'
            query = query.where('fecha', '==', fecha);
        }
        if (paciente) {
            // Si buscas por paciente, filtramos por 'pacienteNombre'
            // Usamos >= y <= para simular un "empieza con..." (búsqueda de prefijo)
            query = query.where('pacienteNombre', '>=', paciente)
                .where('pacienteNombre', '<=', paciente + '\uf8ff');
        }
        if (medico) {
            // Si buscas por médico, filtramos por 'medicoNombre'
            query = query.where('medicoNombre', '>=', medico)
                .where('medicoNombre', '<=', medico + '\uf8ff');
        }

        // 4. Ordenamos por fecha (¡esto requerirá índices!)
        query = query.orderBy('fecha', 'desc');

        // 5. Ejecutamos la consulta
        const snapshot = await query.get();

        const citasEncontradas = [];
        snapshot.forEach((doc) => {
            citasEncontradas.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).send(citasEncontradas); // Enviamos el array

    } catch (error) {
        console.error('Error al buscar citas:', error);
        // ¡OJO! Esta consulta REQUERIRÁ VARIOS ÍNDICES NUEVOS!
        // (Ej. un índice para 'fecha' y 'pacienteNombre', otro para 'fecha' y 'medicoNombre')
        if (error.code === 9) { // 9 = FAILED_PRECONDITION (requiere índice)
            return res.status(500).send({ message: 'Error de BD. Revisa la terminal del backend para crear el índice necesario para esta búsqueda.' });
        }
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});


// Ruta: PUT /api/citas/:citaId/marcar-ausencia
router.put('/:citaId/marcar-ausencia', isMedico, async (req, res) => {
    const db = admin.firestore();

    const { citaId } = req.params;
    const medicoId = req.user.uid; // ID del médico logueado

    const citaRef = db.collection('citas').doc(citaId);

    try {
        const citaDoc = await citaRef.get();

        if (!citaDoc.exists) {
            throw new Error('La cita no existe.');
        }

        // Verificación de seguridad: ¿Este médico es el dueño de la cita?
        if (citaDoc.data().medicoId !== medicoId) {
            throw new Error('No tienes permiso para actualizar esta cita.');
        }

        // Verificación de estado: Solo se puede marcar si está 'reservada'
        if (citaDoc.data().estadoCita !== 'reservada') {
            throw new Error('Esta cita ya fue procesada (completada, cancelada o marcada).');
        }

        // ¡Actualizamos el estado de la cita!
        await citaRef.update({
            estadoCita: 'no_presento'
        });

        res.status(200).send({ message: 'Cita marcada como "No se presentó" exitosamente.' });

    } catch (error) {
        console.error('Error al marcar ausencia:', error);
        res.status(500).send({ message: error.message || 'Error interno del servidor.' });
    }
});

module.exports = router;
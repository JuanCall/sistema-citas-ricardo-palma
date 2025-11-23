// En: backend/routes/reportesRoutes.js

const express = require('express');
const admin = require('firebase-admin');
const { isAdmin } = require('../middleware/authMiddleware'); // ¡Solo el Admin puede ver reportes!
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

const router = express.Router();

const toYYYYMMDD = (date) => {
    return date.toLocaleDateString('en-CA'); // 'en-CA' format es YYYY-MM-DD
};

// --- API Endpoint para OBTENER REPORTE DE ESTADO DE CITAS (RQF-15) ---
// Ruta: GET /api/reportes/resumen-citas
router.get('/resumen-citas', isAdmin, async (req, res) => {
    const db = admin.firestore();
    try {
        // 1. Obtenemos TODAS las citas
        const snapshot = await db.collection('citas').get();

        // 2. Inicializamos nuestro contador
        const reportes = {
            total: 0,
            reservada: 0,
            completada: 0,
            cancelada: 0,
            otros: 0 // Por si acaso
        };

        // 3. Contamos cada cita
        snapshot.forEach((doc) => {
            const cita = doc.data();
            reportes.total++;

            switch (cita.estadoCita) {
                case 'reservada':
                    reportes.reservada++;
                    break;
                case 'completada':
                    reportes.completada++;
                    break;
                case 'cancelada':
                    reportes.cancelada++;
                    break;
                default:
                    reportes.otros++;
            }
        });

        // 4. Enviamos el objeto con los conteos
        res.status(200).send(reportes);

    } catch (error) {
        console.error('Error al generar reporte de citas:', error);
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

// Ruta: GET /api/reportes/graficas-citas
router.get('/graficas-citas', isAdmin, async (req, res) => {
    const db = admin.firestore();
    try {
        // Obtenemos TODAS las citas que no estén 'pendientedepago' (si tuvieras ese estado)
        const snapshot = await db.collection('citas').get();

        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

        // --- Preparamos los contenedores de datos ---

        // 1. Para Gráfica de Torta (Por Especialidad)
        const conteoEspecialidades = {}; // ej. { "Cardiología": 10, "Pediatría": 5 }

        // 2. Para Gráfica de Línea (Tendencia Mensual)
        // Inicializamos los últimos 6 meses con 0 citas
        const tendenciaMensual = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            // Creamos una clave "YYYY-MM" (ej. "2025-10")
            const claveMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            tendenciaMensual[claveMes] = 0;
        }

        snapshot.forEach((doc) => {
            const cita = doc.data();

            // --- Contar para Gráfica de Torta ---
            const especialidad = cita.especialidadNombre || 'Sin Especialidad';
            if (conteoEspecialidades[especialidad]) {
                conteoEspecialidades[especialidad]++;
            } else {
                conteoEspecialidades[especialidad] = 1;
            }

            // --- Contar para Gráfica de Línea ---
            const fechaCita = new Date(cita.fecha); // Asume que 'fecha' es "YYYY-MM-DD"
            if (fechaCita >= seisMesesAtras) {
                const claveMes = `${fechaCita.getFullYear()}-${String(fechaCita.getMonth() + 1).padStart(2, '0')}`;
                if (tendenciaMensual.hasOwnProperty(claveMes)) {
                    tendenciaMensual[claveMes]++;
                }
            }
        });

        // 3. Enviamos los datos listos para Chart.js
        res.status(200).send({
            porEspecialidad: conteoEspecialidades,
            tendenciaMensual: tendenciaMensual
        });

    } catch (error) {
        console.error('Error al generar datos de gráficas:', error);
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

// Ruta: GET /api/reportes/exportar-citas
router.get('/exportar-citas', isAdmin, async (req, res) => {
    const db = admin.firestore();
    try {
        // 1. Obtenemos TODAS las citas (¡podríamos necesitar un índice!)
        const snapshot = await db.collection('citas')
            .orderBy('fecha', 'desc')
            .get();

        const citas = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            // 2. "Aplanamos" los datos para el CSV
            citas.push({
                id: doc.id,
                fecha: data.fecha,
                hora: data.horaInicio,
                paciente: data.pacienteNombre,
                medico: data.medicoNombre,
                especialidad: data.especialidadNombre || 'N/A',
                estado: data.estadoCita,
                precio: data.precio,
                diagnostico: data.historial?.diagnostico || '', // '?' por si no existe
                notas: data.historial?.notas || '',
                paymentId: data.paymentId
            });
        });

        // 3. Definimos las columnas del CSV
        const fields = ['id', 'fecha', 'hora', 'medico', 'paciente', 'estado', 'precio', 'diagnostico', 'notas', 'paymentId'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(citas);

        // 4. Configuramos la respuesta para que el navegador descargue el archivo
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="reporte-citas.csv"');

        // 5. Enviamos el archivo CSV
        res.status(200).send(csv);

    } catch (error) {
        console.error('Error al exportar reporte:', error);
        //índice (citas, orderBy fecha)
        if (error.code === 9) {
            return res.status(500).send({ message: 'Error de BD. Revisa la terminal del backend para crear un índice.' });
        }
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

// Ruta: GET /api/reportes/exportar-citas-pdf
router.get('/exportar-citas-pdf', isAdmin, async (req, res) => {
    const db = admin.firestore();
    try {
        // 1. Obtenemos los datos (igual que en CSV)
        const snapshot = await db.collection('citas').orderBy('fecha', 'desc').get();
        const citas = [];
        snapshot.forEach(doc => {
            citas.push(doc.data());
        });

        // 2. Configuramos la respuesta para PDF
        // ¡El nombre del archivo que descargará el usuario!
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="reporte-citas.pdf"');

        // 3. Crear el PDF y "entubarlo" (pipe) a la respuesta
        // ¡Lo ponemos 'landscape' (apaisado) para que quepa la tabla!
        const doc = new PDFDocument({ layout: 'landscape', margin: 30 });
        doc.pipe(res); // El PDF va directo a la respuesta (al download)

        // 4. Escribir el PDF
        doc.fontSize(18).text('Reporte de Citas - Clínica Ricardo Palma', { align: 'center' });
        doc.moveDown(2);

        // 5. ¡Dibujar la tabla! (Usamos la lógica que ya perfeccionamos)
        const tableTop = doc.y;
        const initialX = doc.x; // (generalmente 30)
        const cellMargin = 5;
        // Columnas y anchos para el modo apaisado
        const tableHeaders = ['Fecha', 'Paciente', 'Médico', 'Especialidad', 'Estado', 'Monto'];
        const colWidths = [70, 150, 150, 120, 80, 60];

        doc.fontSize(10).font('Helvetica-Bold');
        let currentX = initialX;
        tableHeaders.forEach((header, i) => {
            doc.text(header, currentX, tableTop, { width: colWidths[i] });
            currentX += colWidths[i] + cellMargin;
        });
        doc.y = tableTop + 25; // Mover abajo
        doc.font('Helvetica');
        // ---

        // 6. Dibujar las Filas
        citas.forEach(cita => {
            const rowTop = doc.y;
            currentX = initialX;

            const rowValues = [
                cita.fecha,
                cita.pacienteNombre,
                cita.medicoNombre,
                cita.especialidadNombre || 'N/A',
                cita.estadoCita,
                (cita.precio != null ? `S/ ${Number(cita.precio).toFixed(2)}` : 'N/A')
            ];

            let maxHeight = 0;
            rowValues.forEach((text, i) => {
                const height = doc.heightOfString(String(text), { width: colWidths[i] });
                if (height > maxHeight) maxHeight = height;
            });

            rowValues.forEach((text, i) => {
                doc.text(String(text), currentX, rowTop, { width: colWidths[i] });
                currentX += colWidths[i] + cellMargin;
            });

            doc.y = rowTop + maxHeight + 10;

            // Salto de página automático (si la tabla es muy larga)
            if (doc.y > doc.page.height - 50) {
                doc.addPage({ layout: 'landscape', margin: 30 });
                doc.y = 30; // Reset 'y'
                // (En un reporte real, volveríamos a dibujar los headers aquí)
            }
        });

        // 7. Finalizar el PDF
        doc.end();

    } catch (error) {
        console.error('Error al exportar PDF:', error);
        // ¡OJO! ¡El índice de 'citas' ordenado por 'fecha' ya lo creamos
        // para la exportación CSV, así que esto no debería fallar!
        if (error.code === 9) {
            return res.status(500).send({ message: 'Error de BD. Revisa la terminal del backend.' });
        }
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

// Ruta: GET /api/reportes/financiero
router.get('/financiero', isAdmin, async (req, res) => {
    const db = admin.firestore();
    try {
        // Obtenemos la fecha de HOY (en la zona horaria del servidor)
        const hoy = toYYYYMMDD(new Date());

        // 1. Buscamos TODAS las citas completadas (pagadas)
        const snapshot = await db.collection('citas')
            .where('estadoCita', '==', 'completada')
            .orderBy('fechaPago', 'desc') // ¡Necesitaremos un índice!
            .get();

        // --- 2. Preparamos los contenedores de datos ---

        // Para Gráfica de Línea (Evolución Mensual)
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
        const evolucionMensual = {}; // ej. { "2025-10": 1500, "2025-11": 2100 }

        // Inicializamos los últimos 6 meses con 0 soles
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const claveMes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            evolucionMensual[claveMes] = 0;
        }

        // Para Estadísticas
        let ingresosHoy = 0;
        let ingresoTotal = 0;
        let conteoCitasCompletadas = 0;

        snapshot.forEach((doc) => {
            const cita = doc.data();
            const precio = Number(cita.precio) || 0; // "Blindaje" por si el precio es null

            if (!cita.fechaPago) return; // Si no tiene fecha de pago, la saltamos

            conteoCitasCompletadas++;
            ingresoTotal += precio;

            const fechaPago = new Date(cita.fechaPago);

            // --- Calcular Ingresos Hoy ---
            if (toYYYYMMDD(fechaPago) === hoy) {
                ingresosHoy += precio;
            }

            // --- Calcular Evolución Mensual ---
            if (fechaPago >= seisMesesAtras) {
                const claveMes = `${fechaPago.getFullYear()}-${String(fechaPago.getMonth() + 1).padStart(2, '0')}`;
                if (evolucionMensual.hasOwnProperty(claveMes)) {
                    evolucionMensual[claveMes] += precio;
                }
            }
        });

        // --- 3. Calcular Promedio ---
        const ingresoPromedio = conteoCitasCompletadas > 0
            ? (ingresoTotal / conteoCitasCompletadas)
            : 0;

        // 4. Enviamos los datos listos para el Admin
        res.status(200).send({
            evolucionMensual: evolucionMensual,
            ingresosHoy: ingresosHoy,
            ingresoPromedio: ingresoPromedio
        });

    } catch (error) {
        console.error('Error al generar reporte financiero:', error);
        // ¡OJO! Esta consulta (where estadoCita, orderBy fechaPago)
        // ¡100% VA A REQUERIR UN ÍNDICE!
        if (error.code === 9) {
            return res.status(500).send({ message: 'Error de BD. Revisa la terminal del backend para crear el índice.' });
        }
        res.status(500).send({ message: 'Error interno del servidor.' });
    }
});

module.exports = router;
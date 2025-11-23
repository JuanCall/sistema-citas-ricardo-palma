const { GoogleGenerativeAI } = require("@google/generative-ai");
const admin = require('firebase-admin');
const { createPaymentPreference } = require('./paymentService');

// --- CONFIGURACIÓN DEL MODELO ---
const MODEL_NAME = "gemini-2.5-pro"; // O el que te haya funcionado (gemini-2.5-pro, gemini-pro)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Función auxiliar para normalizar texto
function normalizeText(text) {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// --- 1. HERRAMIENTAS ---

async function getSpecialties() {
    try {
        const db = admin.firestore();
        const snapshot = await db.collection('especialidades').get();
        if (snapshot.empty) return "Medicina General";
        return snapshot.docs.map(doc => doc.data().nombre).join(", ");
    } catch (e) { return "Medicina General"; }
}

async function checkAvailability(specialtyName, dateStr) {
    const db = admin.firestore();
    console.log(`🤖 IA Buscando Disponibilidad: ${specialtyName} el ${dateStr}`);
    try {
        const snapshot = await db.collection('disponibilidad')
            .where('estado', '==', 'disponible')
            .where('fecha', '==', dateStr)
            .get();

        if (snapshot.empty) {
            return "No encontré horarios para esa fecha. Prueba otra.";
        }

        let slots = [];
        snapshot.forEach(doc => {
            const d = doc.data();
            const dbSpec = normalizeText(d.especialidadNombre || "");
            const searchSpec = normalizeText(specialtyName || "");

            if (!specialtyName || dbSpec.includes(searchSpec)) {
                slots.push(`${d.horaInicio} con Dr. ${d.medicoNombre}`);
            }
        });

        if (slots.length === 0) return `Hay horarios, pero no de ${specialtyName}.`;
        return `Disponibles: ${slots.join(", ")}.`;
    } catch (error) {
        console.error("Error checkAvailability:", error);
        return "Error técnico al buscar.";
    }
}

// ¡HERRAMIENTA DE AGENDAMIENTO MEJORADA!
// Ahora acepta 'diagnosis' (sugerencia)
async function scheduleAppointment(dateStr, timeStr, doctorName, symptoms, diagnosis, user) {
    const db = admin.firestore();
    console.log(`🤖 IA Agendando con Diagnóstico: ${diagnosis}`);

    try {
        // 1. Buscar el ID del slot exacto
        const snapshot = await db.collection('disponibilidad')
            .where('fecha', '==', dateStr)
            .where('horaInicio', '==', timeStr)
            .where('estado', '==', 'disponible')
            .get();

        let slotId = null;
        const searchDoctor = normalizeText(doctorName);

        snapshot.forEach(doc => {
            const data = doc.data();
            const dbDoctor = normalizeText(data.medicoNombre);
            if (dbDoctor.includes(searchDoctor) || searchDoctor.includes(dbDoctor)) {
                slotId = doc.id;
            }
        });

        if (!slotId) {
            return "Lo siento, encontré el horario pero no coincide el nombre del médico. Por favor verifica el nombre exacto.";
        }

        // 2. Generar sugerencia clínica con el DIAGNÓSTICO DE LA IA
        // Este texto es lo que el médico verá en su panel
        const motivoIA = `[IA PRE-DIAGNÓSTICO]\nSíntomas: ${symptoms}\nPosible Diagnóstico IA: ${diagnosis}`;

        // 3. Crear preferencia de pago
        const paymentLink = await createPaymentPreference(slotId, user, motivoIA);

        return `¡Listo! He reservado tu cita. Según tus síntomas, le he sugerido al médico una posible: ${diagnosis}. Para confirmar, realiza el pago aquí: ${paymentLink}`;

    } catch (error) {
        console.error("Error IA agendando:", error);
        return `Error técnico al generar pago: ${error.message}`;
    }
}

// --- 2. EL CEREBRO PRINCIPAL ---

async function chatWithAI(userMessage, history, user) {
    try {
        const specialtiesList = await getSpecialties();

        const today = new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const currentYear = new Date().getFullYear();

        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction: {
                role: "system",
                parts: [{
                    text: `
          Eres el asistente médico IA de la Clínica Ricardo Palma.
          
          CONTEXTO TEMPORAL:
          - Hoy es: ${today}
          - Año actual: ${currentYear}
          
          Tus funciones:
          1. Empatía: Escucha los síntomas.
          2. ANÁLISIS CLÍNICO: Basado en los síntomas, deduce un posible diagnóstico o condición médica (ej. "Posible Migraña", "Infección estomacal", "Gripe común").
          3. Triaje: Recomienda UNA especialidad de: [${specialtiesList}].
          4. FECHAS INTELIGENTES: Si el usuario dice "25 de noviembre", ASUME que es del año ${currentYear}.
          5. Disponibilidad: Usa 'check_availability'.
          6. Reserva: Si el usuario confirma un horario, usa 'schedule_appointment'.
             - IMPORTANTE: Rellena el campo 'symptoms' con lo que dijo el usuario.
             - IMPORTANTE: Rellena el campo 'diagnosis' con tu deducción médica.
          
          Si generas un link de pago, entrégalo tal cual.
        `}]
            }
        });

        const tools = [
            {
                functionDeclarations: [
                    {
                        name: "check_availability",
                        description: "Busca horarios disponibles.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                specialty: { type: "STRING", description: "Especialidad médica." },
                                date: { type: "STRING", description: "Fecha YYYY-MM-DD." }
                            },
                            required: ["specialty", "date"]
                        }
                    },
                    {
                        name: "schedule_appointment",
                        description: "Genera enlace de pago para reservar.",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                date: { type: "STRING", description: "Fecha YYYY-MM-DD." },
                                time: { type: "STRING", description: "Hora inicio (ej. 10:00)." },
                                doctor: { type: "STRING", description: "Nombre del médico." },
                                symptoms: { type: "STRING", description: "Resumen de síntomas." },
                                // ¡NUEVO CAMPO!
                                diagnosis: { type: "STRING", description: "Tu sugerencia de posible diagnóstico médico." }
                            },
                            required: ["date", "time", "doctor", "symptoms", "diagnosis"]
                        }
                    }
                ]
            }
        ];

        const chatSession = model.startChat({ history, tools });
        const result = await chatSession.sendMessage(userMessage);
        const response = result.response;

        const functionCalls = response.functionCalls();

        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            let apiResponse = "";

            if (call.name === "check_availability") {
                apiResponse = await checkAvailability(call.args.specialty, call.args.date);
            } else if (call.name === "schedule_appointment") {
                // Pasamos el diagnóstico a la función
                apiResponse = await scheduleAppointment(
                    call.args.date,
                    call.args.time,
                    call.args.doctor,
                    call.args.symptoms,
                    call.args.diagnosis, // <-- ¡Nuevo argumento!
                    user
                );
            }

            const finalResult = await chatSession.sendMessage([{
                functionResponse: { name: call.name, response: { result: apiResponse } }
            }]);
            return finalResult.response.text();
        }

        return response.text();

    } catch (error) {
        console.error("Error IA:", error);
        if (error.message.includes("404")) return "Error de configuración: Modelo IA no compatible.";
        return "Lo siento, tuve un problema técnico. Intenta de nuevo.";
    }
}

module.exports = { chatWithAI };
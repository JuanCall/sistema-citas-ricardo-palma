require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) { console.log("❌ No hay API Key"); return; }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // Esta función le pide a Google la lista oficial
        const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).apiKey;
        // (El SDK de Node a veces es confuso para listar, usaremos una petición HTTP directa para estar 100% seguros)

        console.log("📡 Contactando a Google vía HTTP directo...");

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.error) {
            console.error("❌ ERROR DE GOOGLE:", data.error.message);
            console.log("👉 TU API KEY NO FUNCIONA o EL PROYECTO NO TIENE PERMISOS.");
        } else if (data.models) {
            console.log("✅ MODELOS DISPONIBLES PARA TI:");
            data.models.forEach(m => {
                if (m.name.includes("gemini")) console.log(` - ${m.name.replace('models/', '')}`);
            });
        } else {
            console.log("⚠️ Respuesta extraña:", data);
        }

    } catch (err) {
        console.error("❌ Error de conexión:", err.message);
    }
}

listModels();
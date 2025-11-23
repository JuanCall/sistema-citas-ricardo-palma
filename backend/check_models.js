require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function checkModels() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("❌ Error: No se encontró GEMINI_API_KEY en el archivo .env");
        return;
    }

    console.log(`🔑 Probando API Key: ${apiKey.substring(0, 5)}...`);

    const genAI = new GoogleGenerativeAI(apiKey);

    // Lista de modelos comunes para probar
    const modelsToTest = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-001",
        "gemini-1.5-pro",
        "gemini-pro",
        "gemini-1.0-pro"
    ];

    console.log("\n🔍 Iniciando diagnóstico de modelos...\n");

    for (const modelName of modelsToTest) {
        process.stdout.write(`Probando '${modelName}'... `);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            // Intentamos una generación mínima para ver si responde
            await model.generateContent("Hola");
            console.log("✅ ¡DISPONIBLE! (Usa este nombre)");
        } catch (error) {
            if (error.message.includes("404") || error.message.includes("Not Found")) {
                console.log("❌ No encontrado (404)");
            } else {
                console.log(`⚠️ Error diferente: ${error.message.split(':')[0]}`);
            }
        }
    }
    console.log("\n--- Fin del diagnóstico ---");
}

checkModels();
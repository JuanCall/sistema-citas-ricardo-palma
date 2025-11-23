const express = require('express');
const { chatWithAI } = require('../services/aiService');
const { checkAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', checkAuth, async (req, res) => {
    try {
        const { message, history } = req.body;

        // Datos del usuario desde el token (gracias a checkAuth)
        const user = {
            uid: req.user.uid,
            email: req.user.email,
            name: req.user.name || "Paciente"
        };

        if (!message) return res.status(400).send({ message: "Mensaje requerido." });

        const formattedHistory = (history || []).map(msg => ({
            role: msg.role === 'bot' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        // ¡Pasamos 'user' al servicio!
        const aiResponse = await chatWithAI(message, formattedHistory, user);

        res.status(200).send({ response: aiResponse });

    } catch (error) {
        console.error("Error chat:", error);
        res.status(500).send({ message: "Error interno." });
    }
});

module.exports = router;
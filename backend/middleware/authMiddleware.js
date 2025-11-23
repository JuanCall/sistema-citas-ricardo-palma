// En: backend/middleware/authMiddleware.js

const admin = require('firebase-admin');

const checkAuth = async (req, res, next) => {
    // ... (tu código de checkAuth sigue igual)
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) { /* ... */ }
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) { /* ... */ }
};

const isAdmin = (req, res, next) => {
    // ... (tu código de isAdmin sigue igual)
    checkAuth(req, res, () => {
        if (req.user.rol === 'administrador') {
            next();
        } else {
            return res.status(403).send({ message: 'Acceso prohibido. Requiere rol de administrador.' });
        }
    });
};

// Middleware para verificar si el usuario es Médico
const isMedico = (req, res, next) => {
    checkAuth(req, res, () => {
        // 1. Revisamos su rol
        if (req.user.rol === 'medico') {
            next(); // ¡Pase! Es un médico.
        } else {
            return res.status(403).send({ message: 'Acceso prohibido. Requiere rol de médico.' });
        }
    });
};

// Middleware para verificar si el usuario es Paciente
const isPaciente = (req, res, next) => {
    checkAuth(req, res, () => {
        if (req.user.rol === 'paciente') {
            next(); // ¡Pase! Es un paciente.
        } else {
            return res.status(403).send({ message: 'Acceso prohibido. Requiere rol de paciente.' });
        }
    });
};

// 3. ¡Exporta el nuevo guardia!
module.exports = { checkAuth, isAdmin, isMedico, isPaciente };
// En: backend/server.js

// 1. Importar las herramientas
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// 2. ¡INICIALIZAR FIREBASE!
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://sistema-citas-ricardo-palma.firebaseio.com',
    storageBucket: 'sistema-citas-ricardo-palma.firebasestorage.app'
});

// 3. Importar las rutas (AHORA SÍ ES SEGURO)
const authRoutes = require('./routes/authRoutes');
const medicosRoutes = require('./routes/medicosRoutes');
const agendaRoutes = require('./routes/agendaRoutes');
const citasRoutes = require('./routes/citasRoutes');
const reportesRoutes = require('./routes/reportesRoutes');
const pagosRoutes = require('./routes/pagosRoutes');
const especialidadesRoutes = require('./routes/especialidadesRoutes');
const adminRoutes = require('./routes/adminRoutes');
const perfilRoutes = require('./routes/perfilRoutes');
const historialRoutes = require('./routes/historialRoutes');
const chatRoutes = require('./routes/chatRoutes');

// 4. Inicializar la App de Express
const app = express();

// 5. Configurar Middlewares
app.use(cors());
app.use(express.json());

// --- Rutas de la API ---
app.use('/api/auth', authRoutes);
app.use('/api/medicos', medicosRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/especialidades', especialidadesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/perfil', perfilRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/chat', chatRoutes);

// 6. Definir una ruta de prueba
app.get('/', (req, res) => {
    res.send('¡El servidor backend para la Clínica Ricardo Palma está funcionando!');
});

// 7. Definir el puerto y arrancar el servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
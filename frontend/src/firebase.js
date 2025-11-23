// En: frontend/src/firebase.js

// Importaciones de Firebase
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";           // <-- 1. Importamos Autenticación
import { getFirestore } from "firebase/firestore"; // <-- 2. Importamos Firestore (Base de Datos)

// Tu configuración (esto está perfecto como lo tenías)
const firebaseConfig = {
    apiKey: "AIzaSyDg_EMaVRurFXi91oHmPwj3-InGcgbVxMw",
    authDomain: "sistema-citas-ricardo-palma.firebaseapp.com",
    projectId: "sistema-citas-ricardo-palma",
    storageBucket: "sistema-citas-ricardo-palma.firebasestorage.app",
    messagingSenderId: "124577647416",
    appId: "1:124577647416:web:b354058513dd08560e0fcd",
    measurementId: "G-13R7DZLJLR"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// --- 3. INICIALIZAMOS Y EXPORTAMOS LOS SERVICIOS ---

// Exportamos la instancia de Autenticación
// (La usaremos para RQF-16: Gestión de roles)
export const auth = getAuth(app);

// Exportamos la instancia de Firestore (Base de Datos)
// (La usaremos para RQF-01, RQF-03, RQF-04: Médicos, Pacientes, Citas)
export const db = getFirestore(app);

// Exportamos 'app' por si acaso, pero 'auth' y 'db' son las claves
export default app;
// En: frontend/src/context/AuthContext.js

import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth } from '../firebase'; // Importamos la auth de firebase.js
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';

// 1. Creamos el Contexto
const AuthContext = createContext();

// 2. Creamos un "Hook" personalizado para usar el contexto fácilmente
export const useAuth = () => {
    return useContext(AuthContext);
};

// 3. Creamos el "Proveedor" (Provider)
// Este componente envolverá nuestra app y le dará acceso al contexto
export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null); // ¿Quién está logueado?
    const [userRole, setUserRole] = useState(null);     // ¿Cuál es su rol?
    const [loading, setLoading] = useState(true); // ¿Está cargando la info del usuario?

    // --- Función para Iniciar Sesión ---
    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    // --- Función para Cerrar Sesión ---
    const logout = () => {
        setUserRole(null); // Borramos el rol
        return signOut(auth); // Cerramos sesión en Firebase
    };

    // 4. Efecto que se ejecuta UNA VEZ cuando la app carga
    // Revisa si ya hay un usuario logueado (ej. si recarga la página)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // --- ¡MAGIA! Aquí leemos el ROL (Custom Claim) ---
                try {
                    const tokenResult = await user.getIdTokenResult();
                    const role = tokenResult.claims.rol; // Leemos el 'rol' que pusimos en el backend

                    setUserRole(role); // Guardamos el rol
                    setCurrentUser(user); // Guardamos el usuario

                } catch (error) {
                    console.error("Error al obtener el rol del usuario:", error);
                    // Si falla (ej. no tiene rol), lo deslogueamos
                    logout();
                }
            } else {
                // No hay nadie logueado
                setCurrentUser(null);
                setUserRole(null);
            }
            setLoading(false); // Terminamos de cargar
        });

        return unsubscribe; // Se "limpia" al desmontar
    }, []); // El array vacío [] significa que solo se ejecuta al montar

    // 5. Valores que compartiremos con toda la app
    const value = {
        currentUser,
        userRole,
        login,
        logout,
    };

    // 6. Retornamos el proveedor
    // Si NO está cargando, muestra los hijos (la app)
    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
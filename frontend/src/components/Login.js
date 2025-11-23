import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import '../Auth.css';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await login(email, password);
        } catch (err) {
            setLoading(false);
            if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                setError('Email o contraseña incorrectos.');
            } else {
                setError('Error al iniciar sesión. Intente de nuevo.');
            }
            console.error(err);
        }
    };

    // 2. JSX ACTUALIZADO CON CLASES
    return (
        <div className="auth-wrapper">
            <div className="auth-card">
                <h2 className="auth-title">Bienvenido</h2>
                <p className="auth-subtitle">Ingresa a tu cuenta para gestionar tus citas</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Correo Electrónico</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="ejemplo@correo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Contraseña</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <div className="message-box message-error">{error}</div>}

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="auth-footer">
                    ¿No tienes una cuenta? <Link to="/registro" className="auth-link">Regístrate aquí</Link>
                </div>
            </div>
        </div>
    );
}

export default Login;
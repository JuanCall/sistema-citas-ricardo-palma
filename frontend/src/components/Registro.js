import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import '../Auth.css';

function Registro() {
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await axios.post('/api/auth/register', {
                nombre: nombre,
                email: email,
                password: password,
                rol: 'paciente',
            });

            setLoading(false);
            setSuccess(response.data.message);
            setNombre('');
            setEmail('');
            setPassword('');
        } catch (err) {
            setLoading(false);
            setError(err.response?.data?.message || 'Error al registrar. Intente de nuevo.');
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-card">
                <h2 className="auth-title">Crear Cuenta</h2>
                <p className="auth-subtitle">Regístrate como paciente para reservar citas</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Nombre Completo</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Juan Pérez"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            required
                        />
                    </div>
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
                    {success && <div className="message-box message-success">{success}</div>}

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Registrando...' : 'Registrarme'}
                    </button>
                </form>

                <div className="auth-footer">
                    ¿Ya tienes una cuenta? <Link to="/login" className="auth-link">Inicia sesión</Link>
                </div>
            </div>
        </div>
    );
}

export default Registro;
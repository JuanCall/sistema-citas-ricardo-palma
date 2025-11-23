import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import '../Dashboard.css'; // <-- IMPORTA EL CSS

function MiPerfil() {
    const { currentUser } = useAuth();

    const [form, setForm] = useState({
        nombre: '', email: '', telefono: '', edad: '',
        preferencias: { recordatoriosPorEmail: false }
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const fetchProfile = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true); setError(null);
        try {
            const token = await currentUser.getIdToken();
            const response = await axios.get('/api/perfil', { headers: { Authorization: `Bearer ${token}` } });
            setForm({
                nombre: response.data.nombre || '',
                email: response.data.email || '',
                telefono: response.data.telefono || '',
                edad: response.data.edad || '',
                preferencias: response.data.preferencias || { recordatoriosPorEmail: false }
            });
        } catch (err) { setError('Error al cargar perfil.'); }
        setLoading(false);
    }, [currentUser]);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError(null); setSuccess(null);
        try {
            const token = await currentUser.getIdToken();
            const response = await axios.put('/api/perfil', form, { headers: { Authorization: `Bearer ${token}` } });
            setSuccess(response.data.message);
        } catch (err) { setError(err.response?.data?.message || 'Error al actualizar.'); }
        setLoading(false);
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setForm(prev => ({ ...prev, preferencias: { ...prev.preferencias, [name]: checked } }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    return (
        <div className="panel-container" style={{ maxWidth: '800px', margin: '40px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f0f4f8', paddingBottom: '15px', marginBottom: '20px' }}>
                <h3 className="panel-title" style={{ border: 'none', margin: 0 }}>Mi Perfil</h3>
                <Link to="/" className="btn btn-sm btn-outline" style={{ textDecoration: 'none' }}>← Volver</Link>
            </div>

            {loading ? <p>Cargando perfil...</p> : (
                <form onSubmit={handleSubmit}>
                    <h4 className="panel-subtitle">Datos Personales</h4>
                    <div className="form-grid">
                        <div>
                            <label className="form-label">Nombre Completo:</label>
                            <input className="form-input" type="text" name="nombre" value={form.nombre} onChange={handleFormChange} required />
                        </div>
                        <div>
                            <label className="form-label">Email:</label>
                            <input className="form-input" type="email" name="email" value={form.email} readOnly disabled style={{ backgroundColor: '#eee', cursor: 'not-allowed' }} />
                        </div>
                        <div>
                            <label className="form-label">Teléfono:</label>
                            <input className="form-input" type="tel" name="telefono" value={form.telefono} onChange={handleFormChange} placeholder="+51..." />
                        </div>
                        <div>
                            <label className="form-label">Edad:</label>
                            <input className="form-input" type="number" name="edad" value={form.edad} onChange={handleFormChange} />
                        </div>
                    </div>

                    <hr style={{ borderTop: '1px solid #eee', margin: '20px 0' }} />

                    <h4 className="panel-subtitle">Preferencias</h4>
                    <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input type="checkbox" name="recordatoriosPorEmail" checked={form.preferencias.recordatoriosPorEmail} onChange={handleFormChange} style={{ width: '20px', height: '20px', marginRight: '10px' }} />
                            <span style={{ fontSize: '0.95rem' }}>Quiero recibir recordatorios de mis citas por correo electrónico.</span>
                        </label>
                    </div>

                    {error && <p className="message-box message-error">{error}</p>}
                    {success && <p className="message-box message-success">{success}</p>}

                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Guardando...' : 'Actualizar Perfil'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

export default MiPerfil;
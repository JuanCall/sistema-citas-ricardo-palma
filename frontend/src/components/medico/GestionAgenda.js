import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import '../../Dashboard.css'; // <-- IMPORTA EL CSS

function GestionAgenda() {
    const [fecha, setFecha] = useState('');
    const [horaInicio, setHoraInicio] = useState('');
    const [horaFin, setHoraFin] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const { currentUser } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError(null); setSuccess(null);

        if (!currentUser) {
            setError('No estás autenticado.');
            setLoading(false);
            return;
        }

        try {
            const token = await currentUser.getIdToken();
            const response = await axios.post('/api/agenda/disponibilidad',
                { fecha, horaInicio, horaFin },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setLoading(false);
            setSuccess(response.data.message || 'Horario publicado exitosamente.');
            setFecha(''); setHoraInicio(''); setHoraFin('');
        } catch (err) {
            setLoading(false);
            setError(err.response?.data?.message || 'Error al crear el bloque de agenda.');
        }
    };

    return (
        <div className="panel-container">
            <h3 className="panel-title">Gestionar mi Agenda</h3>
            <p className="panel-subtitle">Publica nuevos bloques de horas disponibles para que tus pacientes puedan reservar.</p>

            {error && <p className="message-box message-error">{error}</p>}
            {success && <p className="message-box message-success">{success}</p>}

            <form onSubmit={handleSubmit} style={{ marginTop: '20px', backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
                <div className="form-grid">
                    <div>
                        <label className="form-label">Fecha:</label>
                        <input
                            type="date"
                            className="form-input"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="form-label">Hora Inicio:</label>
                        <input
                            type="time"
                            className="form-input"
                            value={horaInicio}
                            onChange={(e) => setHoraInicio(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="form-label">Hora Fin:</label>
                        <input
                            type="time"
                            className="form-input"
                            value={horaFin}
                            onChange={(e) => setHoraFin(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Publicando...' : 'Publicar Horario'}
                    </button>
                </div>
            </form>

            {/* (Opcional) Aquí podrías añadir una lista de tus horarios actuales usando el mismo estilo de tabla que en otros componentes */}
        </div>
    );
}

export default GestionAgenda;
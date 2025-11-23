// En: frontend/src/components/administrador/GestionHorarios.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import '../../Dashboard.css'; // <-- IMPORTA EL CSS

// --- Importaciones del Calendario (siguen igual) ---
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import es from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), getDay, locales });

function GestionHorarios() {
    const [medicos, setMedicos] = useState([]);
    const [selectedMedicoId, setSelectedMedicoId] = useState('');
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [newSlot, setNewSlot] = useState({ fecha: '', horaInicio: '09:00', horaFin: '10:00' });

    const { currentUser } = useAuth();

    // --- Cargar Médicos ---
    useEffect(() => {
        const fetchMedicos = async () => {
            if (!currentUser) return;
            try {
                const token = await currentUser.getIdToken();
                const response = await axios.get('/api/medicos', { headers: { Authorization: `Bearer ${token}` } });
                setMedicos(response.data.filter(m => m.estado === 'activo'));
                if (response.data.length > 0) setSelectedMedicoId(response.data[0].id);
            } catch (err) { setError('Error al cargar médicos.'); }
        };
        fetchMedicos();
    }, [currentUser]);

    // --- Cargar Agenda ---
    const fetchAgenda = useCallback(async () => {
        if (!selectedMedicoId || !currentUser) return;
        setLoading(true); setError(null); setSuccess(null);
        try {
            const token = await currentUser.getIdToken();
            const response = await axios.get(`/api/agenda/medico/${selectedMedicoId}`, { headers: { Authorization: `Bearer ${token}` } });

            const eventosFormateados = response.data.map(slot => {
                const [year, month, day] = slot.fecha.split('-').map(Number);
                const [startHour, startMin] = slot.horaInicio.split(':').map(Number);
                const [endHour, endMin] = slot.horaFin.split(':').map(Number);
                return {
                    id: slot.id,
                    title: `${slot.horaInicio} - ${slot.horaFin} (${slot.estado})`,
                    start: new Date(year, month - 1, day, startHour, startMin),
                    end: new Date(year, month - 1, day, endHour, endMin),
                    resource: slot.estado,
                };
            });
            setEventos(eventosFormateados);
        } catch (err) { setError('Error al cargar agenda.'); }
        setLoading(false);
    }, [currentUser, selectedMedicoId]);

    useEffect(() => { fetchAgenda(); }, [fetchAgenda]);

    // --- Agregar Horario ---
    const handleAddSlot = async (e) => {
        e.preventDefault();
        if (!selectedMedicoId) { setError('Selecciona un médico.'); return; }
        setError(null); setSuccess(null);
        try {
            const token = await currentUser.getIdToken();
            const data = { ...newSlot, medicoId: selectedMedicoId };
            await axios.post('/api/agenda/disponibilidad', data, { headers: { Authorization: `Bearer ${token}` } });
            setSuccess('Horario agregado.');
            fetchAgenda();
        } catch (err) { setError(err.response?.data?.message || 'Error al agregar.'); }
    };

    // --- Eliminar Horario ---
    const handleSelectEvent = async (event) => {
        if (event.resource === 'reservado') { alert('No puedes borrar un horario reservado.'); return; }
        if (window.confirm(`¿Eliminar horario ${event.title}?`)) {
            setError(null); setSuccess(null);
            try {
                const token = await currentUser.getIdToken();
                await axios.delete(`/api/agenda/${event.id}`, { headers: { Authorization: `Bearer ${token}` } });
                setSuccess('Horario eliminado.');
                fetchAgenda();
            } catch (err) { setError('Error al eliminar.'); }
        }
    };

    const handleFormChange = (e) => { setNewSlot(prev => ({ ...prev, [e.target.name]: e.target.value })); };

    const eventStyleGetter = (event) => {
        return { style: { backgroundColor: event.resource === 'disponible' ? '#3174ad' : '#d9534f', borderRadius: '5px', opacity: 0.8, color: 'white', border: '0px' } };
    };

    return (
        <div className="panel-container">
            <h3 className="panel-title">Gestión de Horarios</h3>

            {error && <p className="message-box message-error">{error}</p>}
            {success && <p className="message-box message-success">{success}</p>}

            {/* Selector de Médico */}
            <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Selecciona un Médico:</label>
                <select className="form-select" value={selectedMedicoId} onChange={(e) => setSelectedMedicoId(e.target.value)}>
                    {medicos.map(med => (<option key={med.id} value={med.id}>{med.nombre} - ({med.especialidad.nombre})</option>))}
                </select>
            </div>

            {/* Formulario */}
            <form onSubmit={handleAddSlot} style={{ marginBottom: '20px', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                <h4 className="panel-subtitle" style={{ marginBottom: '15px' }}>Añadir Nuevo Bloque</h4>
                <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                    <input className="form-input" type="date" name="fecha" value={newSlot.fecha} onChange={handleFormChange} required />
                    <input className="form-input" type="time" name="horaInicio" value={newSlot.horaInicio} onChange={handleFormChange} required />
                    <input className="form-input" type="time" name="horaFin" value={newSlot.horaFin} onChange={handleFormChange} required />
                    <button type="submit" className="btn btn-success">Agregar +</button>
                </div>
            </form>

            <hr style={{ borderTop: '1px solid #eee', margin: '20px 0' }} />

            {/* Calendario */}
            {loading ? <p>Cargando agenda...</p> : (
                <div style={{ height: '600px', backgroundColor: 'white' }}>
                    <Calendar
                        localizer={localizer}
                        events={eventos}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        messages={{ next: "Sig", previous: "Ant", today: "Hoy", month: "Mes", week: "Semana", day: "Día" }}
                        onSelectEvent={handleSelectEvent}
                        eventPropGetter={eventStyleGetter}
                    />
                </div>
            )}
        </div>
    );
}

export default GestionHorarios;
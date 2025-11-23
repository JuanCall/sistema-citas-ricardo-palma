// En: frontend/src/components/medico/CitasMedico.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import HistorialPacienteModal from './HistorialPacienteModal';
import '../../Dashboard.css'; // <-- IMPORTA EL CSS

// --- Componente FilaReceta (Estilizado) ---
const FilaReceta = ({ item, enCambio, enBorrar }) => {
    return (
        <div className="form-grid" style={{ gridTemplateColumns: '3fr 2fr 2fr 2fr auto', gap: '10px', marginBottom: '10px' }}>
            <input className="form-input" type="text" placeholder="Medicamento" value={item.medicamento} onChange={(e) => enCambio('medicamento', e.target.value)} />
            <input className="form-input" type="text" placeholder="Dosis" value={item.dosis} onChange={(e) => enCambio('dosis', e.target.value)} />
            <input className="form-input" type="text" placeholder="Frecuencia" value={item.frecuencia} onChange={(e) => enCambio('frecuencia', e.target.value)} />
            <input className="form-input" type="text" placeholder="Duración" value={item.duracion} onChange={(e) => enCambio('duracion', e.target.value)} />
            <button type="button" onClick={enBorrar} className="btn btn-sm btn-danger" style={{ height: '42px', width: '42px', padding: 0 }}>X</button>
        </div>
    );
};

function CitasMedico() {
    // ... (estados: citas, loading, error, success, formState, etc. - COPIA TUS ESTADOS AQUÍ) ...
    const [citas, setCitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [formState, setFormState] = useState({});
    const [completingId, setCompletingId] = useState(null);
    const [markingId, setMarkingId] = useState(null);

    const [filtro, setFiltro] = useState('hoy');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingHistorial, setLoadingHistorial] = useState(false);
    const [selectedHistorial, setSelectedHistorial] = useState([]);

    const { currentUser } = useAuth();

    // ... (Toda tu lógica: fetchCitasMedico, handlers, useEffect - COPIA TU LÓGICA AQUÍ) ...
    // (Para ahorrar espacio, asumo que mantienes tu lógica intacta)
    const fetchCitasMedico = useCallback(async () => {
        if (!currentUser) return;
        setLoading(true); setError(null);
        try {
            const token = await currentUser.getIdToken();
            const params = new URLSearchParams();
            if (filtro === 'hoy') params.append('filtro', 'hoy');
            const response = await axios.get(`/api/citas/medico?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
            setCitas(response.data);
            let initialState = {};
            for (const cita of response.data) {
                const recetaConId = (cita.receta || []).map(item => ({ ...item, id: item.id || `med_${Math.random()}` }));
                initialState[cita.id] = { diagnostico: '', notas: '', receta: recetaConId };
            }
            setFormState(initialState);
        } catch (err) { setError(err.response?.data?.message || 'Error al cargar citas.'); }
        setLoading(false);
    }, [currentUser, filtro]);

    useEffect(() => { fetchCitasMedico(); }, [fetchCitasMedico]);

    const handleFormChange = (citaId, campo, valor) => {
        setFormState(prev => ({ ...prev, [citaId]: { ...prev[citaId], [campo]: valor } }));
    };
    const handleRecetaChange = (citaId, itemId, campo, valor) => {
        setFormState(prev => {
            const nuevaReceta = prev[citaId].receta.map(item => item.id === itemId ? { ...item, [campo]: valor } : item);
            return { ...prev, [citaId]: { ...prev[citaId], receta: nuevaReceta } };
        });
    };
    const handleAddMedicamento = (citaId) => {
        setFormState(prev => ({ ...prev, [citaId]: { ...prev[citaId], receta: [...prev[citaId].receta, { id: `med_${Math.random()}`, medicamento: '', dosis: '', frecuencia: '', duracion: '' }] } }));
    };
    const handleDeleteMedicamento = (citaId, itemId) => {
        setFormState(prev => {
            const nuevaReceta = prev[citaId].receta.filter((item) => item.id !== itemId);
            return { ...prev, [citaId]: { ...prev[citaId], receta: nuevaReceta } };
        });
    };

    const handleCompletarCita = async (citaId) => {
        setSuccess(null); setError(null); setCompletingId(citaId);
        const formData = formState[citaId];
        if (!formData.diagnostico) { setError('Ingresa un diagnóstico.'); setCompletingId(null); return; }
        try {
            const token = await currentUser.getIdToken();
            const recetaLimpia = formData.receta.map(({ id, ...resto }) => resto);
            await axios.put(`/api/citas/${citaId}/completar`, { ...formData, receta: recetaLimpia }, { headers: { Authorization: `Bearer ${token}` } });
            setSuccess('Cita completada.'); setCompletingId(null); fetchCitasMedico();
        } catch (err) { setError('Error al completar.'); setCompletingId(null); }
    };

    const handleMarcarAusencia = async (citaId) => {
        if (!window.confirm('¿Marcar ausencia?')) return;
        setSuccess(null); setError(null); setMarkingId(citaId);
        try {
            const token = await currentUser.getIdToken();
            await axios.put(`/api/citas/${citaId}/marcar-ausencia`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setSuccess('Ausencia marcada.'); setMarkingId(null); fetchCitasMedico();
        } catch (err) { setError('Error al marcar.'); setMarkingId(null); }
    };

    const handleViewHistorial = async (pacienteId) => {
        if (!pacienteId) return;
        setLoadingHistorial(true); setError(null); setIsModalOpen(true);
        try {
            const token = await currentUser.getIdToken();
            const response = await axios.get(`/api/historial/paciente/${pacienteId}`, { headers: { Authorization: `Bearer ${token}` } });
            setSelectedHistorial(response.data);
        } catch (err) { setError('Error al cargar historial.'); }
        setLoadingHistorial(false);
    };


    return (
        <>
            <HistorialPacienteModal
                show={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                historial={loadingHistorial ? [] : selectedHistorial}
            />

            <div className="panel-container">

                {/* Botones de Filtro */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f0f4f8', paddingBottom: '15px', marginBottom: '20px' }}>
                    <h3 className="panel-title" style={{ border: 'none', margin: 0 }}>Mis Citas Reservadas</h3>
                    <div>
                        <button onClick={() => setFiltro('hoy')} disabled={filtro === 'hoy'} className={`btn btn-sm ${filtro === 'hoy' ? 'btn-primary' : 'btn-outline'}`}>Ver Hoy</button>
                        <button onClick={() => setFiltro('todas')} disabled={filtro === 'todas'} className={`btn btn-sm ${filtro === 'todas' ? 'btn-primary' : 'btn-outline'}`}>Ver Todas</button>
                    </div>
                </div>

                {error && <p className="message-box message-error">{error}</p>}
                {success && <p className="message-box message-success">{success}</p>}

                {loading ? <p>Cargando citas...</p> : (
                    <div>
                        {citas.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No tienes citas {filtro === 'hoy' ? 'para hoy' : 'reservadas'}.</p>
                        ) : (
                            citas.map((cita) => (
                                <div key={cita.id} className="panel-container" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>

                                    {/* Encabezado de la Tarjeta */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                        <div>
                                            <h4 style={{ margin: '0 0 5px 0', color: 'var(--primary-blue)' }}>{cita.pacienteNombre}</h4>
                                            <div style={{ fontSize: '0.9rem', color: '#555' }}>
                                                <strong>Fecha:</strong> {cita.fecha} <span style={{ margin: '0 10px' }}>|</span> <strong>Hora:</strong> {cita.horaInicio}
                                            </div>
                                            <div style={{ fontSize: '0.9rem', marginTop: '5px', color: 'var(--primary-green)', fontStyle: 'italic' }}>
                                                <strong>Motivo:</strong> {cita.motivoConsulta || "No especificado"}
                                            </div>
                                        </div>
                                        <button onClick={() => handleViewHistorial(cita.pacienteId)} disabled={loadingHistorial} className="btn btn-sm btn-outline">
                                            {loadingHistorial ? 'Cargando...' : 'Ver Historial'}
                                        </button>
                                    </div>

                                    <hr style={{ borderTop: '1px solid #eee', margin: '15px 0' }} />

                                    {/* Formulario */}
                                    <div style={{ marginBottom: '15px' }}>
                                        <label className="form-label">Diagnóstico:</label>
                                        <input className="form-input" type="text" value={formState[cita.id]?.diagnostico || ''} onChange={(e) => handleFormChange(cita.id, 'diagnostico', e.target.value)} placeholder="Ej. Faringitis aguda" />
                                    </div>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label className="form-label">Notas / Observaciones:</label>
                                        <textarea className="form-input" value={formState[cita.id]?.notas || ''} onChange={(e) => handleFormChange(cita.id, 'notas', e.target.value)} style={{ minHeight: '80px' }} placeholder="Ej. Paciente refiere dolor..." />
                                    </div>

                                    <div style={{ marginBottom: '15px', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                                        <label className="form-label">Receta Médica:</label>
                                        {formState[cita.id]?.receta.map((item) => (
                                            <FilaReceta key={item.id} item={item} enCambio={(campo, valor) => handleRecetaChange(cita.id, item.id, campo, valor)} enBorrar={() => handleDeleteMedicamento(cita.id, item.id)} />
                                        ))}
                                        <button type="button" onClick={() => handleAddMedicamento(cita.id)} className="btn btn-sm btn-outline" style={{ marginTop: '5px' }}>+ Añadir Medicamento</button>
                                    </div>

                                    {/* Botones de Acción */}
                                    <div className="form-actions">
                                        <button onClick={() => handleCompletarCita(cita.id)} disabled={completingId === cita.id || markingId === cita.id} className="btn btn-primary">
                                            {completingId === cita.id ? 'Guardando...' : 'Completar y Generar PDF'}
                                        </button>
                                        <button onClick={() => handleMarcarAusencia(cita.id)} disabled={completingId === cita.id || markingId === cita.id} className="btn btn-danger">
                                            {markingId === cita.id ? 'Marcando...' : 'Marcar Ausencia'}
                                        </button>
                                    </div>

                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

export default CitasMedico;
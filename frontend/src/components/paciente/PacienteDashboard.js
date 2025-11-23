// En: frontend/src/components/paciente/PacienteDashboard.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import '../../Dashboard.css'; // <-- IMPORTA EL CSS

// Importamos los componentes "hijos"
import MisCitas from './MisCitas';
import MiHistorial from './MiHistorial';
import AsistenteVirtual from '../common/AsistenteVirtual';

function PacienteDashboard() {
    const { currentUser } = useAuth();

    // --- Estados Globales del Dashboard (para las listas de abajo) ---
    const [misCitas, setMisCitas] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [loadingLists, setLoadingLists] = useState(true); // Loading para las listas
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // --- ¡NUEVOS ESTADOS PARA EL FLUJO DE RESERVA! ---
    const [paso, setPaso] = useState(1); // 1: Especialidad, 2: Medico, 3: Horario, 4: Confirmar
    const [especialidades, setEspecialidades] = useState([]);
    const [medicos, setMedicos] = useState([]);
    const [disponibilidad, setDisponibilidad] = useState([]);

    // Datos seleccionados por el paciente
    const [selectedEspecialidad, setSelectedEspecialidad] = useState(null);
    const [selectedMedico, setSelectedMedico] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null); // El bloque de horario
    const [motivoConsulta, setMotivoConsulta] = useState(''); // ¡Nuevo requisito!

    const [reprogrammingCiteId, setReprogrammingCiteId] = useState(null);

    const [loadingFlow, setLoadingFlow] = useState(false); // Loading para el "Wizard"

    // --- Carga de datos para las listas de ABAJO (Mis Citas, Mi Historial) ---
    const fetchMisCitas = useCallback(async (token) => {
        try {
            const response = await axios.get('/api/citas/mis-citas', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMisCitas(response.data);
        } catch (err) {
            setError('Error al cargar mis citas.');
        }
    }, []);

    const fetchHistorial = useCallback(async (token) => {
        try {
            const response = await axios.get('/api/citas/mi-historial', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setHistorial(response.data);
        } catch (err) {
            setError('Error al cargar el historial.');
        }
    }, []);

    // Función para cargar TODAS las listas (MisCitas, MiHistorial)
    const loadBottomLists = useCallback(async (token) => {
        setLoadingLists(true);
        await Promise.all([
            fetchMisCitas(token),
            fetchHistorial(token)
        ]);
        setLoadingLists(false);
    }, [fetchMisCitas, fetchHistorial]);

    // --- ¡NUEVAS FUNCIONES PARA EL FLUJO DE RESERVA! ---

    // PASO 1: Cargar Especialidades (se ejecuta al inicio)
    useEffect(() => {
        const fetchEspecialidades = async () => {
            if (!currentUser) return;
            setLoadingFlow(true);
            try {
                const token = await currentUser.getIdToken();
                const response = await axios.get('/api/especialidades', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setEspecialidades(response.data);
            } catch (err) {
                setError('Error al cargar especialidades.');
            }
            setLoadingFlow(false);

            // Carga los datos de las listas de abajo también
            currentUser.getIdToken().then(token => loadBottomLists(token));
        };
        fetchEspecialidades();
    }, [currentUser, loadBottomLists]);

    // PASO 2: Cargar Médicos (cuando se elige especialidad)
    const handleSelectEspecialidad = async (especialidad) => {
        setSelectedEspecialidad(especialidad);
        setSelectedMedico(null);
        setSelectedSlot(null);
        setDisponibilidad([]);
        setLoadingFlow(true);
        setError(null);
        try {
            const token = await currentUser.getIdToken();
            // ¡Llama a la API de Médicos con el filtro de especialidad!
            const response = await axios.get(`/api/medicos?especialidadId=${especialidad.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMedicos(response.data.filter(m => m.estado === 'activo')); // Solo médicos activos
            setPaso(2); // Avanza al paso 2
        } catch (err) {
            setError('Error al cargar médicos.');
        }
        setLoadingFlow(false);
    };

    // PASO 3: Cargar Agenda (cuando se elige médico)
    const handleSelectMedico = async (medico) => {
        setSelectedMedico(medico);
        setSelectedSlot(null);
        setLoadingFlow(true);
        setError(null);
        try {
            const token = await currentUser.getIdToken();
            // ¡Llama a la NUEVA API de agenda filtrada por médico!
            const response = await axios.get(`/api/agenda/disponibilidad?medicoId=${medico.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setDisponibilidad(response.data);
            setPaso(3); // Avanza al paso 3
        } catch (err) {
            setError('Error al cargar agenda.');
        }
        setLoadingFlow(false);
    };

    // PASO 4: Confirmar Slot
    const handleSelectSlot = (slot) => {
        setSelectedSlot(slot);
        setPaso(4); // Avanza al paso 4
        setError(null);
    };

    // ¡FUNCIÓN DE PAGO ACTUALIZADA!
    const handleConfirmSlot = async () => {
        setLoadingFlow(true);
        setError(null);
        setSuccess(null);

        try {
            const token = await currentUser.getIdToken();

            if (reprogrammingCiteId) {
                // --- 1. LÓGICA DE REPROGRAMACIÓN (RQF-07) ---
                const response = await axios.put(
                    `/api/citas/${reprogrammingCiteId}/reprogramar`,
                    { newDisponibilidadId: selectedSlot.id },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setSuccess(response.data.message);

            } else {
                // --- 2. LÓGICA DE PAGO NORMAL (RQF-05) ---
                if (!motivoConsulta) {
                    throw new Error("Por favor, escribe un motivo de consulta.");
                }
                const response = await axios.post(
                    '/api/pagos/crear-preferencia',
                    { disponibilidadId: selectedSlot.id, motivoConsulta: motivoConsulta },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                window.location.href = response.data.init_point; // Redirige a Mercado Pago
            }

            // Si fue reprogramación, resetea el flujo y recarga las listas
            if (reprogrammingCiteId) {
                resetFlow();
                await loadBottomLists(token);
                setLoadingFlow(false);
            }

        } catch (err) {
            setError(err.response?.data?.message || 'Error al procesar la solicitud.');
            setLoadingFlow(false);
        }
    };

    // --- "Teletransporta" al Paso 3 para Reprogramar ---
    const handleStartReprogramar = async (cita) => {
        if (!cita || !cita.medicoId || !cita.medicoNombre) {
            setError("Error: No se pueden cargar los datos de esta cita.");
            return;
        }

        setSuccess('Modo Reprogramación: Selecciona un nuevo horario...');
        setError(null);
        setReprogrammingCiteId(cita.id);

        const medico = { id: cita.medicoId, nombre: cita.medicoNombre };
        setSelectedMedico(medico);

        setLoadingFlow(true);
        try {
            const token = await currentUser.getIdToken();
            const response = await axios.get(`/api/agenda/disponibilidad?medicoId=${medico.id}`, { headers: { Authorization: `Bearer ${token}` } });
            setDisponibilidad(response.data);
            setPaso(3); // ¡El salto!
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setError('Error al cargar agenda para reprogramar.');
        }
        setLoadingFlow(false);
    };

    // --- Función de Cancelar Cita ---
    const handleCancel = async (citaId) => {
        if (!window.confirm('¿Seguro que deseas cancelar esta cita?')) return;
        setError(null);
        setSuccess(null);
        try {
            const token = await currentUser.getIdToken();
            const response = await axios.put(`/api/citas/${citaId}/cancelar`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess(response.data.message);
            await loadBottomLists(token); // Recarga las listas de abajo
        } catch (err) {
            setError(err.response?.data?.message || 'Error al cancelar la cita.');
        }
    };

    // Función para resetear el flujo
    const resetFlow = () => {
        setPaso(1);
        setSelectedEspecialidad(null);
        setSelectedMedico(null);
        setSelectedSlot(null);
        setMotivoConsulta('');
        setReprogrammingCiteId(null);
        setError(null);
    };

    // --- El HTML (JSX) ---
    return (
        <div>
            <AsistenteVirtual />

            {/* Título bonito */}
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ color: 'var(--primary-blue)', margin: 0 }}>Bienvenido al Portal del Paciente</h2>
                <p style={{ color: '#666' }}>Gestiona tus citas y salud desde aquí.</p>
            </div>

            {error && <p className="message-box message-error">{error}</p>}
            {success && <p className="message-box message-success">{success}</p>}

            {/* --- WIZARD ESTILIZADO --- */}
            <div className="panel-container" style={{ borderTop: '5px solid var(--primary-green)' }}>
                <h3 className="panel-title">
                    {reprogrammingCiteId ? '📅 Reprogramar Cita Existente' : '➕ Registrar Nueva Cita'}
                </h3>

                {loadingFlow && <p style={{ textAlign: 'center', padding: '20px' }}>Procesando solicitud...</p>}

                {/* PASO 1: ESPECIALIDAD */}
                {paso === 1 && (
                    <div className="fade-in">
                        <h4 className="panel-subtitle">Paso 1: Selecciona una Especialidad</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                            {especialidades.map(esp => (
                                <button
                                    key={esp.id}
                                    onClick={() => handleSelectEspecialidad(esp)}
                                    className="btn btn-outline"
                                    style={{ height: '80px', fontSize: '1.1rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
                                >
                                    {esp.nombre}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* PASO 2: MÉDICO */}
                {paso === 2 && (
                    <div className="fade-in">
                        <button onClick={resetFlow} className="btn btn-sm btn-outline" style={{ marginBottom: '15px' }}>← Volver</button>
                        <h4 className="panel-subtitle">Paso 2: Selecciona un Médico ({selectedEspecialidad?.nombre})</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                            {medicos.length === 0 ? <p>No hay médicos activos.</p> : (
                                medicos.map(med => (
                                    <button key={med.id} onClick={() => handleSelectMedico(med)} className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                                        👨‍⚕️ {med.nombre}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* PASO 3: HORARIO */}
                {paso === 3 && (
                    <div className="fade-in">
                        <button onClick={() => { reprogrammingCiteId ? resetFlow() : setPaso(2); setSelectedMedico(null); }} className="btn btn-sm btn-outline" style={{ marginBottom: '15px' }}>← Volver</button>
                        <h4 className="panel-subtitle">Paso 3: Selecciona un Horario ({selectedMedico?.nombre})</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                            {disponibilidad.length === 0 ? <p>No hay horarios disponibles.</p> : (
                                disponibilidad.map(slot => (
                                    <button key={slot.id} onClick={() => handleSelectSlot(slot)} className="btn btn-success">
                                        {slot.fecha} <br /> <strong>{slot.horaInicio}</strong>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* PASO 4: CONFIRMAR */}
                {paso === 4 && (
                    <div className="fade-in" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
                        <button onClick={() => { setPaso(3); setSelectedSlot(null); }} className="btn btn-sm btn-outline" style={{ float: 'left' }}>← Volver</button>
                        <br style={{ clear: 'both' }} />

                        <h4 className="panel-subtitle" style={{ marginTop: '20px' }}>Paso 4: Confirma tu Cita</h4>

                        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '10px', marginBottom: '20px', textAlign: 'left' }}>
                            <p><strong>Médico:</strong> {selectedMedico?.nombre}</p>
                            <p><strong>Especialidad:</strong> {selectedEspecialidad?.nombre || selectedMedico?.especialidadNombre}</p>
                            <p><strong>Fecha:</strong> {selectedSlot?.fecha}</p>
                            <p><strong>Hora:</strong> {selectedSlot?.horaInicio}</p>
                        </div>

                        {!reprogrammingCiteId && (
                            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                                <label className="form-label">Motivo de Consulta:</label>
                                <input type="text" className="form-input" value={motivoConsulta} onChange={(e) => setMotivoConsulta(e.target.value)} placeholder="Describe brevemente tu malestar..." />
                            </div>
                        )}

                        <button onClick={handleConfirmSlot} disabled={loadingFlow || (!reprogrammingCiteId && !motivoConsulta)} className="btn btn-primary" style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }}>
                            {loadingFlow ? 'Procesando...' : reprogrammingCiteId ? 'Confirmar Reprogramación (Gratis)' : 'Ir a Pagar (S/ 100.00)'}
                        </button>
                    </div>
                )}
            </div>

            {/* Listas inferiores (sin cambios de lógica) */}
            {loadingLists ? <p>Cargando datos...</p> : (
                <div>
                    <MisCitas misCitas={misCitas} onCancel={handleCancel} onReprogramar={handleStartReprogramar} />
                    <MiHistorial historial={historial} />
                </div>
            )}
        </div>
    );
}

export default PacienteDashboard;
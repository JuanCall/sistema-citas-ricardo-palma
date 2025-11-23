// En: frontend/src/components/administrador/BuscarCitas.js

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import '../../Dashboard.css'; // <-- IMPORTA EL CSS

function BuscarCitas() {
    // --- Estados de Filtros ---
    const [rangoFecha, setRangoFecha] = useState('hoy');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [searchPaciente, setSearchPaciente] = useState('');
    const [searchMedico, setSearchMedico] = useState('');

    // --- Estados de Datos ---
    const [allCitas, setAllCitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { currentUser } = useAuth();

    // --- Cargar Citas ---
    useEffect(() => {
        const fetchCitasPorRango = async () => {
            if (!currentUser) return;
            setLoading(true); setError(null);
            try {
                const token = await currentUser.getIdToken();
                const params = new URLSearchParams();
                if (rangoFecha !== 'todo') params.append('rangoFecha', rangoFecha);
                const response = await axios.get(`/api/admin/buscar-citas?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
                setAllCitas(response.data);
            } catch (err) { setError('Error al buscar citas.'); }
            setLoading(false);
        };
        fetchCitasPorRango();
    }, [currentUser, rangoFecha]);

    // --- Filtrado Local ---
    const citasFiltradas = useMemo(() => {
        return allCitas.filter(cita => {
            if (filtroEstado && cita.estadoCita !== filtroEstado) return false;
            if (searchPaciente && !cita.pacienteNombre.toLowerCase().includes(searchPaciente.toLowerCase())) return false;
            if (searchMedico && !cita.medicoNombre.toLowerCase().includes(searchMedico.toLowerCase())) return false;
            return true;
        });
    }, [allCitas, filtroEstado, searchPaciente, searchMedico]);

    // --- Estadísticas ---
    const estadisticas = useMemo(() => {
        const conteo = { reservada: 0, completada: 0, cancelada: 0, no_presento: 0 };
        citasFiltradas.forEach(cita => { if (conteo.hasOwnProperty(cita.estadoCita)) conteo[cita.estadoCita]++; });
        return conteo;
    }, [citasFiltradas]);

    return (
        <div className="panel-container">
            <h3 className="panel-title">Búsqueda Avanzada</h3>

            {error && <p className="message-box message-error">{error}</p>}

            {/* Filtros de Fecha */}
            <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Rango de Fecha:</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {['hoy', 'semana', 'mes', 'todo'].map(rango => (
                        <button
                            key={rango}
                            onClick={() => setRangoFecha(rango)}
                            disabled={rangoFecha === rango}
                            className={`btn btn-sm ${rangoFecha === rango ? 'btn-primary' : 'btn-outline'}`}
                        >
                            {rango === 'todo' ? 'Todas' : rango.charAt(0).toUpperCase() + rango.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filtros Locales */}
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '20px' }}>
                <input className="form-input" type="text" placeholder="Buscar Paciente..." value={searchPaciente} onChange={(e) => setSearchPaciente(e.target.value)} />
                <input className="form-input" type="text" placeholder="Buscar Médico..." value={searchMedico} onChange={(e) => setSearchMedico(e.target.value)} />
                <select className="form-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                    <option value="">Todos los Estados</option>
                    <option value="reservada">Reservada</option>
                    <option value="completada">Completada</option>
                    <option value="cancelada">Cancelada</option>
                    <option value="reprogramada">Reprogramada</option>
                    <option value="no_presento">No se presentó</option>
                </select>
            </div>

            <hr style={{ borderTop: '1px solid #eee', margin: '20px 0' }} />

            {loading ? <p>Cargando...</p> : (
                <>
                    {/* Estadísticas */}
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ color: 'var(--primary-blue)' }}>Resumen:</strong>
                        <span className="status-badge status-reservada">Reservadas: {estadisticas.reservada}</span>
                        <span className="status-badge status-completada">Completadas: {estadisticas.completada}</span>
                        <span className="status-badge status-cancelada">Canceladas: {estadisticas.cancelada}</span>
                        <span className="status-badge status-inactivo">Ausencias: {estadisticas.no_presento}</span>
                    </div>

                    {/* Tabla */}
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Fecha / Hora</th>
                                    <th>Paciente</th>
                                    <th>Médico</th>
                                    <th>Especialidad</th>
                                    <th>Estado</th>
                                    <th>Motivo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {citasFiltradas.length === 0 ? (
                                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>No se encontraron citas.</td></tr>
                                ) : (
                                    citasFiltradas.map((cita) => (
                                        <tr key={cita.id}>
                                            <td style={{ whiteSpace: 'nowrap' }}>{cita.fecha} <br /><small>{cita.horaInicio}</small></td>
                                            <td>{cita.pacienteNombre}</td>
                                            <td>{cita.medicoNombre}</td>
                                            <td>{cita.especialidadNombre || '-'}</td>
                                            <td><span className={`status-badge status-${cita.estadoCita}`}>{cita.estadoCita}</span></td>
                                            <td>{cita.motivoConsulta || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

export default BuscarCitas;
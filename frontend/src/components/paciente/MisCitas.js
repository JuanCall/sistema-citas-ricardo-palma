import React, { useState, useMemo } from 'react';
import '../../Dashboard.css'; // Importamos los estilos

function MisCitas({ misCitas, onCancel, onReprogramar }) {

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [cancelingId, setCancelingId] = useState(null);
    const [filtroFecha, setFiltroFecha] = useState('');

    const handleCancelClick = async (citaId) => {
        setSuccess(null);
        setError(null);
        setCancelingId(citaId);

        if (!window.confirm('¿Estás seguro de que deseas cancelar esta cita? (Esto no es reembolsable)')) {
            setCancelingId(null);
            return;
        }

        const exito = await onCancel(citaId);

        if (exito) {
            setSuccess('¡Cita cancelada exitosamente!');
        } else {
            setError('Error al cancelar. Revise el panel principal.');
        }

        setCancelingId(null);
    };

    // Filtro de citas por fecha usando useMemo
    const citasFiltradas = useMemo(() => {
        if (!filtroFecha) {
            return misCitas;
        }
        return misCitas.filter(cita => cita.fecha === filtroFecha);
    }, [misCitas, filtroFecha]);

    return (
        <div className="panel-container">
            <h3 className="panel-title">Mis Citas Reservadas</h3>

            {error && <p className="message-box message-error">{error}</p>}
            {success && <p className="message-box message-success">{success}</p>}

            {/* Filtro de Fecha */}
            <div style={{ margin: '15px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label htmlFor="filtroFecha" className="form-label" style={{ marginBottom: 0 }}>
                    Filtrar por día:
                </label>
                <input
                    type="date"
                    id="filtroFecha"
                    className="form-input"
                    style={{ width: 'auto' }}
                    value={filtroFecha}
                    onChange={(e) => setFiltroFecha(e.target.value)}
                />
                {filtroFecha && (
                    <button onClick={() => setFiltroFecha('')} className="btn btn-outline btn-sm">
                        Limpiar
                    </button>
                )}
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Hora</th>
                            <th>Médico</th>
                            <th>Motivo</th>
                            <th>Estado</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Renderizado condicional corregido */}
                        {citasFiltradas.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                                    {filtroFecha
                                        ? 'No se encontraron citas para el día seleccionado.'
                                        : 'No tienes citas reservadas.'
                                    }
                                </td>
                            </tr>
                        ) : (
                            citasFiltradas.map((cita) => (
                                <tr key={cita.id}>
                                    <td>{cita.fecha}</td>
                                    <td>{cita.horaInicio}</td>
                                    <td>{cita.medicoNombre}</td>
                                    <td>{cita.motivoConsulta || '-'}</td>
                                    <td>
                                        <span className={`status-badge status-${cita.estadoCita}`}>
                                            {cita.estadoCita}
                                        </span>
                                    </td>
                                    <td>
                                        {cita.estadoCita === 'reservada' ? (
                                            <>
                                                <button
                                                    onClick={() => handleCancelClick(cita.id)}
                                                    disabled={cancelingId === cita.id}
                                                    className="btn btn-sm btn-danger"
                                                >
                                                    {cancelingId === cita.id ? '...' : 'Cancelar'}
                                                </button>
                                                <button
                                                    onClick={() => onReprogramar(cita)}
                                                    disabled={cancelingId === cita.id}
                                                    className="btn btn-sm btn-primary"
                                                    style={{ marginLeft: '5px' }}
                                                >
                                                    Reprogramar
                                                </button>
                                            </>
                                        ) : (
                                            <span style={{ color: '#999' }}>-</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default MisCitas;
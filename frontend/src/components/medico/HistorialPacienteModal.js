import React from 'react';
import '../../Dashboard.css'; // <-- IMPORTA EL CSS PARA USAR LAS CLASES

function HistorialPacienteModal({ show, onClose, historial }) {
    if (!show) return null;

    // Estilos estructurales del Modal (necesarios para el posicionamiento)
    const overlayStyle = {
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 1000,
        display: 'flex', justifyContent: 'center', alignItems: 'center'
    };

    const modalStyle = {
        backgroundColor: '#fff', width: '90%', maxWidth: '800px',
        borderRadius: '12px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh'
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>

                {/* Cabecera */}
                <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="panel-title" style={{ margin: 0, border: 'none' }}>Historial Clínico del Paciente</h3>
                    <button onClick={onClose} className="btn btn-sm btn-outline" style={{ border: 'none', fontSize: '1.5rem', lineHeight: '1' }}>×</button>
                </div>

                {/* Cuerpo (con Scroll) */}
                <div style={{ padding: '20px', overflowY: 'auto' }}>
                    {historial.length === 0 ? (
                        <div className="message-box message-error" style={{ textAlign: 'center', color: '#666', backgroundColor: '#f8f9fa', border: '1px solid #eee' }}>
                            Este paciente no tiene historial de citas completadas.
                        </div>
                    ) : (
                        historial.map((cita) => (
                            <div key={cita.id} style={{ marginBottom: '20px', border: '1px solid #e1e4e8', borderRadius: '8px', padding: '20px' }}>

                                {/* Encabezado de la Cita */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem', color: '#666' }}>
                                    <span><strong>Fecha:</strong> {cita.fecha}</span>
                                    <span><strong>Hora:</strong> {cita.horaInicio}</span>
                                    <span className={`status-badge status-${cita.estadoCita}`}>{cita.estadoCita}</span>
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <p style={{ margin: '5px 0' }}><strong>Médico:</strong> {cita.medicoNombre}</p>
                                    <p style={{ margin: '5px 0', color: 'var(--primary-blue)', fontStyle: 'italic' }}>
                                        <strong>Motivo:</strong> {cita.motivoConsulta || 'N/A'}
                                    </p>
                                </div>

                                {/* Detalles Médicos */}
                                {cita.historial ? (
                                    <div style={{ backgroundColor: '#f0f4f8', padding: '15px', borderRadius: '8px' }}>
                                        <div style={{ marginBottom: '10px' }}>
                                            <strong style={{ color: 'var(--primary-green)' }}>Diagnóstico:</strong>
                                            <p style={{ margin: '5px 0' }}>{cita.historial.diagnostico}</p>
                                        </div>

                                        {cita.historial.notas && (
                                            <div style={{ marginBottom: '10px' }}>
                                                <strong>Notas:</strong>
                                                <p style={{ margin: '5px 0', whiteSpace: 'pre-wrap' }}>{cita.historial.notas}</p>
                                            </div>
                                        )}

                                        {cita.historial.recetaUrl && (
                                            <div style={{ marginTop: '15px' }}>
                                                <a
                                                    href={cita.historial.recetaUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btn-sm btn-primary"
                                                    style={{ textDecoration: 'none' }}
                                                >
                                                    📄 Ver Receta PDF
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="message-box message-error"><em>(Cita marcada como "No se presentó")</em></p>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Pie (Botón Cerrar) */}
                <div style={{ padding: '15px 20px', borderTop: '1px solid #eee', textAlign: 'right' }}>
                    <button onClick={onClose} className="btn btn-outline">Cerrar</button>
                </div>

            </div>
        </div>
    );
}

export default HistorialPacienteModal;
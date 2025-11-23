// En: frontend/src/components/paciente/MiHistorial.js

import React from 'react';
import '../../Dashboard.css'; // <-- IMPORTA EL CSS

function MiHistorial({ historial }) {

    return (
        <div className="panel-container">
            <h3 className="panel-title">Mi Historial de Citas</h3>
            <p className="panel-subtitle">Registro de tus citas completadas y recetas.</p>

            <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Hora</th>
                            <th>Médico</th>
                            <th>Diagnóstico</th>
                            <th>Estado</th>
                            <th>Receta</th>
                        </tr>
                    </thead>
                    <tbody>
                        {historial.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', color: '#666' }}>
                                    No tienes citas completadas en tu historial.
                                </td>
                            </tr>
                        ) : (
                            historial.map((cita) => (
                                <tr key={cita.id}>
                                    <td>{cita.fecha}</td>
                                    <td>{cita.horaInicio}</td>
                                    <td>{cita.medicoNombre}</td>
                                    <td>{cita.diagnostico || '-'}</td>
                                    <td>
                                        <span className={`status-badge status-${cita.estadoCita}`}>
                                            {cita.estadoCita}
                                        </span>
                                    </td>
                                    <td>
                                        {cita.recetaUrl ? (
                                            <a
                                                href={cita.recetaUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-sm btn-primary" // Estilo de botón
                                                style={{ textDecoration: 'none', fontSize: '0.8rem' }}
                                            >
                                                Descargar PDF
                                            </a>
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

export default MiHistorial;
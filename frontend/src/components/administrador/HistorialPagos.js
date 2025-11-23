// En: frontend/src/components/administrador/HistorialPagos.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import '../../Dashboard.css'; // <-- IMPORTA EL CSS

function HistorialPagos() {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchHistorialPagos = async () => {
      if (!currentUser) return;
      setLoading(true); setError(null);
      try {
        const token = await currentUser.getIdToken();
        const response = await axios.get('/api/admin/historial-pagos', { headers: { Authorization: `Bearer ${token}` } });
        setPagos(response.data);
      } catch (err) { setError(err.response?.data?.message || 'Error al cargar historial.'); }
      setLoading(false);
    };
    fetchHistorialPagos();
  }, [currentUser]);

  return (
    <div className="panel-container">
      <h3 className="panel-title">Historial de Pagos</h3>
      
      {error && <p className="message-box message-error">{error}</p>}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>N° Referencia</th>
                <th>Paciente</th>
                <th>Médico</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {pagos.length === 0 ? (
                <tr><td colSpan="6" style={{textAlign: 'center'}}>No se encontraron pagos.</td></tr>
              ) : (
                pagos.map((pago) => (
                  <tr key={pago.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{pago.numeroReferencia}</td>
                    <td>{pago.paciente}</td>
                    <td>{pago.especialidad}</td>
                    <td style={{ fontWeight: 'bold', color: 'var(--primary-green)' }}>
                       {pago.monto != null ? `S/ ${Number(pago.monto).toFixed(2)}` : 'N/A'}
                    </td>
                    <td>{pago.metodo || 'N/A'}</td>
                    <td>{pago.fecha || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default HistorialPagos;
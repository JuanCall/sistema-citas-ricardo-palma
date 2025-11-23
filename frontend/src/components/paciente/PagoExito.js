import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import '../../Dashboard.css'; // <-- IMPORTA EL CSS

function PagoExito() {
    const [searchParams] = useSearchParams();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const processedRef = useRef(false);

    useEffect(() => {
        if (processedRef.current === true) return;
        processedRef.current = true;

        const confirmarPago = async () => {
            if (!currentUser) {
                setLoading(false);
                setError('No estás autenticado. Inicia sesión.');
                return;
            }

            const payment_id = searchParams.get('payment_id');
            const status = searchParams.get('status');
            const preference_id = searchParams.get('preference_id');

            if (!payment_id || !status || !preference_id) {
                setLoading(false);
                setError('No se recibieron datos de pago.');
                return;
            }

            if (status !== 'approved') {
                setLoading(false);
                setError(`El pago fue ${status}. No se pudo completar.`);
                return;
            }

            try {
                const token = await currentUser.getIdToken();
                const response = await axios.post(
                    '/api/pagos/confirmar-pago',
                    { payment_id, status, preference_id },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setSuccessMessage(response.data.message);
                setLoading(false);
            } catch (err) {
                setLoading(false);
                setError(err.response?.data?.message || 'Error al confirmar la cita.');
            }
        };

        confirmarPago();
    }, [currentUser, searchParams]);

    return (
        <div className="panel-container" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center', padding: '40px' }}>

            {loading && (
                <div>
                    <h3 className="panel-title" style={{ border: 'none' }}>Procesando tu pago...</h3>
                    <div className="spinner" style={{ margin: '20px auto', width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid var(--primary-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    <p style={{ color: '#666' }}>Por favor, no cierres esta ventana.</p>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {error && (
                <div>
                    <h3 className="panel-title" style={{ border: 'none', color: 'var(--error-color)' }}>¡Hubo un problema!</h3>
                    <div className="message-box message-error" style={{ margin: '20px 0' }}>
                        {error}
                    </div>
                    <Link to="/" className="btn btn-outline">
                        Volver al inicio
                    </Link>
                </div>
            )}

            {successMessage && (
                <div>
                    <h3 className="panel-title" style={{ border: 'none', color: 'var(--success-color)' }}>¡Pago Aprobado!</h3>
                    <div className="message-box message-success" style={{ margin: '20px 0', fontSize: '1.1rem' }}>
                        {successMessage}
                    </div>
                    <div style={{ marginTop: '30px' }}>
                        <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                            Volver a Mis Citas
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PagoExito;
import React from 'react';
import { Link } from 'react-router-dom';
import '../../Dashboard.css'; // <-- IMPORTA EL CSS

function PagoFallo() {
    return (
        <div className="panel-container" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center', padding: '40px' }}>

            <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '4rem', color: 'var(--error-color)' }}>✕</span>
            </div>

            <h3 className="panel-title" style={{ border: 'none', color: 'var(--error-color)' }}>Pago Rechazado</h3>

            <div className="message-box message-error" style={{ margin: '20px 0', fontSize: '1.1rem' }}>
                <p style={{ margin: '0 0 10px 0' }}>Hubo un problema con tu pago y fue rechazado por la plataforma.</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>No se ha realizado ningún cobro.</p>
            </div>

            <p style={{ color: '#666', marginBottom: '30px' }}>
                Por favor, verifica los datos de tu tarjeta o intenta con otro medio de pago.
            </p>

            <div>
                <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                    Volver a Intentar
                </Link>
            </div>
        </div>
    );
}

export default PagoFallo;
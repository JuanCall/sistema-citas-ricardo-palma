import React, { useState, useEffect, useCallback } from 'react'; // <-- Importamos useCallback
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import '../../Dashboard.css';

function GestionEspecialidades() {
    const [especialidades, setEspecialidades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [editId, setEditId] = useState(null);
    const { currentUser } = useAuth();

    // Usamos useCallback para memorizar la función
    const fetchEspecialidades = useCallback(async () => {
        setLoading(true);
        try {
            const token = await currentUser.getIdToken();
            const response = await axios.get('/api/especialidades', { headers: { Authorization: `Bearer ${token}` } });
            setEspecialidades(response.data);
        } catch (err) { setError('Error al cargar especialidades.'); }
        setLoading(false);
    }, [currentUser]); // Dependencia: currentUser

    // Ahora podemos añadir fetchEspecialidades al array de dependencias sin crear un bucle infinito
    useEffect(() => { fetchEspecialidades(); }, [fetchEspecialidades]);

    const handleSubmit = async (e) => {
        e.preventDefault(); setError(null); setSuccess(null);
        try {
            const token = await currentUser.getIdToken();
            const data = { nombre, descripcion };
            if (editId) {
                const response = await axios.put(`/api/especialidades/${editId}`, data, { headers: { Authorization: `Bearer ${token}` } });
                setSuccess(response.data.message);
            } else {
                const response = await axios.post('/api/especialidades', data, { headers: { Authorization: `Bearer ${token}` } });
                setSuccess(response.data.message);
            }
            setEditId(null); setNombre(''); setDescripcion(''); fetchEspecialidades();
        } catch (err) { setError(err.response?.data?.message || 'Error al guardar.'); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar?')) return;
        setError(null); setSuccess(null);
        try {
            const token = await currentUser.getIdToken();
            const response = await axios.delete(`/api/especialidades/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setSuccess(response.data.message); fetchEspecialidades();
        } catch (err) { setError('Error al eliminar.'); }
    };

    const startEdit = (esp) => { setEditId(esp.id); setNombre(esp.nombre); setDescripcion(esp.descripcion); };
    const resetForm = () => { setEditId(null); setNombre(''); setDescripcion(''); };

    return (
        <div className="panel-container">
            <h3 className="panel-title">Gestión de Especialidades</h3>
            {error && <p className="message-box message-error">{error}</p>}
            {success && <p className="message-box message-success">{success}</p>}

            <form onSubmit={handleSubmit} style={{ marginBottom: '20px', background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                <div className="form-grid">
                    <input className="form-input" type="text" placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                    <input className="form-input" type="text" placeholder="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" className="btn btn-primary">{editId ? 'Actualizar' : 'Agregar'}</button>
                        {editId && <button type="button" onClick={resetForm} className="btn btn-outline">Cancelar</button>}
                    </div>
                </div>
            </form>

            {loading ? <p>Cargando...</p> : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead><tr><th>Nombre</th><th>Descripción</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {especialidades.map((esp) => (
                                <tr key={esp.id}>
                                    <td style={{ fontWeight: 'bold', color: 'var(--primary-blue)' }}>{esp.nombre}</td>
                                    <td>{esp.descripcion}</td>
                                    <td>
                                        <button onClick={() => startEdit(esp)} className="btn btn-sm btn-primary">Editar</button>
                                        <button onClick={() => handleDelete(esp.id)} className="btn btn-sm btn-danger">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
export default GestionEspecialidades;
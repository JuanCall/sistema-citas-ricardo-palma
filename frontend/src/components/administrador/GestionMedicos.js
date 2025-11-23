// En: frontend/src/components/administrador/GestionMedicos.js

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import '../../Dashboard.css'; // <-- 1. IMPORTA EL CSS

function GestionMedicos() {
    const [medicos, setMedicos] = useState([]);
    const [especialidades, setEspecialidades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [newMedico, setNewMedico] = useState({
        email: '', password: '', nombre: '', especialidadId: '', contacto: '', horario: ''
    });

    const [editId, setEditId] = useState(null);
    const [editForm, setEditForm] = useState({
        nombre: '', contacto: '', horario: '', especialidadId: '', estado: 'activo'
    });

    const [filtroNombre, setFiltroNombre] = useState('');
    const [filtroEspecialidad, setFiltroEspecialidad] = useState('');

    const { currentUser } = useAuth();

    const fetchEspecialidades = useCallback(async (token) => {
        try {
            const response = await axios.get('/api/especialidades', { headers: { Authorization: `Bearer ${token}` } });
            setEspecialidades(response.data);
            if (response.data.length > 0) {
                setNewMedico(f => ({ ...f, especialidadId: response.data[0].id }));
                setEditForm(f => ({ ...f, especialidadId: response.data[0].id }));
            }
        } catch (err) { setError('Error al cargar especialidades.'); }
    }, []);

    const fetchMedicos = useCallback(async (token) => {
        setLoading(true);
        const params = new URLSearchParams();
        if (filtroNombre) params.append('nombre', filtroNombre);
        if (filtroEspecialidad) params.append('especialidadId', filtroEspecialidad);

        try {
            const response = await axios.get(`/api/medicos?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
            setMedicos(response.data);
        } catch (err) { setError(err.response?.data?.message || 'Error al cargar médicos.'); }
        setLoading(false);
    }, [filtroNombre, filtroEspecialidad]);

    useEffect(() => {
        if (currentUser) {
            currentUser.getIdToken().then(token => {
                fetchEspecialidades(token);
                fetchMedicos(token);
            });
        }
    }, [currentUser, fetchEspecialidades, fetchMedicos]);

    const handleCreateMedico = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        try {
            const token = await currentUser.getIdToken();
            const espSeleccionada = especialidades.find(e => e.id === newMedico.especialidadId);
            const data = { ...newMedico, especialidadNombre: espSeleccionada.nombre };
            const response = await axios.post('/api/admin/crear-medico', data, { headers: { Authorization: `Bearer ${token}` } });
            setSuccess(response.data.message);
            resetNewMedicoForm();
            fetchMedicos(token);
        } catch (err) { setError(err.response?.data?.message || 'Error al crear médico.'); }
    };

    const handleUpdateMedico = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        try {
            const token = await currentUser.getIdToken();
            const espSeleccionada = especialidades.find(e => e.id === editForm.especialidadId);
            const data = { ...editForm, especialidadNombre: espSeleccionada.nombre };
            const response = await axios.put(`/api/medicos/${editId}`, data, { headers: { Authorization: `Bearer ${token}` } });
            setSuccess(response.data.message);
            resetEditForm();
            fetchMedicos(token);
        } catch (err) { setError(err.response?.data?.message || 'Error al actualizar médico.'); }
    };

    const handleInhabilitar = async (id) => {
        if (!window.confirm('¿Estás seguro?')) return;
        setError(null);
        setSuccess(null);
        try {
            const token = await currentUser.getIdToken();
            const response = await axios.put(`/api/medicos/${id}/inhabilitar`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setSuccess(response.data.message);
            fetchMedicos(token);
        } catch (err) { setError(err.response?.data?.message || 'Error al inhabilitar.'); }
    };

    const handleNewMedicoChange = (e) => {
        const { name, value } = e.target;
        setNewMedico(prev => ({ ...prev, [name]: value }));
    };
    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };

    const startEdit = (medico) => {
        setEditId(medico.id);
        setEditForm({
            nombre: medico.nombre, contacto: medico.contacto, horario: medico.horario,
            especialidadId: medico.especialidad.id, estado: medico.estado
        });
        document.getElementById('edit-form-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    const resetNewMedicoForm = () => {
        setNewMedico({
            email: '', password: '', nombre: '', contacto: '', horario: '',
            especialidadId: especialidades.length > 0 ? especialidades[0].id : '',
        });
    };
    const resetEditForm = () => { setEditId(null); };

    return (
        <div className="panel-container">
            <h3 className="panel-title">Gestión de Médicos</h3>

            {error && <p className="message-box message-error">{error}</p>}
            {success && <p className="message-box message-success">{success}</p>}

            {/* Formulario de CREAR */}
            <form onSubmit={handleCreateMedico} style={{ marginBottom: '30px' }}>
                <h4 className="panel-subtitle">Agregar Nuevo Médico (Crear Cuenta)</h4>
                <div className="form-grid">
                    <input className="form-input" name="nombre" type="text" placeholder="Nombre" value={newMedico.nombre} onChange={handleNewMedicoChange} required />
                    <input className="form-input" name="email" type="email" placeholder="Email (Login)" value={newMedico.email} onChange={handleNewMedicoChange} required />
                    <input className="form-input" name="password" type="password" placeholder="Contraseña" value={newMedico.password} onChange={handleNewMedicoChange} required />
                    <select className="form-select" name="especialidadId" value={newMedico.especialidadId} onChange={handleNewMedicoChange} required>
                        {especialidades.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                    <input className="form-input" name="contacto" type="text" placeholder="Contacto" value={newMedico.contacto} onChange={handleNewMedicoChange} />
                    <input className="form-input" name="horario" type="text" placeholder="Horario" value={newMedico.horario} onChange={handleNewMedicoChange} />
                </div>
                <div className="form-actions">
                    <button type="submit" className="btn btn-success">Crear Médico</button>
                </div>
            </form>

            {/* Formulario de EDITAR */}
            {editId && (
                <form id="edit-form-section" onSubmit={handleUpdateMedico} style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                    <h4 className="panel-subtitle">Editando: {editForm.nombre}</h4>
                    <div className="form-grid">
                        <input className="form-input" name="nombre" type="text" placeholder="Nombre" value={editForm.nombre} onChange={handleEditFormChange} required />
                        <select className="form-select" name="especialidadId" value={editForm.especialidadId} onChange={handleEditFormChange} required>
                            {especialidades.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                        </select>
                        <input className="form-input" name="contacto" type="text" placeholder="Contacto" value={editForm.contacto} onChange={handleEditFormChange} />
                        <input className="form-input" name="horario" type="text" placeholder="Horario" value={editForm.horario} onChange={handleEditFormChange} />
                        <select className="form-select" name="estado" value={editForm.estado} onChange={handleEditFormChange} required>
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
                        </select>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">Actualizar</button>
                        <button type="button" onClick={resetEditForm} className="btn btn-outline">Cancelar</button>
                    </div>
                </form>
            )}

            <hr style={{ borderTop: '1px solid #eee', margin: '20px 0' }} />

            {/* Filtros */}
            <h4 className="panel-subtitle">Médicos Registrados</h4>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                <input className="form-input" style={{ flex: 1 }} type="text" placeholder="Buscar por nombre..." value={filtroNombre} onChange={(e) => setFiltroNombre(e.target.value)} />
                <select className="form-select" style={{ flex: 1 }} value={filtroEspecialidad} onChange={(e) => setFiltroEspecialidad(e.target.value)}>
                    <option value="">Todas las especialidades</option>
                    {especialidades.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
            </div>

            {/* Tabla */}
            {loading ? <p>Cargando...</p> : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Especialidad</th>
                                <th>Contacto</th>
                                <th>Horario</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {medicos.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No se encontraron médicos.</td></tr>
                            ) : (
                                medicos.map((med) => (
                                    <tr key={med.id}>
                                        <td style={{ fontWeight: 'bold', color: 'var(--primary-blue)' }}>{med.nombre}</td>
                                        <td>{med.especialidad.nombre}</td>
                                        <td>{med.contacto}</td>
                                        <td>{med.horario}</td>
                                        <td>
                                            <span className={`status-badge status-${med.estado}`}>{med.estado}</span>
                                        </td>
                                        <td>
                                            <button onClick={() => startEdit(med)} className="btn btn-sm btn-primary">Editar</button>
                                            {med.estado === 'activo' && (
                                                <button onClick={() => handleInhabilitar(med.id)} className="btn btn-sm btn-danger">Inhabilitar</button>
                                            )}
                                        </td>
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

export default GestionMedicos;
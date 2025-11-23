// En: frontend/src/App.js

import React from 'react';
import './App.css'; // 1. Importamos los estilos
import { useAuth } from './context/AuthContext';
import { Routes, Route, Navigate, Link } from 'react-router-dom';

// Imports de componentes (siguen igual)
import Login from './components/Login';
import Registro from './components/Registro';
import PacienteDashboard from './components/paciente/PacienteDashboard';
import GestionMedicos from './components/administrador/GestionMedicos';
import Reportes from './components/administrador/Reportes';
import GestionAgenda from './components/medico/GestionAgenda';
import CitasMedico from './components/medico/CitasMedico';
import PagoExito from './components/paciente/PagoExito';
import PagoFallo from './components/paciente/PagoFallo';
import GestionEspecialidades from './components/administrador/GestionEspecialidades';
import GestionHorarios from './components/administrador/GestionHorarios';
import BuscarCitas from './components/administrador/BuscarCitas';
import HistorialPagos from './components/administrador/HistorialPagos';
import MiPerfil from './pages/MiPerfil';

const RutaProtegida = ({ children, rolRequerido }) => {
  const { currentUser, userRole } = useAuth();
  if (!currentUser) { return <Navigate to="/login" />; }
  if (rolRequerido && userRole !== rolRequerido) { return <Navigate to="/" />; }
  return children;
};

function App() {
  const { currentUser } = useAuth();

  return (
    <div className="app-container">
      {/* Header Global (Solo título/logo si no hay usuario, o DashboardHeader si hay) */}
      {!currentUser && (
        <header className="app-header">
          <div className="header-content" style={{ justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {/* ¡TU LOGO! */}
              <img src="https://imgur.com/jzb9wF2.png" alt="Clínica Ricardo Palma" className="app-logo-img" />
              <h1 className="app-title">Clínica Ricardo Palma</h1>
            </div>
          </div>
        </header>
      )}

      {/* Cuerpo Principal */}
      <main className="main-content">
        <Routes>
          <Route path="/login" element={currentUser ? <Navigate to="/" /> : <Login />} />
          <Route path="/registro" element={currentUser ? <Navigate to="/" /> : <Registro />} />

          <Route
            path="/"
            element={
              <RutaProtegida>
                <Dashboard />
              </RutaProtegida>
            }
          />

          <Route path="/perfil" element={<RutaProtegida><MiPerfil /></RutaProtegida>} />
          <Route path="/pago/exito" element={<RutaProtegida rolRequerido="paciente"><PagoExito /></RutaProtegida>} />
          <Route path="/pago/fallo" element={<RutaProtegida rolRequerido="paciente"><PagoFallo /></RutaProtegida>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

// --- Componente Dashboard Interno (Con Header Propio) ---
const Dashboard = () => {
  const { userRole, currentUser, logout } = useAuth();

  return (
    <div>
      {/* Header del Dashboard (Barra Superior) */}
      <header className="app-header" style={{ marginBottom: '30px', position: 'relative', top: '-30px', width: 'calc(100% + 60px)', left: '-30px' }}>
        <div className="header-content">
          {/* Logo a la izquierda */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src="https://imgur.com/jzb9wF2.png" alt="Logo" className="app-logo-img" style={{ height: '50px' }} />
            <span className="app-title" style={{ fontSize: '1.2rem' }}>Panel Principal</span>
          </div>

          {/* Info Usuario a la derecha */}
          <div className="dashboard-header">
            <div className="user-info">
              <span className="user-name">{currentUser.displayName}</span>
              <span className="user-role">{userRole}</span>
            </div>
            <div style={{ height: '30px', width: '1px', backgroundColor: '#ccc' }}></div>
            <Link to="/perfil" className="nav-link">Mi Perfil</Link>
            <button onClick={logout} className="btn-logout">Salir</button>
          </div>
        </div>
      </header>

      {/* Paneles según Rol */}
      {userRole === 'administrador' && (
        <div className="panels-grid">
          <GestionEspecialidades />
          <GestionMedicos />
          <GestionHorarios />
          <BuscarCitas />
          <HistorialPagos />
          <Reportes />
        </div>
      )}

      {userRole === 'medico' && (
        <div className="panels-grid">
          <GestionAgenda />
          <CitasMedico />
        </div>
      )}

      {userRole === 'paciente' && <PacienteDashboard />}
    </div>
  );
};

export default App;
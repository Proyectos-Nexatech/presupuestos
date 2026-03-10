import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import HojaDeRuta from './pages/HojaDeRuta';
import BasePresupuesto from './pages/BasePresupuesto';
import ManoObra from './pages/ManoObra';
import APU from './pages/APU';
import ExamenesMedicos from './pages/ExamenesMedicos';
import CertificacionAlturas from './pages/CertificacionAlturas';
import CertificadosConfinados from './pages/CertificadosConfinados';
import Dotacion from './pages/Dotacion';
import CuadroEconomico from './pages/CuadroEconomico';
import Rendimientos from './pages/Rendimientos';
import Salarios from './pages/Salarios';
import MaestroCargos from './pages/MaestroCargos';

import { FormulaProvider } from './context/FormulaContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import GestorFormulas from './pages/GestorFormulas';
import GestionUsuarios from './pages/GestionUsuarios';
import Login from './pages/Login';

// Placeholder components for other pages
const PlaceholderPage = ({ title }: { title: string }) => (
  <div style={{ padding: '2rem' }}>
    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h1>
    <p style={{ color: 'hsl(var(--muted-foreground))' }}>Esta página está en construcción o requiere desarrollo.</p>
  </div>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <FormulaProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                {/* Rutas accesibles para todos los usuarios autenticados */}
                <Route path="/" element={<Dashboard />} />
                <Route path="/hoja-de-ruta" element={<HojaDeRuta />} />
                <Route path="/base-presupuesto" element={<BasePresupuesto />} />
                <Route path="/rendimientos" element={<Rendimientos />} />
                <Route path="/auditoria" element={<PlaceholderPage title="Logs de Auditoría" />} />

                {/* Ingeniería de Costos: Solo Admin y Coordinador */}
                <Route element={<ProtectedRoute roles={['admin', 'coordinador']} />}>
                  <Route path="/apu" element={<APU />} />
                  <Route path="/apu/:id" element={<APU />} />
                  <Route path="/cuadro-economico" element={<CuadroEconomico />} />
                </Route>

                {/* RRHH y Costos Adicionales: Admin, RRHH (y Coordinador solo lectura manejado vía backend) */}
                <Route element={<ProtectedRoute roles={['admin', 'rrhh', 'coordinador']} />}>
                  <Route path="/mano-obra" element={<ManoObra />} />
                  <Route path="/examenes-medicos" element={<ExamenesMedicos />} />
                  <Route path="/certificacion-alturas" element={<CertificacionAlturas />} />
                  <Route path="/certificados-confinados" element={<CertificadosConfinados />} />
                  <Route path="/dotacion" element={<Dotacion />} />
                  <Route path="/salarios" element={<Salarios />} />
                  <Route path="/maestro-cargos" element={<MaestroCargos />} />
                </Route>

                {/* Módulo de Configuración: Solo Admin */}
                <Route element={<ProtectedRoute roles={['admin']} />}>
                  <Route path="/configuracion" element={<GestorFormulas />} />
                  <Route path="/configuracion/usuarios" element={<GestionUsuarios />} />
                </Route>
              </Route>
            </Route>

          </Routes>
        </FormulaProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

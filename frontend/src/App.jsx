import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./views/Login";
import ResumenGlobal from "./views/ResumenGlobal";
import MapaRed from "./components/MapaRed"; 
import Dispositivos from "./views/Dispositivos";
import Usuarios from "./views/Usuarios";
import SoporteTecnico from "./views/ResumenSoporte";
import GestionKMZ from "./views/GestionKMZ";
import ReporteFallas from "./views/ReporteFallas";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import ResetPassword from "./views/ResetPassword"; // <- ¡Corregido apuntando a views!

// Componente para redirigir según el rol al entrar a la raíz "/"
function RedireccionPorRol() {
  const usuario = JSON.parse(localStorage.getItem("usuario")) || {};
  const rol = usuario.rol || usuario.tipo_rol || "";

  // Si es soporte técnico, mándalo a su panel de campo
  if (rol.toUpperCase().includes("SOPORTE")) {
    return <Navigate to="/soporte-tecnico" replace />;
  }
  // Si es admin, mándalo al resumen
  return <Navigate to="/resumen" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Ruta pública para restablecer contraseña desde el correo */}
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/"
        element={
          <ProtectedRoute rolesPermitidos={["ADMINISTRADOR", "SOPORTE_TECNICO", "Soporte Técnico", "soporte"]}>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Usamos el componente inteligente de redirección */}
        <Route index element={<RedireccionPorRol />} />
        
        <Route path="resumen" element={<ResumenGlobal />} />
        <Route path="mapa" element={<MapaRed />} /> 
        <Route path="dispositivos" element={<Dispositivos />} />
        <Route path="soporte-tecnico" element={<SoporteTecnico />} />
        
        {/* Ruta para gestión KMZ (disponible para admin y soporte técnico) */}
        <Route path="kmz" element={<GestionKMZ />} />

        {/* Ruta de usuarios (solo admin) */}
        <Route
          path="usuarios"
          element={
            <ProtectedRoute rolesPermitidos={["ADMINISTRADOR", "Admin", "admin"]}>
              <Usuarios />
            </ProtectedRoute>
          }
        />

        {/* Ruta de Reporte de Fallas (exclusiva para administradores) */}
        <Route
          path="reportes"
          element={
            <ProtectedRoute rolesPermitidos={["ADMINISTRADOR", "Admin", "admin"]}>
              <ReporteFallas />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
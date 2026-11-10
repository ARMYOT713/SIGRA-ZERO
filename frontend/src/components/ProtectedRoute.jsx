import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, rolesPermitidos }) {
  const { usuario, cargando } = useAuth();
  
  // Verificamos respaldo directo en localStorage por seguridad de recarga
  const token = localStorage.getItem("token");
  const usuarioStorage = localStorage.getItem("usuario");

  if (cargando) {
    return <p style={{ textAlign: "center", marginTop: "20vh", fontFamily: "Poppins" }}>Verificando credenciales de red...</p>;
  }

  // Si no hay token o no hay usuario en contexto/storage, fuera al login
  if (!token || (!usuario && !usuarioStorage)) {
    return <Navigate to="/login" replace />;
  }

  // Extraemos el rol actual (del contexto o del storage)
  const rolActual = usuario?.rol || JSON.parse(usuarioStorage || "{}")?.rol || "";

  if (rolesPermitidos && !rolesPermitidos.some(r => r.toUpperCase() === rolActual.toUpperCase())) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
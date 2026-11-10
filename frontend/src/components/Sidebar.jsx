import { Link, useLocation } from "react-router-dom";

function Sidebar() {
  const location = useLocation();
  
  // Obtenemos los datos del usuario guardados al hacer Login con la BD
  const usuarioLogueado = JSON.parse(localStorage.getItem("usuario")) || {};
  
  // Verificamos si es soporte técnico por su ID (2) o por su rol
  const esSoporteTecnico = usuarioLogueado.id === 2 || 
                           usuarioLogueado.rol === "SOPORTE_TECNICO" || 
                           usuarioLogueado.rol_id === 2;

  const isActive = (path) => location.pathname === path;

  const linkStyle = (path) => ({
    display: "block",
    padding: "12px 16px",
    color: isActive(path) ? "#ffffff" : "#94a3b8",
    backgroundColor: isActive(path) ? "#1e293b" : "transparent",
    textDecoration: "none",
    fontWeight: isActive(path) ? "600" : "400",
    fontSize: "0.85rem",
    borderRadius: "6px",
    marginBottom: "4px"
  });

  return (
    <div style={{ width: "240px", backgroundColor: "#0f172a", height: "100vh", padding: "20px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      
      {/* LOGO Y TIPO DE PERFIL */}
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ color: "#ffffff", fontSize: "1.25rem", margin: 0, fontWeight: "800", letterSpacing: "1px" }}>SIGRA</h2>
        <span style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase" }}>
          {esSoporteTecnico ? "Soporte Técnico" : "Administrador"}
        </span>
      </div>

      {/* MENÚ DINÁMICO */}
      <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        
        {/* Opciones generales */}
        <Link to="/resumen" style={linkStyle("/resumen")}>Resumen Global</Link>
        <Link to="/mapa" style={linkStyle("/mapa")}>Mapa de Geolocalización</Link>
        <Link to="/dispositivos" style={linkStyle("/dispositivos")}>Dispositivos</Link>

        {/* Si es Soporte Técnico, le mostramos su panel de campo */}
        {esSoporteTecnico && (
          <Link to="/soporte-tecnico" style={linkStyle("/soporte-tecnico")}>Panel de Campo</Link>
        )}

        {/* Si NO es soporte técnico (es decir, es Administrador), mostramos Usuarios */}
        {!esSoporteTecnico && (
          <Link to="/usuarios" style={linkStyle("/usuarios")}>Usuarios</Link>
        )}

      </nav>
    </div>
  );
}

export default Sidebar;
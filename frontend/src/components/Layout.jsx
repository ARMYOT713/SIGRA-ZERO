import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";

function Layout() {
  const navigate = useNavigate();

  // Obtenemos los datos del usuario logueado desde localStorage
  const usuarioGuardado = JSON.parse(localStorage.getItem("usuario") || "{}");
  const usuarioNombre = usuarioGuardado.nombre_completo || usuarioGuardado.nombre || "Usuario";
  
  const rolUsuario = usuarioGuardado.rol || "";
  const esAdmin = rolUsuario.toUpperCase() === "ADMINISTRADOR";

  // Función para transformar el rol de la BD en un texto estético, limpio y legible
  const formatearRolEstetico = (rol) => {
    if (!rol) return "";
    const rolUpper = rol.toUpperCase().trim();
    if (rolUpper === "ADMINISTRADOR") return "Administrador";
    if (rolUpper === "SOPORTE_TECNICO" || rolUpper === "SOPORTE TECNICO") return "Soporte Técnico";
    
    return rol
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleCerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    navigate("/login");
  };

  // Definimos las opciones del menú de forma dinámica según el rol:
  const menuItems = [
    ...(esAdmin ? [{ to: "/resumen", label: "RESUMEN GLOBAL" }] : []),
    ...(!esAdmin ? [{ to: "/soporte-tecnico", label: "RESUMEN GLOBAL" }] : []),
    { to: "/mapa", label: "MAPA DE GEOLOCALIZACIÓN" },
    { to: "/dispositivos", label: "DISPOSITIVOS" },
    { to: "/kmz", label: "GESTIÓN KMZ/KML" },
   
    ...(esAdmin ? [
      { to: "/usuarios", label: "USUARIOS" },
      { to: "/reportes", label: "REPORTE DE FALLAS" }
    ] : []),
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        backgroundColor: "#f4f6f9",
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* HEADER SUPERIOR */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#ffffff",
          color: "#182130",
          padding: "0 28px",
          height: "65px",
          borderBottom: "1px solid #63666b",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          zIndex: 10,
        }}
      >
        {/* BLOQUE IZQUIERDO: LOGO Y SIGRA */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginLeft: "8px" }}>
          <img 
            src="/logo.png" 
            alt="Logo Empresa" 
            style={{ 
              height: "36px", 
              width: "auto", 
              objectFit: "contain" 
            }} 
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div style={{ height: "24px", width: "1px", backgroundColor: "#cbd5e1" }}></div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.35rem",
              fontWeight: "600",
              letterSpacing: "1.2px",
              color: "#0f172a",
            }}
          >
            SIGRA
          </h1>
        </div>

        {/* DERECHA: USUARIO, ROL Y BOTÓN CERRAR SESIÓN */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.95rem" }}>
            <span style={{ color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>
              HOLA:
            </span>
            <span style={{ fontWeight: "700", color: "#0f172a" }}>
              {usuarioNombre}
            </span>
            <span style={{ color: '#10b981', fontWeight: "700", marginLeft: "4px" }}>
              {formatearRolEstetico (rolUsuario)}
            </span>
          </div>

          <button
            onClick={handleCerrarSesion}
            style={{
              backgroundColor: "#ef4444",
              color: "#ffffff",
              border: "none",
              padding: "8px 18px",
              fontSize: "0.8rem",
              fontWeight: "700",
              cursor: "pointer",
              borderRadius: "4px",
              letterSpacing: "0.5px",
              transition: "background-color 0.2s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#dc2626")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#ef4444")}
          >
            CERRAR SESIÓN
          </button>
        </div>
      </header>

      {/* CONTENEDOR CENTRAL */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* SIDEBAR */}
        <aside
          style={{
            width: "210px",
            backgroundColor: "#05070a",
            padding: "20px 0",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 20px",
                textDecoration: "none",
                fontWeight: "700",
                fontSize: "0.8rem",
                letterSpacing: "0.5px",
                color: isActive ? "#10b981" : "#ffffff",
                backgroundColor: isActive ? "#18222c" : "transparent",
                borderLeft: isActive ? "4px solid #10b981" : "4px solid transparent",
                transition: "all 0.15s ease",
              })}
            >
              <span>{item.label}</span>
            </NavLink>
          ))}
        </aside>

        {/* CONTENEDOR VISTA PRINCIPAL (CON SCROLL VERTICAL HABILITADO) */}
        <main style={{ 
          flex: 1, 
          backgroundColor: "#f8fafc", 
          overflowY: "auto",      
          overflowX: "hidden",    
          position: "relative",
          height: "100%"
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Layout() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [modalCerrarSesion, setModalCerrarSesion] = useState(false);

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

  const confirmarCerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    if (typeof logout === "function") {
      try { logout(); } catch (e) {}
    }
    setModalCerrarSesion(false);
    navigate("/login", { replace: true });
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
          flexShrink: 0,
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
              {formatearRolEstetico(rolUsuario)}
            </span>
          </div>

          <button
            onClick={() => setModalCerrarSesion(true)}
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
            flexShrink: 0,
            backgroundColor: "#05070a",
            padding: "20px 0 12px 0",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* NAVEGACIÓN PRINCIPAL */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
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
          </div>

          {/* ENLACE SUTIL AL MANUAL DE USUARIO (ANCLADO ABAJO) */}
          <div
            style={{
              marginTop: "auto",
              paddingTop: "10px",
              borderTop: "1px solid #1e293b",
              margin: "0 14px",
            }}
          >
            <a
              href="/Manual_Usuario_SIGRA.pdf"
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir Manual de Usuario en PDF"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 8px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "0.74rem",
                letterSpacing: "0.6px",
                color: "#94a3b8",
                borderRadius: "4px",
                transition: "all 0.15s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = "#10b981";
                e.currentTarget.style.backgroundColor = "#111827";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = "#94a3b8";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span>MANUAL DE USUARIO</span>
            </a>
          </div>
        </aside>

        {/* COLUMNA DERECHA: VISTA PRINCIPAL + FOOTER GLOBAL */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
            height: "100%",
          }}
        >
          {/* CONTENEDOR VISTA PRINCIPAL */}
          <main
            style={{
              flex: 1,
              backgroundColor: "#f8fafc",
              overflowY: "auto",
              overflowX: "hidden",
              position: "relative",
            }}
          >
            <Outlet />
          </main>

          {/* FOOTER GENERAL */}
          <footer
            style={{
              flexShrink: 0,
              backgroundColor: "#f8fafc",
              padding: "6px 16px",
              textAlign: "center",
              fontSize: "0.68rem",
              color: "#94a3b8",
              letterSpacing: "0.2px",
            }}
          >
            © 2026 <strong>SIGRA - WinfoRed</strong>. Todos los derechos reservados. · Desarrollado por{" "}
            <strong>Carolina Garcia</strong>.
          </footer>
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN PARA CERRAR SESIÓN */}
      {modalCerrarSesion && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 5000,
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "24px 28px",
              borderRadius: "10px",
              width: "390px",
              maxWidth: "90%",
              textAlign: "center",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
              border: "1px solid #e2e8f0",
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", fontSize: "1.08rem", color: "#0f172a" }}>
              ¿Cerrar sesión?
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#475569", marginBottom: "22px", lineHeight: 1.5 }}>
              ¿Estás segura de que deseas salir de <strong>SIGRA</strong>? Tendrás que ingresar tus credenciales nuevamente para acceder.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setModalCerrarSesion(false)}
                style={{
                  backgroundColor: "#e2e8f0",
                  color: "#334155",
                  border: "none",
                  padding: "9px 18px",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarCerrarSesion}
                style={{
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  padding: "9px 18px",
                  borderRadius: "6px",
                  fontSize: "0.82rem",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Sí, Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Layout;
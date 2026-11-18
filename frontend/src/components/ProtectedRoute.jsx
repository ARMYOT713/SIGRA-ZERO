import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Verifica que el JWT tenga estructura válida y no haya expirado
function esTokenValido(token) {
  if (!token || typeof token !== "string") return false;
  const partes = token.split(".");
  if (partes.length !== 3) return false;

  try {
    const payloadBase64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(payloadBase64));
    if (!payload || !payload.id || !payload.rol) return false;

    if (payload.exp) {
      const ahoraEnSegundos = Math.floor(Date.now() / 1000);
      if (ahoraEnSegundos >= payload.exp) {
        return false; // Token expirado
      }
    }
    return payload;
  } catch (e) {
    return false;
  }
}

function ProtectedRoute({ children, rolesPermitidos }) {
  const { usuario, cargando, logout } = useAuth();
  const location = useLocation();
  const [verificacionTick, setVerificacionTick] = useState(0);

  // Re-evaluar sesión cada vez que el usuario use las flechas Atrás/Adelante o regrese de caché
  useEffect(() => {
    const forzarRevalidacion = () => {
      setVerificacionTick((prev) => prev + 1);
    };

    window.addEventListener("popstate", forzarRevalidacion);
    window.addEventListener("pageshow", forzarRevalidacion);
    window.addEventListener("storage", forzarRevalidacion);

    return () => {
      window.removeEventListener("popstate", forzarRevalidacion);
      window.removeEventListener("pageshow", forzarRevalidacion);
      window.removeEventListener("storage", forzarRevalidacion);
    };
  }, [location.pathname]);

  if (cargando) {
    return (
      <p style={{ textAlign: "center", marginTop: "20vh", fontFamily: "Poppins, sans-serif" }}>
        Verificando credenciales de red...
      </p>
    );
  }

  const token = localStorage.getItem("token");
  const usuarioStorageRaw = localStorage.getItem("usuario");
  const payloadToken = esTokenValido(token);

  // Si no hay token, está corrupto, expiró o no hay usuario, limpiar todo y expulsar al login
  if (!payloadToken || (!usuario && !usuarioStorageRaw)) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    if (typeof logout === "function") {
      try { logout(); } catch (e) {}
    }
    return <Navigate to="/login" replace />;
  }

  let usuarioParseado = {};
  try {
    usuarioParseado = usuario || JSON.parse(usuarioStorageRaw || "{}");
  } catch (e) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    return <Navigate to="/login" replace />;
  }

  // Tomamos el rol directamente del JWT firmado por el backend para evitar manipulación en localStorage
  const rolActual = String(payloadToken.rol || usuarioParseado?.rol || "").toUpperCase();

  // Si el usuario intenta escribir una URL de un módulo para el que no tiene rol, redirigir
  if (
    rolesPermitidos &&
    !rolesPermitidos.some((r) => String(r).toUpperCase() === rolActual)
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
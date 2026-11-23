import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Verifica estructura y expiración del JWT
export function esTokenValido(token) {
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
        return false;
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
  const [, setTick] = useState(0);

  const token = localStorage.getItem("token");
  const usuarioStorageRaw = localStorage.getItem("usuario");
  const payloadToken = esTokenValido(token);
  const sesionInvalida = !payloadToken || (!usuario && !usuarioStorageRaw);

  // Limpieza segura de sesión inválida (fuera del render)
  useEffect(() => {
    if (!cargando && sesionInvalida) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      if (typeof logout === "function") {
        try { logout(); } catch (e) {}
      }
    }
  }, [cargando, sesionInvalida, logout]);

  // Protección contra bfcache (flechas Atrás/Adelante) y cierre en otra pestaña
  useEffect(() => {
    const verificarSesionEnNavegacion = (event) => {
      const tokenActual = localStorage.getItem("token");
      if (!esTokenValido(tokenActual)) {
        if (event?.type === "pageshow" && event.persisted) {
          window.location.replace("/login");
          return;
        }
        setTick((prev) => prev + 1);
      }
    };

    window.addEventListener("popstate", verificarSesionEnNavegacion);
    window.addEventListener("pageshow", verificarSesionEnNavegacion);
    window.addEventListener("storage", verificarSesionEnNavegacion);

    return () => {
      window.removeEventListener("popstate", verificarSesionEnNavegacion);
      window.removeEventListener("pageshow", verificarSesionEnNavegacion);
      window.removeEventListener("storage", verificarSesionEnNavegacion);
    };
  }, [location.pathname]);

  if (cargando) {
    return (
      <p style={{ textAlign: "center", marginTop: "20vh", fontFamily: "Poppins, sans-serif" }}>
        Verificando credenciales de red...
      </p>
    );
  }

  if (sesionInvalida) {
    return <Navigate to="/login" replace />;
  }

  let usuarioParseado = {};
  try {
    usuarioParseado = usuario || JSON.parse(usuarioStorageRaw || "{}");
  } catch (e) {
    return <Navigate to="/login" replace />;
  }

  const rolActual = String(payloadToken.rol || usuarioParseado?.rol || "").toUpperCase();

  if (
    rolesPermitidos &&
    !rolesPermitidos.some((r) => String(r).toUpperCase() === rolActual)
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
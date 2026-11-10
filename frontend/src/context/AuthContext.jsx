import { createContext, useContext, useState, useEffect } from "react";
import { loginRequest } from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Al cargar la app, revisa si ya había una sesión guardada
  useEffect(() => {
    const usuarioGuardado = localStorage.getItem("usuario");
    const token = localStorage.getItem("token");

    if (usuarioGuardado && token) {
      setUsuario(JSON.parse(usuarioGuardado));
    }

    setCargando(false);
  }, []);

async function login(id_usuario, password) {
    try {
      const response = await loginRequest(id_usuario, password);
      
      // Ajusta si tu API devuelve data directa o response.data
      const data = response.data || response;

      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", JSON.stringify(data.usuario));
      setUsuario(data.usuario);

      return { success: true, usuario: data.usuario };
    } catch (error) {
      // Capturamos el error 401/400 del servidor de forma limpia
      return {
        success: false,
        message: error?.response?.data?.message || "ID de usuario o contraseña incorrectos.",
      };
    }
  }
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api"
});

// Interceptor: se ejecuta ANTES de cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Interceptor de respuesta: ignora la redirección si la petición viene del endpoint de login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginEndpoint = error.config?.url?.includes("/auth/login");

    if (error.response && error.response.status === 401 && !isLoginEndpoint) {
      localStorage.removeItem("token");
      localStorage.removeItem("usuario");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export const loginRequest = (id_usuario, password) =>
  api.post("/auth/login", { id_usuario, password });

// Endpoints de la Red de Fibra Óptica
export const obtenerPostes = () => api.get("/red/postes");
export const obtenerNaps = () => api.get("/red/naps");
export const obtenerOnus = () => api.get("/red/onus");

// NUEVA: Endpoint para unificar los dispositivos en el mapa
export const obtenerDispositivosMapa = () => api.get("/red/mapa-dispositivos");

// Guardar nueva conexión de fibra óptica entre dos puntos
export const guardarConexion = (datosConexion) => api.post("/red/conexiones", datosConexion);

// Obtener detalles extendidos de un elemento específico por su tipo y ID
export const obtenerDetalleElemento = (tipo, id) =>
  api.get(`/red/${tipo.toLowerCase()}s/${id}`);

// Obtener historial de mantenimientos/eventos de un dispositivo
export const obtenerHistorialElemento = (tipo, id) =>
  api.get(`/red/${tipo.toLowerCase()}s/${id}/historial`);

export default api;
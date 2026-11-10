import React, { useEffect, useState } from "react";
import { obtenerDetalleElemento, obtenerHistorialElemento } from "../services/api";

function PanelDetalles({ elemento, onClose }) {
  const [detalle, setDetalle] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tabActiva, setTabActiva] = useState("info"); // 'info' | 'historial'

  useEffect(() => {
    if (!elemento) return;

    async function cargarInformacionExtendida() {
      setCargando(true);
      try {
        const [resDetalle, resHistorial] = await Promise.allSettled([
          obtenerDetalleElemento(elemento.tipo, elemento.id),
          obtenerHistorialElemento(elemento.tipo, elemento.id),
        ]);

        if (resDetalle.status === "fulfilled") {
          setDetalle(resDetalle.value.data);
        } else {
          // Si el endpoint específico aún no devuelve datos extendidos, usaremos los recibidos del mapa
          setDetalle(elemento);
        }

        if (resHistorial.status === "fulfilled") {
          setHistorial(resHistorial.value.data || []);
        } else {
          setHistorial([]);
        }
      } catch (err) {
        console.error("Error al cargar detalles:", err);
      } finally {
        setCargando(false);
      }
    }

    cargarInformacionExtendida();
  }, [elemento]);

  if (!elemento) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: "380px",
        height: "100vh",
        backgroundColor: "#0f172a",
        color: "#f8fafc",
        boxShadow: "-4px 0 20px rgba(0,0,0,0.5)",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s ease",
      }}
    >
      {/* Cabecera del Panel */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #334155",
          display: "flex",
          justify: "space-between",
          alignItems: "center",
          backgroundColor: "#1e293b",
        }}
      >
        <div>
          <span
            style={{
              backgroundColor: "#0284c7",
              color: "white",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "0.75rem",
              fontWeight: "bold",
            }}
          >
            {elemento.tipo}
          </span>
          <h2 style={{ margin: "4px 0 0 0", fontSize: "1.2rem", color: "#ffffff" }}>
            {elemento.codigo}
          </h2>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#94a3b8",
            fontSize: "1.2rem",
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      {/* Navegación por Pestañas */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #334155",
          backgroundColor: "#0f172a",
        }}
      >
        <button
          onClick={() => setTabActiva("info")}
          style={{
            flex: 1,
            padding: "12px",
            background: "none",
            border: "none",
            borderBottom: tabActiva === "info" ? "3px solid #38bdf8" : "none",
            color: tabActiva === "info" ? "#38bdf8" : "#94a3b8",
            fontWeight: tabActiva === "info" ? "bold" : "normal",
            cursor: "pointer",
          }}
        >
          📋 Detalles Técnicos
        </button>
        <button
          onClick={() => setTabActiva("historial")}
          style={{
            flex: 1,
            padding: "12px",
            background: "none",
            border: "none",
            borderBottom: tabActiva === "historial" ? "3px solid #38bdf8" : "none",
            color: tabActiva === "historial" ? "#38bdf8" : "#94a3b8",
            fontWeight: tabActiva === "historial" ? "bold" : "normal",
            cursor: "pointer",
          }}
        >
          📜 Historial ({historial.length})
        </button>
      </div>

      {/* Contenido Dinámico */}
      <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
        {cargando ? (
          <p style={{ color: "#94a3b8", textAlign: "center" }}>Cargando datos...</p>
        ) : tabActiva === "info" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ backgroundColor: "#1e293b", padding: "12px", borderRadius: "8px" }}>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>UBICACIÓN GEOGRÁFICA</span>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem" }}>
                📍 Lat: <strong>{detalle?.latitud}</strong>
              </p>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.9rem" }}>
                📍 Lon: <strong>{detalle?.longitud}</strong>
              </p>
              {detalle?.direccion && (
                <p style={{ margin: "6px 0 0 0", fontSize: "0.85rem", color: "#cbd5e1" }}>
                  🏠 Dirección: {detalle.direccion}
                </p>
              )}
            </div>

            {/* Datos Específicos según el Tipo de Dispositivo */}
            {elemento.tipo === "ONU" && (
              <div style={{ backgroundColor: "#1e293b", padding: "12px", borderRadius: "8px" }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>PARÁMETROS ÓPTICOS / CLIENTE</span>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem" }}>
                  Status: <strong style={{ color: detalle?.estado === "OK" ? "#4ade80" : "#f87171" }}>{detalle?.estado || "Online"}</strong>
                </p>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem" }}>
                  Cliente: <strong>{detalle?.cliente || "No asignado"}</strong>
                </p>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem" }}>
                  Potencia Óptica (dBm): <strong>{detalle?.potencia_dbm || "-19.5 dBm"}</strong>
                </p>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem" }}>
                  IP / MAC: <strong>{detalle?.mac_address || "00:1A:2B:3C:4D:5E"}</strong>
                </p>
              </div>
            )}

            {elemento.tipo === "NAP" && (
              <div style={{ backgroundColor: "#1e293b", padding: "12px", borderRadius: "8px" }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>CAPACIDAD DE PUERTOS</span>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem" }}>
                  Puertos Usados: <strong>{detalle?.puertos_usados || 4} / {detalle?.capacidad_puertos || 8}</strong>
                </p>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem" }}>
                  Splitter: <strong>{detalle?.tipo_splitter || "1:8 PLC"}</strong>
                </p>
              </div>
            )}

            {elemento.tipo === "Poste" && (
              <div style={{ backgroundColor: "#1e293b", padding: "12px", borderRadius: "8px" }}>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>ESPECIFICACIONES DEL POSTE</span>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem" }}>
                  Material: <strong>{detalle?.material || "Concreto"}</strong>
                </p>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem" }}>
                  Altura: <strong>{detalle?.altura_metros || "9m"}</strong>
                </p>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem" }}>
                  Propietario: <strong>{detalle?.propietario || "CFE / Propio"}</strong>
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Vista del Historial */
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {historial.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "center" }}>
                No hay mantenimientos ni eventos registrados previamente para este equipo.
              </p>
            ) : (
              historial.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    backgroundColor: "#1e293b",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    borderLeft: `4px solid ${
                      item.tipo_evento === "Falla" ? "#ef4444" : "#22c55e"
                    }`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong style={{ fontSize: "0.85rem", color: "#f8fafc" }}>
                      {item.titulo || item.tipo_evento}
                    </strong>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                      {item.fecha ? new Date(item.fecha).toLocaleDateString() : "Reciente"}
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#cbd5e1" }}>
                    {item.descripcion}
                  </p>
                  {item.tecnico && (
                    <span style={{ fontSize: "0.75rem", color: "#38bdf8", marginTop: "4px", display: "block" }}>
                      👤 Técnico: {item.tecnico}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PanelDetalles;
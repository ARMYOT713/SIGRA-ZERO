import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import html2pdf from "html2pdf.js";

function SoporteTecnico() {
  const [reportes, setReportes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  
  const [reporteDetalles, setReporteDetalles] = useState(null);
  const [reporteResolver, setReporteResolver] = useState(null);
  
  const [comentariosSolucion, setComentariosSolucion] = useState("");
  
  const [tareasUrgentesHoy, setTareasUrgentesHoy] = useState([]);
  const [mostrarModalUrgentes, setMostrarModalUrgentes] = useState(false);
  
  const [pestañaActiva, setPestañaActiva] = useState("activas");
  const [busquedaFiltro, setBusquedaFiltro] = useState("");

  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: "", tipo: "exito" });

  const navigate = useNavigate();

  const usuarioObj = JSON.parse(localStorage.getItem("usuario") || "{}");
  const usuarioLogueado = usuarioObj.nombre_completo || usuarioObj.nombre || localStorage.getItem("nombreUsuario") || "Técnico";

  const mostrarAlertaFlotante = (mensaje, tipo = "exito") => {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => {
      setNotificacion(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const esDispositivoOnu = (item) => {
    if (!item) return false;
    const tipoUpper = String(item.tipo || "").toUpperCase();
    const codigoUpper = String(item.cliente_ref || item.codigo || "").toUpperCase();
    return tipoUpper === "ONU" || item.es_onu === true || codigoUpper.includes("ONU");
  };

  useEffect(() => {
    cargarReportesTecnico();
  }, []);

  const cargarReportesTecnico = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("https://sigra-zero.onrender.com/api/red/reportes", {
        headers: { 
          "Content-Type": "application/json", 
          "Authorization": `Bearer ${token}` 
        }
      });

      if (!response.ok) throw new Error("Error al obtener las incidencias de campo");
      
      const data = await response.json();
      const listaReportes = Array.isArray(data) ? data : [];
      setReportes(listaReportes);
      setError("");

      verificarTareasUrgentesPendientes(listaReportes);
    } catch (err) {
      console.error("Error:", err);
      setError("No se pudieron cargar las órdenes de campo.");
    } finally {
      setCargando(false);
    }
  };

  const misReportes = reportes.filter(rep => {
    const asignado = (rep.tecnico_asignado || rep.soporte_asignado || "").toLowerCase().trim();
    return asignado === usuarioLogueado.toLowerCase().trim();
  });

  const verificarTareasUrgentesPendientes = (lista) => {
    const urgentesPendientesLista = lista.filter(rep => {
      const asignado = (rep.tecnico_asignado || rep.soporte_asignado || "").toLowerCase().trim();
      const esDelTecnico = asignado === usuarioLogueado.toLowerCase().trim();
      const esPendiente = rep.estatus === true || rep.estatus === 1 || rep.estatus === "true";
      const esUrgente = (rep.prioridad || "").toLowerCase() === "urgente";
      return esDelTecnico && esPendiente && esUrgente;
    });

    if (urgentesPendientesLista.length > 0) {
      setTareasUrgentesHoy(urgentesPendientesLista);
      setMostrarModalUrgentes(true);
    }
  };

  const obtenerContadorReportesElemento = (repActual) => {
    const idOnu = repActual.id_onus || repActual.onu?.id_onus;
    const idCli = repActual.id_cliente || repActual.cliente_id || repActual.cliente?.id || repActual.cliente?.id_cliente;
    const idNap = repActual.id_nap || repActual.nap_id || repActual.nap?.id || repActual.nap?.id_nap;
    const idPoste = repActual.id_poste || repActual.poste_id || repActual.poste?.id || repActual.poste?.poste_id;

    const coincidencias = reportes.filter(r => {
      const rOnu = r.id_onus || r.onu?.id_onus;
      const rCli = r.id_cliente || r.cliente_id || r.cliente?.id || r.cliente?.id_cliente;
      const rNap = r.id_nap || r.nap_id || r.nap?.id || r.nap?.id_nap;
      const rPoste = r.id_poste || r.poste_id || r.poste?.id || r.poste?.poste_id;

      if (idOnu && rOnu === idOnu) return true;
      if (idCli && rCli === idCli) return true;
      if (idNap && rNap === idNap) return true;
      if (idPoste && rPoste === idPoste) return true;
      return false;
    });

    return coincidencias.length;
  };

  const obtenerNombreYTipoElemento = (rep) => {
    const tipoStr = (rep.tipo_elemento || "").toLowerCase();
    const esOnu = tipoStr.includes("onu") || !!rep.id_onus || esDispositivoOnu(rep.cliente);
    const esNap = !esOnu && (tipoStr.includes("nap") || !!rep.id_nap || !!rep.nap_id || !!rep.nap);
    const esPoste = !esOnu && !esNap && (tipoStr.includes("poste") || !!rep.id_poste || !!rep.poste_id || !!rep.poste);

    const etiquetaTipo = esOnu ? "Equipo ONU" : esNap ? "Caja NAP" : esPoste ? "Poste" : "Modem / Cliente";
    const nombre =
      rep.onu?.codigo ||
      rep.cliente?.nombre_completo ||
      rep.cliente?.cliente_ref ||
      rep.nap?.codigo_nap ||
      rep.poste?.codigo ||
      "Elemento de red";

    return { etiquetaTipo, nombre, esOnu, esNap, esPoste, esCliente: !esOnu && !esNap && !esPoste };
  };

  const reportesFiltradosBusqueda = misReportes.filter(rep => {
    const texto = busquedaFiltro.toLowerCase().trim();
    if (!texto) return true;
    const idStr = String(rep.id_reporte || rep.id || "").toLowerCase();
    const fallaStr = (rep.falla_presentada || "").toLowerCase();
    const { nombre, etiquetaTipo } = obtenerNombreYTipoElemento(rep);
    return (
      idStr.includes(texto) ||
      fallaStr.includes(texto) ||
      nombre.toLowerCase().includes(texto) ||
      etiquetaTipo.toLowerCase().includes(texto)
    );
  });

  const reportesOrdenados = [...reportesFiltradosBusqueda].sort((a, b) => {
    if (a.estatus === b.estatus) {
      if (a.prioridad === "Urgente" && b.prioridad !== "Urgente") return -1;
      if (a.prioridad !== "Urgente" && b.prioridad === "Urgente") return 1;
      return (b.id_reporte || b.id) - (a.id_reporte || a.id);
    }
    return a.estatus ? -1 : 1;
  });

  const reportesActivos = reportesOrdenados.filter(r => r.estatus === true || r.estatus === 1 || r.estatus === "true");
  const reportesArchivados = reportesOrdenados.filter(r => r.estatus === false || r.estatus === 0 || r.estatus === "false" || r.estatus === null);

  const totalAsignadas = misReportes.length;
  const completadasTotal = misReportes.filter(r => r.estatus === false || r.estatus === 0 || r.estatus === "false" || r.estatus === null).length;
  const urgentesPendientes = misReportes.filter(rep => {
    const esPendiente = rep.estatus === true || rep.estatus === 1 || rep.estatus === "true";
    return esPendiente && (rep.prioridad || "").toLowerCase() === "urgente";
  }).length;

  const ubicarEnMapa = (rep) => {
    const lat = rep.latitud || rep.cliente?.latitud || rep.nap?.latitud || rep.poste?.latitud;
    const lng = rep.longitud || rep.cliente?.longitud || rep.nap?.longitud || rep.poste?.longitud;
    
    const { esOnu, esNap, esPoste } = obtenerNombreYTipoElemento(rep);
    let tipoParam = "cliente";
    if (esOnu) tipoParam = "onu";
    else if (esNap) tipoParam = "nap";
    else if (esPoste) tipoParam = "poste";

    const idBuscado =
      rep.id_onus ||
      rep.id_cliente ||
      rep.cliente_id ||
      rep.id_nap ||
      rep.nap_id ||
      rep.id_poste ||
      rep.poste_id ||
      rep.id_elemento ||
      rep.onu?.id_onus ||
      rep.cliente?.id_cliente ||
      rep.nap?.id_nap ||
      rep.poste?.poste_id;

    if (lat && lng) {
      if (idBuscado) {
        navigate(`/mapa?lat=${lat}&lng=${lng}&tipo=${tipoParam}&id=${idBuscado}&zoom=18`);
      } else {
        navigate(`/mapa?lat=${lat}&lng=${lng}&zoom=18`);
      }
    } else {
      mostrarAlertaFlotante("Este elemento no cuenta con coordenadas geográficas registradas.", "error");
    }
  };

  const generarYGuardarPDFAutomatico = (rep) => {
    const ventana = window.open("", "_blank");
    if (!ventana) {
      mostrarAlertaFlotante("Permite las ventanas emergentes en tu navegador para visualizar el PDF.", "error");
      return;
    }

    const fechaCierreFormateada = new Date(rep.fecha_resolucion || Date.now()).toLocaleString();
    const totalReportesVeces = obtenerContadorReportesElemento(rep);
    const { esOnu, esNap, esPoste, esCliente } = obtenerNombreYTipoElemento(rep);

    let infoHtml = "";
    if (esOnu) {
      const codigoOnu = rep.onu?.codigo || rep.cliente?.cliente_ref || rep.cliente?.nombre_completo || "N/A";
      const serieOnu = rep.onu?.no_serie || rep.cliente?.contacto || "N/A";
      const localidadOnu = rep.onu?.localidad || rep.cliente?.localidad || "MX-B1";
      infoHtml = `
        <div class="field"><strong>Tipo de Elemento:</strong> ONU (Equipo de Red / Fibra)</div>
        <div class="field"><strong>Identificador / Código:</strong> ${codigoOnu}</div>
        <div class="field"><strong>Número de Serie:</strong> ${serieOnu}</div>
        <div class="field"><strong>Localidad / Barrio:</strong> ${localidadOnu}</div>
      `;
    } else if (esCliente || rep.cliente) {
      const nombreCli = rep.cliente?.nombre_completo || rep.cliente?.cliente_ref || rep.nombre_elemento || "N/A";
      const telCli = rep.cliente?.contacto || "N/A";
      const napCli = rep.nap?.codigo_nap || rep.cliente?.nap?.codigo_nap || "N/A";
      const posteCli = rep.poste?.codigo || rep.nap?.poste?.codigo || rep.cliente?.nap?.poste?.codigo || "N/A";
      infoHtml = `
        <div class="field"><strong>Tipo de Elemento:</strong> Cliente / Suscriptor</div>
        <div class="field"><strong>Nombre Completo:</strong> ${nombreCli}</div>
        <div class="field"><strong>Teléfono de Contacto:</strong> ${telCli}</div>
        <div class="field"><strong>Caja NAP Conectada:</strong> ${napCli}</div>
        <div class="field"><strong>Poste Conectado:</strong> ${posteCli}</div>
      `;
    } else if (esNap || rep.nap) {
      const codigoNap = rep.nap?.codigo_nap || rep.nombre_elemento || "N/A";
      const puertoNap = rep.nap?.capacidad_puertos || rep.nap?.puertos_totales || rep.nap?.puertos || "N/A";
      const posteNap = rep.poste?.codigo || rep.nap?.poste?.codigo || "N/A";
      infoHtml = `
        <div class="field"><strong>Tipo de Elemento:</strong> Caja NAP de Distribución</div>
        <div class="field"><strong>Código NAP:</strong> ${codigoNap}</div>
        <div class="field"><strong>Puertos Totales:</strong> ${puertoNap}</div>
        <div class="field"><strong>Poste Montado:</strong> ${posteNap}</div>
      `;
    } else if (esPoste || rep.poste) {
      const codigoPoste = rep.poste?.codigo || rep.nombre_elemento || "N/A";
      const napAsignadaPoste = rep.poste?.naps?.[0]?.codigo_nap || rep.nap?.codigo_nap || null;
      const localidadPoste = rep.poste?.localidad || rep.poste?.ubicacion || rep.poste?.referencia || "MX-B1 - Santiaguito Maxda (Barrio 1)";

      infoHtml = `
        <div class="field"><strong>Tipo de Elemento:</strong> Poste de Infraestructura</div>
        <div class="field"><strong>Código de Poste:</strong> ${codigoPoste}</div>
        ${napAsignadaPoste
          ? `<div class="field"><strong>Caja NAP Asignada:</strong> ${napAsignadaPoste}</div>`
          : `<div class="field"><strong>Localidad / Barrio:</strong> ${localidadPoste}</div>`}
      `;
    }

    const generarVisorPDFNativo = async (logoBase64) => {
      const idOrden = rep.id_reporte || rep.id;
      const tituloPDF = `Reporte_Incidencia_${idOrden}`;

      const contenidoHtml = `
        <style>
          .pdf-root { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #000; background: #fff; font-size: 12px; width: 780px; padding: 15px 20px; }
          .pdf-root * { box-sizing: border-box; }

          .pdf-root .header-container { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border-bottom: 2px solid #b91c1c; padding-bottom: 12px; margin-bottom: 15px; }
          .pdf-root .brand-center { display: flex; align-items: center; justify-content: center; gap: 15px; }
          .pdf-root .logo-img { height: 40px; width: auto; object-fit: contain; }
          .pdf-root .divider-vertical { width: 2px; height: 35px; background-color: #cbd5e1; }
          .pdf-root .sigra-title { font-size: 1.7rem; font-weight: 600; color: #0f172a; letter-spacing: 1px; margin: 0; line-height: 1; }
          .pdf-root .system-subtitle { font-size: 0.8rem; color: #64748b; margin-top: 4px; font-weight: 500; text-align: center; }

          .pdf-root .section-title { font-size: 0.88rem; font-weight: bold; color: #b91c1c; background: #fef2f2; padding: 5px 10px; border-left: 4px solid #b91c1c; margin-top: 12px; margin-bottom: 6px; }
          .pdf-root .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 6px; }
          .pdf-root .field { font-size: 0.81rem; margin-bottom: 3px; color: #000; }
          .pdf-root .box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin-bottom: 6px; color: #000; }

          .pdf-root .solucion-texto-amplio { font-size: 0.88rem; line-height: 1.4; color: #000; margin: 0; padding: 4px; }
        </style>

        <div class="pdf-root">
          <div class="header-container">
            <div class="brand-center">
              ${logoBase64 ? `<img src="${logoBase64}" class="logo-img" alt="Logo Winfored" />` : ""}
              ${logoBase64 ? `<div class="divider-vertical"></div>` : ""}
              <h1 class="sigra-title">SIGRA</h1>
            </div>
            <div class="system-subtitle">Sistema Integral de Geolocalización de Red de Acceso</div>
          </div>

          <div class="section-title">Datos Generales de la Incidencia</div>
          <div class="grid">
            <div class="field"><strong>ID de Orden:</strong> #${idOrden}</div>
            <div class="field"><strong>Prioridad:</strong> ${rep.prioridad || "Ordinaria"}</div>
            <div class="field"><strong>Falla Presentada:</strong> ${rep.falla_presentada}</div>
            <div class="field"><strong>Historial de Fallas Presentadas:</strong> ${totalReportesVeces}</div>
            <div class="field"><strong>Fecha y Hora de Cierre:</strong> ${fechaCierreFormateada}</div>
            <div class="field"><strong>Técnico Asignado:</strong> ${rep.tecnico_asignado || usuarioLogueado}</div>
          </div>

          <div class="section-title">Información del Elemento Afectado</div>
          <div class="box">${infoHtml}</div>

          <div class="section-title">Solución Aplicada y Trabajos Realizados</div>
          <div class="box">
            <p class="solucion-texto-amplio">${rep.comentarios_solucion || "Sin notas de solución registradas."}</p>
          </div>
        </div>
      `;

      const contenedor = document.createElement("div");
      contenedor.style.cssText = "position:fixed;left:-10000px;top:0;background:#fff;";
      contenedor.innerHTML = contenidoHtml;
      document.body.appendChild(contenedor);

      try {
        await Promise.all(
          Array.from(contenedor.querySelectorAll("img")).map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((r) => { img.onload = img.onerror = r; })
          )
        );

        const pdfBlob = await html2pdf()
          .set({
            margin: [8, 10, 8, 10], 
            filename: `${tituloPDF}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ["css", "legacy"], avoid: [".section-title", ".box"] },
          })
          .from(contenedor.querySelector(".pdf-root"))
          .toPdf()
          .get("pdf")
          .then((pdf) => {
            pdf.setProperties({ title: tituloPDF }); 
          })
          .outputPdf("blob"); 

        const blobUrl = URL.createObjectURL(pdfBlob);
        ventana.location.href = blobUrl;
        setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
      } catch (error) {
        console.error("Error al generar el PDF:", error);
        ventana.close();
        mostrarAlertaFlotante("No se pudo generar el PDF del reporte.", "error");
      } finally {
        document.body.removeChild(contenedor);
      }
    };

    const cargarLogo = (src, onOk, onFail) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext("2d").drawImage(img, 0, 0);
          onOk(canvas.toDataURL("image/png"));
        } catch (e) {
          onFail();
        }
      };
      img.onerror = onFail;
      img.src = src;
    };

    cargarLogo(
      window.location.origin + "/icons/logo.png",
      generarVisorPDFNativo,
      () =>
        cargarLogo(
          window.location.origin + "/logo.png",
          generarVisorPDFNativo,
          () => generarVisorPDFNativo(null)
        )
    );
  };

  const handleResolverIncidencia = async (rep) => {
    setGuardando(true);
    const idTarget = rep.id_reporte || rep.id;
    const token = localStorage.getItem("token");
    const fechaHoraCierre = new Date().toISOString();

    const payload = {
      estatus: false,
      comentarios_solucion: comentariosSolucion.trim() || "Atención realizada por el técnico en campo.",
      fecha_resolucion: fechaHoraCierre
    };

    try {
      const response = await fetch(`https://sigra-zero.onrender.com/api/red/reportes/${idTarget}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || `Error servidor HTTP ${response.status}`);
      }

      const objetoActualizado = { ...rep, ...payload, fecha_resolucion: fechaHoraCierre };
      generarYGuardarPDFAutomatico(objetoActualizado);

      setReportes(prev => prev.map(r => (r.id_reporte || r.id) === idTarget ? objetoActualizado : r));
      
      mostrarAlertaFlotante("Incidencia resuelta con éxito y PDF generado.");
      setReporteResolver(null);
      setComentariosSolucion("");
      cargarReportesTecnico();
    } catch (err) {
      console.error("Error al guardar solución:", err);
      mostrarAlertaFlotante(`Error al guardar: ${err.message}`, "error");
    } finally {
      setGuardando(false);
    }
  };

  const listaAMostrar = pestañaActiva === "activas" ? reportesActivos : reportesArchivados;

  return (
    <div style={{ padding: "24px 32px", backgroundColor: "#f8fafc", height: "100%", boxSizing: "border-box", overflowY: "auto", fontFamily: "'Segoe UI', sans-serif" }}>
      
      {/* MODAL DE TAREAS URGENTES PENDIENTES */}
      {mostrarModalUrgentes && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, backdropFilter: "blur(3px)" }}>
          <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", width: "100%", maxWidth: "500px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)", overflow: "hidden", border: "1px solid #fecaca" }}>
            <div style={{ backgroundColor: "#fef2f2", padding: "18px 22px", borderBottom: "1px solid #fee2e2", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ backgroundColor: "#dc2626", color: "#ffffff", width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1.2rem", flexShrink: 0 }}>!</div>
              <div>
                <h3 style={{ margin: 0, color: "#991b1b", fontSize: "1rem", fontWeight: "700" }}>Atención: Tareas Urgentes Pendientes</h3>
                <span style={{ fontSize: "0.78rem", color: "#b91c1c", fontWeight: "400" }}>Hola {usuarioLogueado}, tienes {tareasUrgentesHoy.length} orden(es) con prioridad <strong>Urgente</strong> sin resolver.</span>
              </div>
            </div>
            <div style={{ padding: "18px 22px", maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {tareasUrgentesHoy.map((tarea) => {
                const { nombre } = obtenerNombreYTipoElemento(tarea);
                return (
                  <div key={tarea.id_reporte || tarea.id} style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", display: "flex", flexDirection: "column", gap: "3px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "#0f172a" }}>#{tarea.id_reporte || tarea.id} - <span style={{ fontWeight: "600" }}>{nombre}</span></span>
                      <span style={{ fontSize: "0.68rem", backgroundColor: "#fee2e2", color: "#dc2626", padding: "2px 8px", borderRadius: "4px", fontWeight: "700" }}>{tarea.prioridad}</span>
                    </div>
                    <span style={{ fontSize: "0.78rem", color: "#334155" }}><strong>Falla:</strong> {tarea.falla_presentada}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "14px 22px", backgroundColor: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setMostrarModalUrgentes(false)} style={{ backgroundColor: "#dc2626", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer" }}>Entendido, ir a resolver</button>
            </div>
          </div>
        </div>
      )}

      {/* CABECERA ESTANDARIZADA */}
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ color: "#0f172a", fontSize: "1.25rem", fontWeight: "700", margin: 0 }}>Resumen Global de Campo</h2>
        <div style={{ width: "40px", height: "3px", backgroundColor: "#16a34a", marginTop: "4px", marginBottom: "8px", borderRadius: "2px" }}></div>
        <p style={{ color: "#475569", fontSize: "0.85rem", margin: 0 }}>
          Gestión de reportes, incidencias y tareas de campo asignadas en la red para <strong>{usuarioLogueado}</strong>.
        </p>
      </div>

      {error && <div style={{ padding: "10px 14px", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "6px", marginBottom: "20px", fontSize: "0.85rem", fontWeight: "600" }}>{error}</div>}

      {/* TARJETAS DE MÉTRICAS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        <div style={{ backgroundColor: "#ffffff", padding: "18px", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #0284c7" }}>
          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Órdenes Asignadas</span>
          <h3 style={{ fontSize: "1.6rem", color: "#0f172a", fontWeight: "700", margin: "6px 0 0 0" }}>{totalAsignadas}</h3>
        </div>
        <div style={{ backgroundColor: "#ffffff", padding: "18px", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #16a34a" }}>
          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Completadas</span>
          <h3 style={{ fontSize: "1.6rem", color: "#16a34a", fontWeight: "700", margin: "6px 0 0 0" }}>{completadasTotal}</h3>
        </div>
        <div style={{ backgroundColor: "#ffffff", padding: "18px", borderRadius: "8px", border: "1px solid #e2e8f0", borderLeft: "4px solid #dc2626" }}>
          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Urgentes Pendientes</span>
          <h3 style={{ fontSize: "1.6rem", color: "#dc2626", fontWeight: "700", margin: "6px 0 0 0" }}>{urgentesPendientes}</h3>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y PESTAÑAS UNIFICADAS */}
      <div style={{ marginBottom: "16px", backgroundColor: "#ffffff", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#475569" }}>Buscador:</span>
          <input 
            type="text" 
            placeholder="Buscar por ID, cliente, NAP, poste, ONU o falla..."
            value={busquedaFiltro}
            onChange={(e) => setBusquedaFiltro(e.target.value)}
            style={{ flex: 1, padding: "7px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", outline: "none" }}
          />
          {busquedaFiltro && (
            <button
              onClick={() => setBusquedaFiltro("")}
              style={{ backgroundColor: "#e2e8f0", color: "#334155", border: "none", padding: "7px 12px", borderRadius: "6px", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer" }}
            >
              Limpiar
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setPestañaActiva("activas")}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              fontWeight: "600",
              fontSize: "0.82rem",
              cursor: "pointer",
              backgroundColor: pestañaActiva === "activas" ? "#16a34a" : "#010203",
              color: "#ffffff"
            }}
          >
            PENDIENTES ({reportesActivos.length})
          </button>
          <button
            onClick={() => setPestañaActiva("archivadas")}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "none",
              fontWeight: "600",
              fontSize: "0.82rem",
              cursor: "pointer",
              backgroundColor: pestañaActiva === "archivadas" ? "#16a34a" : "#010203",
              color: "#ffffff"
            }}
          >
            RESUELTAS ({reportesArchivados.length})
          </button>
        </div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
        {cargando ? (
          <p style={{ textAlign: "center", color: "#64748b", padding: "28px", fontSize: "0.85rem" }}>Cargando órdenes de campo...</p>
        ) : listaAMostrar.length === 0 ? (
          <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "0.85rem" }}>
            No se encontraron órdenes de campo bajo este criterio.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem", color: "#1e293b" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", color: "#64748b", borderBottom: "1px solid #e2e8f0", fontSize: "0.78rem", textTransform: "uppercase" }}>
                  <th style={{ padding: "12px 16px" }}>ID</th>
                  <th style={{ padding: "12px 16px" }}>Dispositivo</th>
                  <th style={{ padding: "12px 16px" }}>Falla Presentada</th>
                  <th style={{ padding: "12px 16px" }}>Prioridad</th>
                  <th style={{ padding: "12px 16px", textAlign: "center" }}>Estatus</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listaAMostrar.map((rep) => {
                  const idReporteReal = rep.id_reporte || rep.id;
                  const { etiquetaTipo, nombre } = obtenerNombreYTipoElemento(rep);
                  const vecesReportado = obtenerContadorReportesElemento(rep);
                  const estaCompletado = rep.estatus === false || rep.estatus === 0 || rep.estatus === "false" || rep.estatus === null;
                  
                  return (
                    <tr key={idReporteReal} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px", fontWeight: "700", color: "#0f172a" }}>#{idReporteReal}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: "700", fontSize: "0.68rem", color: "#16a34a", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                          {etiquetaTipo}
                        </div>
                        <div style={{ fontWeight: "600", color: "#0f172a", fontSize: "0.85rem" }}>
                          {nombre}
                        </div>
                        {vecesReportado > 1 && (
                          <span style={{ display: "block", fontSize: "0.68rem", color: "#dc2626", fontWeight: "700", marginTop: "2px" }}>
                            {vecesReportado} reportes acumulados
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", color: "#0f172a", fontWeight: "600" }}>{rep.falla_presentada}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ padding: "3px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "700", backgroundColor: rep.prioridad === "Urgente" ? "#fee2e2" : "#f1f5f9", color: rep.prioridad === "Urgente" ? "#dc2626" : "#475569" }}>
                          {rep.prioridad || "Ordinaria"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: "700", backgroundColor: estaCompletado ? "#dcfce7" : "#fef3c7", color: estaCompletado ? "#16a34a" : "#b45309" }}>
                          {estaCompletado ? "Completado" : "Pendiente"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                          <button
                            onClick={() => ubicarEnMapa(rep)}
                            style={{ padding: "5px 10px", backgroundColor: "#0284c7", color: "#ffffff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600", whiteSpace: "nowrap" }}
                          >
                            Ubicar Pin
                          </button>

                          <button
                            onClick={() => setReporteDetalles(rep)}
                            style={{ padding: "5px 10px", backgroundColor: "#475569", color: "#ffffff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600", whiteSpace: "nowrap" }}
                          >
                            Detalles
                          </button>

                          {!estaCompletado && (
                            <button
                              onClick={() => {
                                setReporteResolver(rep);
                                setComentariosSolucion(rep.comentarios_solucion || "");
                              }}
                              style={{ padding: "5px 10px", backgroundColor: "#16a34a", color: "#ffffff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600", whiteSpace: "nowrap" }}
                            >
                              Resolver
                            </button>
                          )}

                          {estaCompletado && (
                            <button
                              onClick={() => generarYGuardarPDFAutomatico(rep)}
                              style={{ padding: "5px 10px",  backgroundColor: "#f32011", color: "#ffffff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600", whiteSpace: "nowrap" }}
                            >
                              PDF
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: FICHA DE DETALLES TÉCNICOS */}
      {reporteDetalles !== null && (() => {
        const { esOnu, esNap, esPoste, esCliente } = obtenerNombreYTipoElemento(reporteDetalles);
        const napAsignadaPoste = reporteDetalles.poste?.naps?.[0]?.codigo_nap || reporteDetalles.nap?.codigo_nap || null;
        const localidadPosteStr = reporteDetalles.poste?.localidad || reporteDetalles.poste?.ubicacion || reporteDetalles.poste?.referencia || "MX-B1";
        const vecesElemento = obtenerContadorReportesElemento(reporteDetalles);

        return (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000 }}>
            <div style={{ backgroundColor: "#ffffff", padding: "24px 28px", borderRadius: "10px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", marginBottom: "14px" }}>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.05rem", fontWeight: "700" }}>
                  Ficha Técnica - Incidencia #{reporteDetalles.id_reporte || reporteDetalles.id}
                </h3>
                <button onClick={() => setReporteDetalles(null)} style={{ background: "none", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#64748b", fontWeight: "700" }}>✕</button>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem", color: "#1e293b" }}>
                <div><strong>Falla Presentada:</strong> {reporteDetalles.falla_presentada}</div>
                <div><strong>Prioridad:</strong> {reporteDetalles.prioridad || "Ordinaria"}</div>
                <div><strong>Historial de Incidencias:</strong> <span style={{ fontWeight: "700", color: vecesElemento > 1 ? "#dc2626" : "#16a34a" }}>Este dispositivo registra {vecesElemento} reporte(s) en total.</span></div>
                <div><strong>Técnico Asignado:</strong> {reporteDetalles.tecnico_asignado || usuarioLogueado}</div>
                
                <div style={{ marginTop: "4px", padding: "12px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ fontWeight: "700", marginBottom: "4px", color: "#0369a1" }}>
                    {esOnu ? "Información de la ONU:" : esCliente ? "Información del Cliente:" : esNap ? "Información de la Caja NAP:" : "Información del Poste:"}
                  </div>
                  
                  {esOnu && (
                    <>
                      <div><strong>Código ONU:</strong> {reporteDetalles.onu?.codigo || reporteDetalles.cliente?.cliente_ref || "N/A"}</div>
                      <div><strong>N° Serie:</strong> {reporteDetalles.onu?.no_serie || reporteDetalles.cliente?.contacto || "N/A"}</div>
                      <div><strong>Localidad / Barrio:</strong> {reporteDetalles.onu?.localidad || reporteDetalles.cliente?.localidad || "MX-B1"}</div>
                    </>
                  )}

                  {esCliente && (
                    <>
                      <div><strong>Nombre Completo:</strong> {reporteDetalles.cliente?.nombre_completo || reporteDetalles.cliente?.cliente_ref || "N/A"}</div>
                      <div><strong>Teléfono:</strong> {reporteDetalles.cliente?.contacto || "N/A"}</div>
                      <div><strong>NAP Conectada:</strong> {reporteDetalles.nap?.codigo_nap || reporteDetalles.cliente?.nap?.codigo_nap || "Sin NAP asignada"}</div>
                      <div><strong>Poste Conectado:</strong> {reporteDetalles.poste?.codigo || reporteDetalles.nap?.poste?.codigo || reporteDetalles.cliente?.nap?.poste?.codigo || "Sin poste asignado"}</div>
                    </>
                  )}

                  {esNap && (
                    <>
                      <div><strong>Código NAP:</strong> {reporteDetalles.nap?.codigo_nap || "N/A"}</div>
                      <div><strong>Capacidad de Puertos:</strong> {reporteDetalles.nap?.capacidad_puertos || reporteDetalles.nap?.puertos_totales || "8"}</div>
                      <div><strong>Poste Montado:</strong> {reporteDetalles.poste?.codigo || reporteDetalles.nap?.poste?.codigo || "N/A"}</div>
                    </>
                  )}

                  {esPoste && (
                    <>
                      <div><strong>Código de Poste:</strong> {reporteDetalles.poste?.codigo || "N/A"}</div>
                      {napAsignadaPoste ? (
                        <div><strong>Caja NAP Asignada:</strong> {napAsignadaPoste}</div>
                      ) : (
                        <div><strong>Localidad / Barrio:</strong> {localidadPosteStr}</div>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <strong style={{ display: "block", marginBottom: "4px" }}>Descripción Adicional:</strong>
                  <p style={{ backgroundColor: "#f8fafc", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0", margin: 0 }}>
                    {reporteDetalles.descripcion || "Sin descripción detallada."}
                  </p>
                </div>

                {reporteDetalles.comentarios_solucion && (
                  <div>
                    <strong style={{ display: "block", marginBottom: "4px", color: "#16a34a" }}>Solución Aplicada:</strong>
                    <p style={{ backgroundColor: "#f0fdf4", padding: "10px", borderRadius: "6px", border: "1px solid #bbf7d0", margin: 0 }}>
                      {reporteDetalles.comentarios_solucion}
                    </p>
                  </div>
                )}
              </div>

              <div style={{ textAlign: "right", marginTop: "18px" }}>
                <button onClick={() => setReporteDetalles(null)} style={{ padding: "8px 16px", backgroundColor: "#e2e8f0", color: "#334155", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "0.82rem" }}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 2: RESOLVER ASIGNACIÓN */}
      {reporteResolver !== null && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000 }}>
          <div style={{ backgroundColor: "#ffffff", padding: "24px 28px", borderRadius: "10px", width: "100%", maxWidth: "460px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.05rem", fontWeight: "700" }}>
                Resolver Asignación #{reporteResolver.id_reporte || reporteResolver.id}
              </h3>
              <button onClick={() => setReporteResolver(null)} style={{ background: "none", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#64748b", fontWeight: "700" }}>✕</button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.85rem", color: "#1e293b" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#334155" }}>
                Comentarios de Solución y Trabajos Realizados:
              </label>
              <textarea 
                rows="4"
                placeholder="Describe brevemente los trabajos realizados en campo..."
                value={comentariosSolucion}
                onChange={(e) => setComentariosSolucion(e.target.value)}
                style={{ width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", boxSizing: "border-box", outline: "none", resize: "vertical" }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                <button
                  type="button"
                  onClick={() => setReporteResolver(null)}
                  style={{ padding: "9px 16px", backgroundColor: "#e2e8f0", color: "#334155", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "0.82rem" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleResolverIncidencia(reporteResolver)}
                  disabled={guardando}
                  style={{ padding: "9px 20px", backgroundColor: "#16a34a", color: "#ffffff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "700", fontSize: "0.82rem" }}
                >
                  {guardando ? "Guardando..." : "Marcar Completado y Generar PDF"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST FLOTANTE ESTANDARIZADO */}
      {notificacion.visible && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          backgroundColor: notificacion.tipo === "error" ? "#dc2626" : "#16a34a",
          color: "#ffffff",
          padding: "12px 20px",
          borderRadius: "8px",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          zIndex: 9999,
          fontSize: "0.85rem",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span>{notificacion.mensaje}</span>
        </div>
      )}

    </div>
  );
}

export default SoporteTecnico;
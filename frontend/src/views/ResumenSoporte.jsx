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
  const [evidenciaPreview, setEvidenciaPreview] = useState(null);
  
  const [tareasUrgentesHoy, setTareasUrgentesHoy] = useState([]);
  const [mostrarModalUrgentes, setMostrarModalUrgentes] = useState(false);
  
  const [pestañaActiva, setPestañaActiva] = useState("activas");
  const [busquedaFiltro, setBusquedaFiltro] = useState("");

  const navigate = useNavigate();

  const usuarioObj = JSON.parse(localStorage.getItem("usuario") || "{}");
  const usuarioLogueado = usuarioObj.nombre_completo || usuarioObj.nombre || localStorage.getItem("nombreUsuario") || "Técnico";

  useEffect(() => {
    cargarReportesTecnico();
  }, []);

  const cargarReportesTecnico = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:3000/api/red/reportes", {
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
    const idCli = repActual.cliente_id || repActual.cliente?.id || repActual.cliente?.id_cliente;
    const idNap = repActual.nap_id || repActual.nap?.id || repActual.nap?.id_nap;
    const idPoste = repActual.poste_id || repActual.poste?.id || repActual.poste?.poste_id;

    const coincidencias = reportes.filter(r => {
      const rCli = r.cliente_id || r.cliente?.id || r.cliente?.id_cliente;
      const rNap = r.nap_id || r.nap?.id || r.nap?.id_nap;
      const rPoste = r.poste_id || r.poste?.id || r.poste?.poste_id;

      if (idCli && rCli === idCli) return true;
      if (idNap && rNap === idNap) return true;
      if (idPoste && rPoste === idPoste) return true;
      return false;
    });

    return coincidencias.length;
  };

  const reportesFiltradosBusqueda = misReportes.filter(rep => {
    const texto = busquedaFiltro.toLowerCase();
    const idStr = String(rep.id_reporte || rep.id || "").toLowerCase();
    const fallaStr = (rep.falla_presentada || "").toLowerCase();
    const nombreElem = (rep.cliente?.nombre_completo || rep.nap?.codigo_nap || rep.poste?.codigo || "").toLowerCase();
    return idStr.includes(texto) || fallaStr.includes(texto) || nombreElem.includes(texto);
  });

  const reportesOrdenados = [...reportesFiltradosBusqueda].sort((a, b) => {
    if (a.estatus === b.estatus) {
      if (a.prioridad === "Urgente" && b.prioridad !== "Urgente") return -1;
      if (a.prioridad !== "Urgente" && b.prioridad === "Urgente") return 1;
      return 0;
    }
    return a.estatus ? -1 : 1;
  });

  const reportesActivos = reportesOrdenados.filter(r => r.estatus === true || r.estatus === 1 || r.estatus === "true");
  const reportesArchivados = reportesOrdenados.filter(r => r.estatus === false || r.estatus === 0 || r.estatus === "false" || r.estatus === null);

  const totalAsignadas = misReportes.length;
  const completadasHoy = reportesArchivados.length;
  const urgentesPendientes = misReportes.filter(rep => {
    const esPendiente = rep.estatus === true || rep.estatus === 1 || rep.estatus === "true";
    return esPendiente && (rep.prioridad || "").toLowerCase() === "urgente";
  }).length;

  const ubicarEnMapa = (rep) => {
    const lat = rep.latitud || rep.cliente?.latitud || rep.nap?.latitud || rep.poste?.latitud;
    const lng = rep.longitud || rep.cliente?.longitud || rep.nap?.longitud || rep.poste?.longitud;
    
    const tipoStr = (rep.tipo_elemento || (rep.cliente_id ? 'cliente' : rep.nap_id ? 'nap' : 'poste')).toLowerCase();
    let tipoParam = "cliente";
    if (tipoStr.includes("nap")) tipoParam = "nap";
    else if (tipoStr.includes("poste")) tipoParam = "poste";
    else if (tipoStr.includes("onu")) tipoParam = "cliente";

    const idBuscado = rep.id_elemento || rep.cliente_id || rep.nap_id || rep.poste_id || 
                      rep.cliente?.id || rep.nap?.id || rep.poste?.id || 
                      rep.cliente?.id_cliente || rep.nap?.id_nap || rep.poste?.poste_id;

    if (lat && lng) {
      if (idBuscado) {
        navigate(`/mapa?lat=${lat}&lng=${lng}&tipo=${tipoParam}&id=${idBuscado}&zoom=18`);
      } else {
        navigate(`/mapa?lat=${lat}&lng=${lng}&zoom=18`);
      }
    } else {
      alert("Este elemento no cuenta con coordenadas geográficas registradas.");
    }
  };

  const generarYGuardarPDFAutomatico = (rep) => {
    const ventana = window.open("", "_blank");
    if (!ventana) {
      alert("El navegador bloqueó la ventana emergente. Permite los popups para este sitio.");
      return;
    }

    const fechaCierreFormateada = new Date(rep.fecha_resolucion || Date.now()).toLocaleString();
    const totalReportesVeces = obtenerContadorReportesElemento(rep);

    const esCliente = !!rep.cliente_id || !!rep.cliente || (!rep.nap_id && !rep.poste_id && !rep.nap && !rep.poste);
    const esNap = !!rep.nap_id || (rep.nap && !rep.cliente_id);
    const esPoste = !!rep.poste_id || (rep.poste && !rep.cliente_id && !rep.nap_id);

    let infoHtml = "";
    if (esCliente || rep.cliente) {
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
      const puertoNap = rep.nap?.puertos_totales || rep.nap?.puertos || "N/A";
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

          .pdf-root .evidence-container { text-align: center; margin-top: 10px; background: #f8fafc; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; }
          .pdf-root .evidence-img { max-width: 100%; max-height: 330px; width: auto; height: auto; border-radius: 6px; border: 1px solid #94a3b8; object-fit: contain; }

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
        alert("No se pudo generar el PDF del reporte.");
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
      const response = await fetch(`http://localhost:3000/api/red/reportes/${idTarget}`, {
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
      
      alert("Incidencia marcada como resuelta y documento PDF generado.");
      setReporteResolver(null);
      setComentariosSolucion("");
      cargarReportesTecnico();
    } catch (err) {
      console.error("Error al guardar solución:", err);
      alert(`Ocurrió un error al guardar en el servidor: ${err.message}`);
    } finally {
      setGuardando(false);
    }
  };

  const generarReportePDF = (rep) => {
    generarYGuardarPDFAutomatico(rep);
  };

  const listaAMostrar = pestañaActiva === "activas" ? reportesActivos : reportesArchivados;

  return (
    <div style={{ padding: "30px", fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif", maxWidth: "1280px", margin: "0 auto", color: "#000000" }}>
      
      {/* MODAL DE TAREAS URGENTES PENDIENTES */}
      {mostrarModalUrgentes && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, backdropFilter: "blur(3px)" }}>
          <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", width: "100%", maxWidth: "500px", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15)", overflow: "hidden", border: "1px solid #fecaca" }}>
            <div style={{ backgroundColor: "#fef2f2", padding: "18px 22px", borderBottom: "1px solid #fee2e2", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ backgroundColor: "#ef4444", color: "#ffffff", width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "1.2rem", flexShrink: 0 }}>!</div>
              <div>
                <h3 style={{ margin: 0, color: "#991b1b", fontSize: "1rem", fontWeight: "700" }}>Atención: Tareas Urgentes Pendientes</h3>
                <span style={{ fontSize: "0.78rem", color: "#b91c1c", fontWeight: "400" }}>Hola {usuarioLogueado}, tienes {tareasUrgentesHoy.length} orden(es) con prioridad <strong>Urgente</strong> sin resolver.</span>
              </div>
            </div>
            <div style={{ padding: "18px 22px", maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {tareasUrgentesHoy.map((tarea) => {
                const nombreElem = tarea.cliente?.nombre_completo || tarea.nap?.codigo_nap || tarea.poste?.codigo || "Elemento de red";
                return (
                  <div key={tarea.id_reporte || tarea.id} style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", display: "flex", flexDirection: "column", gap: "3px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "#000000" }}>#{tarea.id_reporte || tarea.id} - <span style={{ fontWeight: "400" }}>{nombreElem}</span></span>
                      <span style={{ fontSize: "0.68rem", backgroundColor: "#fee2e2", color: "#dc2626", padding: "2px 6px", borderRadius: "10px", fontWeight: "600" }}>{tarea.prioridad}</span>
                    </div>
                    <span style={{ fontSize: "0.78rem", color: "#000000" }}><strong style={{ fontWeight: "700" }}>Falla:</strong> {tarea.falla_presentada}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "14px 22px", backgroundColor: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setMostrarModalUrgentes(false)} style={{ backgroundColor: "#b91c1c", color: "#ffffff", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "0.82rem", fontWeight: "600", cursor: "pointer" }}>Entendido, ir a resolver</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ color: "#000000", fontSize: "1.4rem", fontWeight: "700", margin: "0 0 6px 0" }}>Resumen Global de Campo</h2>
        <p style={{ color: "#000000", fontSize: "0.9rem", margin: 0, fontWeight: "400" }}>Gestión de reportes, incidencias y tareas de campo asignadas en la red para <strong>{usuarioLogueado}</strong>.</p>
      </div>

      {error && <div style={{ padding: "10px 14px", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "6px", marginBottom: "20px", fontSize: "0.85rem", fontWeight: "500" }}>{error}</div>}

      {/* MÉTRICAS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ backgroundColor: "#ffffff", padding: "18px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0", borderLeft: "4px solid #b91c1c" }}>
          <span style={{ fontSize: "0.7rem", color: "#000000", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Órdenes Asignadas</span>
          <h3 style={{ fontSize: "1.6rem", color: "#000000", fontWeight: "700", margin: "8px 0 0 0" }}>{totalAsignadas}</h3>
        </div>
        <div style={{ backgroundColor: "#ffffff", padding: "18px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0", borderLeft: "4px solid #16a34a" }}>
          <span style={{ fontSize: "0.7rem", color: "#000000", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Completadas</span>
          <h3 style={{ fontSize: "1.6rem", color: "#000000", fontWeight: "700", margin: "8px 0 0 0" }}>{completadasHoy}</h3>
        </div>
        <div style={{ backgroundColor: "#ffffff", padding: "18px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0", borderLeft: "4px solid #dc2626" }}>
          <span style={{ fontSize: "0.7rem", color: "#000000", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>Urgentes / Pendientes</span>
          <h3 style={{ fontSize: "1.6rem", color: "#000000", fontWeight: "700", margin: "8px 0 0 0" }}>{urgentesPendientes}</h3>
        </div>
      </div>

      {/* TABLA PRINCIPAL CON BUSCADOR RÁPIDO */}
      <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", flexWrap: "wrap", gap: "10px" }}>
          <h4 style={{ color: "#000000", margin: 0, fontSize: "1.05rem", fontWeight: "700" }}>{pestañaActiva === "activas" ? "Incidencias Activas en Campo" : "Archivo de Incidencias Resueltas"}</h4>
          
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input 
              type="text" 
              placeholder="Buscar por ID, cliente, NAP o falla..."
              value={busquedaFiltro}
              onChange={(e) => setBusquedaFiltro(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", width: "240px", outline: "none" }}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setPestañaActiva("activas")} style={{ padding: "6px 14px", borderRadius: "6px", border: "none", fontWeight: "600", fontSize: "0.8rem", cursor: "pointer", backgroundColor: pestañaActiva === "activas" ? "#b91c1c" : "#f1f5f9", color: pestañaActiva === "activas" ? "#fff" : "#000000" }}>Pendientes ({reportesActivos.length})</button>
              <button onClick={() => setPestañaActiva("archivadas")} style={{ padding: "6px 14px", borderRadius: "6px", border: "none", fontWeight: "600", fontSize: "0.8rem", cursor: "pointer", backgroundColor: pestañaActiva === "archivadas" ? "#16a34a" : "#f1f5f9", color: pestañaActiva === "archivadas" ? "#fff" : "#000000" }}>Resueltas ({reportesArchivados.length})</button>
            </div>
          </div>
        </div>

        {cargando ? (
          <p style={{ textAlign: "center", color: "#000000", padding: "20px", fontSize: "0.85rem", fontWeight: "400" }}>Cargando órdenes de campo...</p>
        ) : listaAMostrar.length === 0 ? (
          <div style={{ padding: "35px", textAlign: "center", color: "#000000", fontSize: "0.85rem", border: "2px dashed #e2e8f0", borderRadius: "6px", fontWeight: "400" }}>No se encontraron órdenes de campo con los criterios de búsqueda.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", color: "#000000", borderBottom: "1px solid #e2e8f0", fontWeight: "700" }}>
                  <th style={{ padding: "10px 12px" }}>ID</th>
                  <th style={{ padding: "10px 12px" }}>Tipo / Elemento</th>
                  <th style={{ padding: "10px 12px" }}>Falla Presentada</th>
                  <th style={{ padding: "10px 12px" }}>Prioridad</th>
                  {pestañaActiva === "activas" && <th style={{ padding: "10px 12px", textAlign: "center" }}>Detalles</th>}
                  {pestañaActiva === "activas" && <th style={{ padding: "10px 12px", textAlign: "center" }}>Acción de Resolución</th>}
                  <th style={{ padding: "10px 12px", textAlign: "center" }}>Ubicación</th>
                  {pestañaActiva === "archivadas" && <th style={{ padding: "10px 12px", textAlign: "center" }}>Documento</th>}
                  <th style={{ padding: "10px 12px", textAlign: "center" }}>Estatus</th>
                </tr>
              </thead>
              <tbody>
                {listaAMostrar.map((rep) => {
                  const idReporteReal = rep.id_reporte || rep.id;
                  const nombreElemento = rep.cliente?.nombre_completo || rep.nap?.codigo_nap || rep.poste?.codigo || "Elemento de red";
                  const vecesReportado = obtenerContadorReportesElemento(rep);
                  
                  return (
                    <tr key={idReporteReal} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px", fontWeight: "700", color: "#000000" }}>#{idReporteReal}</td>
                      <td style={{ padding: "12px", fontWeight: "400", color: "#000000" }}>
                        {nombreElemento}
                        {vecesReportado > 1 && (
                          <span style={{ display: "block", fontSize: "0.68rem", color: "#dc2626", fontWeight: "700", marginTop: "2px" }}>
                            {vecesReportado} - Reportes Presentados
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px", color: "#000000", fontWeight: "400" }}>{rep.falla_presentada}</td>
                      <td style={{ padding: "12px" }}>
                        <span style={{ padding: "3px 8px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: "600", backgroundColor: rep.prioridad === "Urgente" ? "#fee2e2" : "#f1f5f9", color: rep.prioridad === "Urgente" ? "#dc2626" : "#000000" }}>{rep.prioridad || "Ordinaria"}</span>
                      </td>
                      
                      {/* BOTÓN DETALLES (AZUL) */}
                      {pestañaActiva === "activas" && (
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <button onClick={() => setReporteDetalles(rep)} style={{ padding: "5px 10px", backgroundColor: "#0284c7", color: "#ffffff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600" }}>Detalles</button>
                        </td>
                      )}

                      {/* BOTÓN RESOLVER ASIGNACIÓN (ROJO / PELIGRO / ACCIÓN PENDIENTE) */}
                      {pestañaActiva === "activas" && (
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <button onClick={() => { setReporteResolver(rep); setComentariosSolucion(rep.comentarios_solucion || ""); }} style={{ padding: "5px 10px", backgroundColor: "#b91c1c", color: "#ffffff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600" }}>
                            Resolver Asignación
                          </button>
                        </td>
                      )}

                      {/* UBICAR PIN (ROJO) */}
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <button onClick={() => ubicarEnMapa(rep)} style={{ padding: "5px 10px", backgroundColor: "#dc2626", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600" }}>Ubicar Pin</button>
                      </td>
                      
                      {/* PDF (ROJO) */}
                      {pestañaActiva === "archivadas" && (
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <button onClick={() => generarReportePDF(rep)} style={{ padding: "5px 10px", backgroundColor: "#b91c1c", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem", fontWeight: "600" }}>PDF</button>
                        </td>
                      )}

                      <td style={{ padding: "12px", textAlign: "center" }}>
                        <span style={{ padding: "3px 8px", borderRadius: "10px", fontSize: "0.72rem", fontWeight: "600", backgroundColor: (rep.estatus === false || rep.estatus === 0 || rep.estatus === "false") ? "#dcfce7" : "#fef9c3", color: (rep.estatus === false || rep.estatus === 0 || rep.estatus === "false") ? "#15803d" : "#854d0e" }}>
                          {(rep.estatus === false || rep.estatus === 0 || rep.estatus === "false") ? "Completado" : "Pendiente"}
                        </span>
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
        const esCliente = !!reporteDetalles.cliente_id || !!reporteDetalles.cliente || (!reporteDetalles.nap_id && !reporteDetalles.poste_id && !reporteDetalles.nap && !reporteDetalles.poste);
        const esNap = !!reporteDetalles.nap_id || (reporteDetalles.nap && !reporteDetalles.cliente_id);
        const esPoste = !!reporteDetalles.poste_id || (reporteDetalles.poste && !reporteDetalles.cliente_id && !reporteDetalles.nap_id);

        const napAsignadaPoste = reporteDetalles.poste?.naps?.[0]?.codigo_nap || reporteDetalles.nap?.codigo_nap || null;
        const localidadPosteStr = reporteDetalles.poste?.localidad || reporteDetalles.poste?.ubicacion || reporteDetalles.poste?.referencia || "MX-B1 - Santiaguito Maxda (Barrio 1)";
        const vecesElemento = obtenerContadorReportesElemento(reporteDetalles);

        return (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(2px)" }}>
            <div style={{ backgroundColor: "#fff", padding: "22px", borderRadius: "10px", width: "100%", maxWidth: "480px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", marginBottom: "14px" }}>
                <h3 style={{ margin: 0, color: "#000000", fontSize: "1.1rem", fontWeight: "700" }}>Ficha Técnica - Incidencia #{reporteDetalles.id_reporte || reporteDetalles.id}</h3>
                <button onClick={() => setReporteDetalles(null)} style={{ background: "none", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#000000", fontWeight: "600" }}>✕</button>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem", color: "#000000" }}>
                <div><strong style={{ fontWeight: "700" }}>Falla Presentada:</strong> <span style={{ fontWeight: "400" }}>{reporteDetalles.falla_presentada}</span></div>
                <div><strong style={{ fontWeight: "700" }}>Prioridad:</strong> <span style={{ fontWeight: "400" }}>{reporteDetalles.prioridad || "Ordinaria"}</span></div>
                <div><strong style={{ fontWeight: "700" }}>Historial de Incidencias:</strong> <span style={{ fontWeight: "700", color: vecesElemento > 1 ? "#dc2626" : "#16a34a" }}>Este dispositivo registra {vecesElemento} reporte(s) en total.</span></div>
                <div><strong style={{ fontWeight: "700" }}>Técnico Asignado:</strong> <span style={{ fontWeight: "400" }}>{reporteDetalles.tecnico_asignado || usuarioLogueado}</span></div>
                
                <div style={{ marginTop: "4px", padding: "10px 12px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontWeight: "700", marginBottom: "5px", color: "#000000" }}>
                    {esCliente ? "Información del Cliente:" : esNap ? "Información de la Caja NAP:" : "Información del Poste:"}
                  </div>
                  
                  {esCliente && (
                    <>
                      <div><strong style={{ fontWeight: "700" }}>Nombre Completo:</strong> <span style={{ fontWeight: "400" }}>{reporteDetalles.cliente?.nombre_completo || reporteDetalles.cliente?.cliente_ref || reporteDetalles.nombre_elemento || "N/A"}</span></div>
                      <div><strong style={{ fontWeight: "700" }}>Teléfono:</strong> <span style={{ fontWeight: "400" }}>{reporteDetalles.cliente?.contacto || "N/A"}</span></div>
                      <div><strong style={{ fontWeight: "700" }}>NAP Conectada:</strong> <span style={{ fontWeight: "400" }}>{reporteDetalles.nap?.codigo_nap || reporteDetalles.cliente?.nap?.codigo_nap || "Sin NAP asignada"}</span></div>
                      <div><strong style={{ fontWeight: "700" }}>Poste Conectado:</strong> <span style={{ fontWeight: "400" }}>{reporteDetalles.poste?.codigo || reporteDetalles.nap?.poste?.codigo || reporteDetalles.cliente?.nap?.poste?.codigo || "Sin poste asignado"}</span></div>
                    </>
                  )}

                  {esNap && (
                    <>
                      <div><strong style={{ fontWeight: "700" }}>Código NAP:</strong> <span style={{ fontWeight: "400" }}>{reporteDetalles.nap?.codigo_nap || reporteDetalles.nombre_elemento || "N/A"}</span></div>
                      <div><strong style={{ fontWeight: "700" }}>Puertos Totales:</strong> <span style={{ fontWeight: "400" }}>{reporteDetalles.nap?.puertos_totales || reporteDetalles.nap?.puertos || "N/A"}</span></div>
                      
                      <div style={{ marginTop: "8px", borderTop: "1px dashed #cbd5e1", paddingTop: "6px" }}>
                        <span style={{ fontWeight: "700", display: "block", marginBottom: "4px", color: "#334155" }}>Estado de Puertos en NAP:</span>
                        {reporteDetalles.nap?.puertos_detalle && Array.isArray(reporteDetalles.nap.puertos_detalle) ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "100px", overflowY: "auto" }}>
                            {reporteDetalles.nap.puertos_detalle.map((p, idx) => (
                              <div key={idx} style={{ fontSize: "0.78rem", display: "flex", justifyContent: "space-between", background: p.disponible ? "#f0fdf4" : "#fef2f2", padding: "3px 6px", borderRadius: "4px" }}>
                                <span>Puerto #{p.numero || idx + 1}</span>
                                <span style={{ fontWeight: "600", color: p.disponible ? "#16a34a" : "#dc2626" }}>
                                  {p.disponible ? "Disponible" : `Ocupado por: ${p.cliente_nombre || p.suscriptor || "Cliente"}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontStyle: "italic", color: "#64748b", fontSize: "0.78rem" }}>Puertos totales disponibles en infraestructura.</span>
                        )}
                      </div>

                      <div style={{ marginTop: "6px" }}><strong style={{ fontWeight: "700" }}>Poste Montado:</strong> <span style={{ fontWeight: "400" }}>{reporteDetalles.poste?.codigo || reporteDetalles.nap?.poste?.codigo || "N/A"}</span></div>
                    </>
                  )}

                  {esPoste && (
                    <>
                      <div><strong style={{ fontWeight: "700" }}>Código de Poste:</strong> <span style={{ fontWeight: "400" }}>{reporteDetalles.poste?.codigo || reporteDetalles.nombre_elemento || "N/A"}</span></div>
                      {napAsignadaPoste ? (
                        <div><strong style={{ fontWeight: "700" }}>Caja NAP Asignada:</strong> <span style={{ fontWeight: "400" }}>{napAsignadaPoste}</span></div>
                      ) : (
                        <div><strong style={{ fontWeight: "700" }}>Localidad / Barrio:</strong> <span style={{ fontWeight: "400" }}>{localidadPosteStr}</span></div>
                      )}
                    </>
                  )}
                </div>

                <div>
                  <strong style={{ display: "block", marginBottom: "3px", color: "#000000", fontWeight: "700" }}>Descripción Adicional:</strong>
                  <p style={{ backgroundColor: "#f8fafc", padding: "8px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", margin: 0, color: "#000000", fontWeight: "400" }}>{reporteDetalles.descripcion || "Sin descripción detallada."}</p>
                </div>
              </div>

              <div style={{ textAlign: "right", marginTop: "18px" }}>
                <button onClick={() => setReporteDetalles(null)} style={{ padding: "6px 14px", backgroundColor: "#64748b", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "0.8rem" }}>Cerrar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 2: RESOLVER ASIGNACIÓN (BOTÓN DE ÉXITO VERDE) */}
      {reporteResolver !== null && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(2px)" }}>
          <div style={{ backgroundColor: "#fff", padding: "22px", borderRadius: "10px", width: "100%", maxWidth: "460px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px", marginBottom: "14px" }}>
              <h3 style={{ margin: 0, color: "#000000", fontSize: "1.1rem", fontWeight: "700" }}>Resolver Asignación #{reporteResolver.id_reporte || reporteResolver.id}</h3>
              <button onClick={() => setReporteResolver(null)} style={{ background: "none", border: "none", fontSize: "1.1rem", cursor: "pointer", color: "#000000", fontWeight: "600" }}>✕</button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem", color: "#000000" }}>
              <div style={{ padding: "2px 0" }}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#000000", marginBottom: "5px" }}>Comentarios de Solución (Texto breve):</label>
                <textarea 
                  rows="4"
                  placeholder="Describe brevemente los trabajos realizados..."
                  value={comentariosSolucion}
                  onChange={(e) => setComentariosSolucion(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem", boxSizing: "border-box", marginBottom: "14px", color: "#000000", fontWeight: "400" }}
                />

                {/* BOTÓN VERDE DE ÉXITO */}
                <button
                  onClick={() => handleResolverIncidencia(reporteResolver)}
                  disabled={guardando}
                  style={{ width: "100%", padding: "10px", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "700", fontSize: "0.85rem" }}
                >
                  {guardando ? "Guardando..." : "✔ Marcar como Hecho"}
                </button>
              </div>
            </div>

            <div style={{ textAlign: "right", marginTop: "18px" }}>
              <button onClick={() => setReporteResolver(null)} style={{ padding: "6px 14px", backgroundColor: "#64748b", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "0.8rem" }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default SoporteTecnico;
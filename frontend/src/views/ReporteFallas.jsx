import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import html2pdf from "html2pdf.js";

function ReporteFallas() {
  const [searchParams] = useSearchParams(); 
  const filtroInicial = searchParams.get('filtro') || 'PENDIENTES';
  const [pestanaActiva, setPestanaActiva] = useState("consultar");
  const [filtroEstatus, setFiltroEstatus] = useState(filtroInicial); 
  const [reportes, setReportes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [naps, setNaps] = useState([]);
  const [postes, setPostes] = useState([]);
  const [tecnicosSoporte, setTecnicosSoporte] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  
  const [toastMensaje, setToastMensaje] = useState("");

  const [idReporteEditando, setIdReporteEditando] = useState(null);
  const [reporteAEliminar, setReporteAEliminar] = useState(null);

  const [nuevoReporte, setNuevoReporte] = useState({
    tipo_elemento: "cliente",
    id_elemento: "",
    nombre_elemento_seleccionado: "",
    falla_presentada: "Atenuación alta / Pérdida de señal (ONU)",
    otra_falla: "",
    prioridad: "Ordinaria",
    descripcion: "",
    tecnico_asignado: ""
  });

  useEffect(() => {
    const filtroUrl = searchParams.get('filtro');
    if (filtroUrl) {
      setFiltroEstatus(filtroUrl.toUpperCase());
    }
  }, [searchParams]);

  const [busquedaElemento, setBusquedaElemento] = useState("");
  const [mostrarDropdownElemento, setMostrarDropdownElemento] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    cargarDatosReales();
  }, []);

  const mostrarToast = (mensaje) => {
    setToastMensaje(mensaje);
    setTimeout(() => {
      setToastMensaje("");
    }, 4000);
  };

  const cargarDatosReales = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem("token");

      const [resReportes, resClientes, resNaps, resPostes, resUsuarios] = await Promise.all([
        fetch("http://localhost:3000/api/red/reportes", {
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        }).then(res => res.json()),

        fetch("http://localhost:3000/api/red/clientes", {
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        }).then(res => res.json()),

        fetch("http://localhost:3000/api/red/naps", {
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        }).then(res => res.json()),

        fetch("http://localhost:3000/api/red/postes", {
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        }).then(res => res.json()),

        fetch("http://localhost:3000/api/usuarios", {
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        }).then(res => res.json()).catch(() => [])
      ]);

      setReportes(Array.isArray(resReportes) ? resReportes : []);
      setClientes(Array.isArray(resClientes) ? resClientes : []);
      setNaps(Array.isArray(resNaps) ? resNaps : []);
      setPostes(Array.isArray(resPostes) ? resPostes : []);
      setTecnicosSoporte(Array.isArray(resUsuarios) ? resUsuarios : []);
      setError("");
    } catch (err) {
      console.error("Error al conectar con la base de datos:", err);
      setError("No se pudo conectar con el servidor para obtener los datos.");
    } finally {
      setCargando(false);
    }
  };

  const handleTipoElementoChange = (e) => {
    const nuevoTipo = e.target.value;
    let fallaDefault = "Atenuación alta / Pérdida de señal (ONU)";
    if (nuevoTipo === "nap") fallaDefault = "Saturación de puertos / Conector dañado en NAP";
    if (nuevoTipo === "poste") fallaDefault = "Daño físico en estructura del poste";

    setNuevoReporte({
      ...nuevoReporte,
      tipo_elemento: nuevoTipo,
      id_elemento: "",
      nombre_elemento_seleccionado: "",
      falla_presentada: fallaDefault,
      otra_falla: ""
    });
    setBusquedaElemento("");
  };

  const limpiarFormulario = () => {
    setIdReporteEditando(null);
    setNuevoReporte({
      tipo_elemento: "cliente",
      id_elemento: "",
      nombre_elemento_seleccionado: "",
      falla_presentada: "Atenuación alta / Pérdida de señal (ONU)",
      otra_falla: "",
      prioridad: "Ordinaria",
      descripcion: "",
      tecnico_asignado: ""
    });
    setBusquedaElemento("");
    setError("");
  };

  const prepararEdicionReporte = (rep) => {
    const tipoElem = rep.tipo_elemento || (rep.cliente_id ? "cliente" : rep.nap_id ? "nap" : "poste");
    const idElem = rep.cliente_id || rep.nap_id || rep.poste_id || rep.id_elemento || "";
    
    let nombreElem = "";
    if (tipoElem === "cliente") {
      const cli = clientes.find(c => String(c.id_cliente || c.id) === String(idElem));
      nombreElem = cli?.nombre_completo || cli?.cliente_ref || rep.cliente?.nombre_completo || "";
    } else if (tipoElem === "nap") {
      const nap = naps.find(n => String(n.id_nap || n.id) === String(idElem));
      nombreElem = nap?.codigo_nap || nap?.codigo || rep.nap?.codigo_nap || "";
    } else {
      const pos = postes.find(p => String(p.poste_id || p.id) === String(idElem));
      nombreElem = pos?.codigo || pos?.identificador || rep.poste?.codigo || "";
    }

    setIdReporteEditando(rep.id_reporte || rep.id);
    setNuevoReporte({
      tipo_elemento: tipoElem,
      id_elemento: idElem,
      nombre_elemento_seleccionado: nombreElem,
      falla_presentada: rep.falla_presentada || "Atenuación alta / Pérdida de señal (ONU)",
      otra_falla: "",
      prioridad: rep.prioridad || "Ordinaria",
      descripcion: rep.descripcion || "",
      tecnico_asignado: rep.tecnico_asignado || ""
    });
    setBusquedaElemento(nombreElem || `ID: ${idElem}`);
    setError("");
    setPestanaActiva("nuevo");
  };

  const clientesFiltrados = clientes.filter(c => {
    const termino = busquedaElemento.toLowerCase();
    const nombre = (c.nombre_completo || c.cliente_ref || "").toLowerCase();
    const sigla = (c.localidad || c.siglas || c.barrio || "").toLowerCase();
    return nombre.includes(termino) || sigla.includes(termino);
  });

  const napsFiltradas = naps.filter(n => {
    const termino = busquedaElemento.toLowerCase();
    const codigo = (n.codigo || n.nombre || n.codigo_nap || "").toLowerCase();
    const sigla = (n.localidad || n.siglas || n.barrio || "").toLowerCase();
    return codigo.includes(termino) || sigla.includes(termino);
  });

  const postesFiltrados = postes.filter(p => {
    const termino = busquedaElemento.toLowerCase();
    const codigo = (p.codigo || p.identificador || "").toLowerCase();
    const sigla = (p.localidad || p.siglas || p.barrio || "").toLowerCase();
    return codigo.includes(termino) || sigla.includes(termino);
  });

  const seleccionarElemento = (id, nombre) => {
    setNuevoReporte({
      ...nuevoReporte,
      id_elemento: id,
      nombre_elemento_seleccionado: nombre
    });
    setBusquedaElemento(nombre);
    setMostrarDropdownElemento(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (idReporteEditando) {
      if (!nuevoReporte.descripcion) {
        setError("Por favor completa la descripción.");
        return;
      }
    } else {
      if (!nuevoReporte.id_elemento || !nuevoReporte.descripcion) {
        setError("Por favor completa los campos obligatorios del elemento y la descripción.");
        return;
      }
    }

    const fallaFinal = nuevoReporte.falla_presentada === "Otro" 
      ? `Otro: ${nuevoReporte.otra_falla}` 
      : nuevoReporte.falla_presentada;

    const token = localStorage.getItem("token");

    try {
      if (idReporteEditando) {
        // Objeto completo con todos los campos editables que mandamos al backend
        const bodyActualizacion = {
          falla_presentada: fallaFinal,
          prioridad: nuevoReporte.prioridad,
          descripcion: nuevoReporte.descripcion,
          tecnico_asignado: nuevoReporte.tecnico_asignado
        };

        const response = await fetch(`http://localhost:3000/api/red/reportes/${idReporteEditando}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(bodyActualizacion)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Error al actualizar el reporte");

        await cargarDatosReales();
        mostrarToast("Datos actualizados con éxito.");
        limpiarFormulario();
        setPestanaActiva("consultar");
      } else {
        const response = await fetch("http://localhost:3000/api/red/reportes", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            tipo_elemento: nuevoReporte.tipo_elemento,
            id_elemento: Number(nuevoReporte.id_elemento),
            falla_presentada: fallaFinal,
            prioridad: nuevoReporte.prioridad,
            descripcion: nuevoReporte.descripcion,
            tecnico_asignado: nuevoReporte.tecnico_asignado
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Error al crear reporte");

        await cargarDatosReales();
        mostrarToast("Reporte generado con éxito.");
        limpiarFormulario();
        setPestanaActiva("consultar");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmarEliminarReporte = async () => {
    if (!reporteAEliminar) return;
    const idReporte = reporteAEliminar.id_reporte || reporteAEliminar.id;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3000/api/red/reportes/${idReporte}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al eliminar el reporte");
      }

      setReportes(reportes.filter(rep => (rep.id_reporte || rep.id) !== idReporte));
      setReporteAEliminar(null);
      mostrarToast("Reporte eliminado con éxito.");
    } catch (err) {
      alert(err.message);
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
            <div class="field"><strong>Historial de Fallas:</strong> ${totalReportesVeces}° reporte acumulado para este elemento.</div>
            <div class="field"><strong>Fecha y Hora de Cierre:</strong> ${fechaCierreFormateada}</div>
            <div class="field"><strong>Técnico Asignado:</strong> ${rep.tecnico_asignado || "Sin asignar"}</div>
          </div>

          <div class="section-title">Información del Elemento Afectado</div>
          <div class="box">${infoHtml}</div>

          <div class="section-title">Solución Aplicada y Trabajos Realizados</div>
          <div class="box">
            <p class="solucion-texto-amplio">${rep.comentarios_solucion || rep.descripcion || "Sin notas de solución registradas."}</p>
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

  const irAlMapaGeolocalizacion = (rep) => {
    const tipoElementoStr = (rep.tipo_elemento || (rep.cliente_id ? "cliente" : rep.nap_id ? "nap" : "poste")).toLowerCase();
    
    let tipoParam = "cliente";
    let idBuscado = null;
    let elementoEncontrado = null;

    if (tipoElementoStr.includes("cliente")) {
      tipoParam = "cliente";
      idBuscado = rep.cliente?.id_cliente || rep.cliente?.id || rep.id_elemento || rep.cliente_id;
      elementoEncontrado = rep.cliente || clientes.find(c => String(c.id_cliente) === String(idBuscado) || String(c.id) === String(idBuscado));
    } else if (tipoElementoStr.includes("nap")) {
      tipoParam = "nap";
      idBuscado = rep.nap?.id_nap || rep.nap?.id || rep.id_elemento || rep.nap_id;
      elementoEncontrado = rep.nap || naps.find(n => String(n.id_nap) === String(idBuscado) || String(n.id) === String(idBuscado));
    } else {
      tipoParam = "poste";
      idBuscado = rep.poste?.poste_id || rep.poste?.id || rep.id_elemento || rep.poste_id;
      elementoEncontrado = rep.poste || postes.find(p => String(p.poste_id) === String(idBuscado) || String(p.id) === String(idBuscado));
    }

    if (!idBuscado) {
      idBuscado = rep.id_elemento;
    }

    const lat = elementoEncontrado?.latitud || rep.latitud || rep.cliente?.latitud || rep.nap?.latitud || rep.poste?.latitud;
    const lng = elementoEncontrado?.longitud || rep.longitud || rep.cliente?.longitud || rep.nap?.longitud || rep.poste?.longitud;

    if (lat && lng) {
      if (idBuscado) {
        window.location.href = `/mapa?lat=${lat}&lng=${lng}&tipo=${tipoParam}&id=${idBuscado}&zoom=18`;
      } else {
        window.location.href = `/mapa?lat=${lat}&lng=${lng}&zoom=18`;
      }
    } else {
      alert("Este elemento no cuenta con coordenadas geográficas registradas en la base de datos.");
    }
  };

  const reportesFiltrados = [...reportes]
    .sort((a, b) => (b.id_reporte || b.id) - (a.id_reporte || a.id))
    .filter(rep => {
      const esSinResolver = Boolean(rep.estatus);
      if (filtroEstatus === "PENDIENTES") return esSinResolver;
      if (filtroEstatus === "COMPLETADOS") return !esSinResolver;
      return true;
    });

  return (
    <div style={{ padding: "24px 32px", backgroundColor: "#f8fafc", height: "100%", boxSizing: "border-box", overflowY: "auto", fontFamily: "Segoe UI, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Gestión y Reporte de Fallas</h2>
          <div style={{ width: "40px", height: "3px", backgroundColor: '#16a34a', marginTop: "4px", borderRadius: "2px" }}></div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setPestanaActiva("consultar")}
            style={{
              padding: "8px 16px",
              backgroundColor: pestanaActiva === "consultar" ? '#16a34a' : "#ffffff",
              color: pestanaActiva === "consultar" ? "#ffffff" : "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              fontWeight: "600",
              fontSize: "0.82rem",
              cursor: "pointer"
            }}
          >
            Historial de Reportes
          </button>
          <button
            onClick={() => {
              limpiarFormulario();
              setPestanaActiva("nuevo");
            }}
            style={{
              padding: "8px 16px",
              backgroundColor: pestanaActiva === "nuevo" ? '#16a34a' : "#ffffff",
              color: pestanaActiva === "nuevo" ? "#ffffff" : "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              fontWeight: "600",
              fontSize: "0.82rem",
              cursor: "pointer"
            }}
          >
            Registrar Reporte
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "6px", marginBottom: "14px", fontSize: "0.85rem", border: "1px solid #fecaca" }}>
          {error}
        </div>
      )}

      {cargando ? (
        <p style={{ textAlign: "center", color: "#64748b", padding: "40px" }}>Cargando información del sistema...</p>
      ) : (
        <>
          {pestanaActiva === "consultar" && (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden", border: "1px solid #e2e8f0" }}>
              
              <div style={{ padding: "12px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc" }}>
                <span style={{ fontWeight: "700", color: "#0f172a", fontSize: "0.9rem" }}>Historial de Incidencias Registradas (Más recientes primero)</span>
                <div style={{ display: "flex", gap: "6px" }}>
                  {[
                    { id: "PENDIENTES", label: "PENDIENTES" },
                    { id: "COMPLETADOS", label: "COMPLETADOS" }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFiltroEstatus(f.id)}
                      style={{
                        padding: "5px 12px",
                        backgroundColor: filtroEstatus === f.id ? "#0f172a" : "#ffffff",
                        color: filtroEstatus === f.id ? "#ffffff" : "#475569",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        cursor: "pointer"
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#ffffff", color: "#64748b", borderBottom: "1px solid #e2e8f0", fontSize: "0.78rem", textTransform: "uppercase" }}>
                      <th style={{ padding: "12px 16px" }}>ID</th>
                      <th style={{ padding: "12px 16px" }}>Dispositivo</th>
                      <th style={{ padding: "12px 16px" }}>Falla Presentada</th>
                      <th style={{ padding: "12px 16px" }}>Prioridad</th>
                      <th style={{ padding: "12px 16px" }}>Técnico Asignado</th>
                      <th style={{ padding: "12px 16px", textAlign: "center" }}>Estatus</th>
                      <th style={{ padding: "12px 16px", textAlign: "center" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportesFiltrados.map((rep) => {
                      const tipoElementoStr = (rep.tipo_elemento || (rep.cliente_id ? "cliente" : rep.nap_id ? "nap" : "poste")).toLowerCase();
                      const esCliente = tipoElementoStr.includes("cliente");
                      const esNap = tipoElementoStr.includes("nap");
                      
                      const idBuscado = esCliente 
                        ? (rep.cliente?.id_cliente || rep.cliente?.id || rep.id_elemento || rep.cliente_id)
                        : esNap 
                        ? (rep.nap?.id_nap || rep.nap?.id || rep.id_elemento || rep.nap_id)
                        : (rep.poste?.poste_id || rep.poste?.id || rep.id_elemento || rep.poste_id);
                      
                      const tipoDispositivo = esCliente ? "Modem / Cliente" : esNap ? "Caja NAP" : "Poste";
                      
                      const elementoCoincidente = esCliente 
                        ? clientes.find(c => String(c.id_cliente) === String(idBuscado) || String(c.id) === String(idBuscado))
                        : esNap 
                        ? naps.find(n => String(n.id_nap) === String(idBuscado) || String(n.id) === String(idBuscado))
                        : postes.find(p => String(p.poste_id) === String(idBuscado) || String(p.id) === String(idBuscado));

                      const nombreEspecifico = 
                        rep.cliente?.nombre_completo || 
                        rep.nombre_cliente || 
                        elementoCoincidente?.nombre_completo ||
                        elementoCoincidente?.nombre ||
                        rep.nap?.codigo_nap || 
                        rep.nap?.codigo || 
                        rep.codigo_nap || 
                        elementoCoincidente?.codigo_nap ||
                        elementoCoincidente?.codigo ||
                        rep.poste?.codigo || 
                        rep.poste?.identificador || 
                        rep.codigo_poste ||
                        elementoCoincidente?.identificador ||
                        (idBuscado ? `ID: ${idBuscado}` : "Elemento no especificado");

                      const idReporteReal = rep.id_reporte || rep.id;
                      const estaCompletado = !rep.estatus;

                      return (
                        <tr key={idReporteReal} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 16px", fontWeight: "600", color: "#0f172a" }}>#{idReporteReal}</td>
                          
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: "700", fontSize: "0.68rem", color: '#16a34a', letterSpacing: "0.5px", textTransform: "uppercase" }}>
                              {tipoDispositivo}
                            </div>
                            <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "0.85rem" }}>
                              {nombreEspecifico}
                            </div>
                          </td>

                          <td style={{ padding: "12px 16px", fontWeight: "600", color: "#0f172a" }}>{rep.falla_presentada}</td>
                          
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                backgroundColor: rep.prioridad === "Urgente" ? "#fee2e2" : "#f1f5f9",
                                color: rep.prioridad === "Urgente" ? "#dc2626" : "#475569"
                              }}
                            >
                              {rep.prioridad || "Ordinaria"}
                            </span>
                          </td>

                          <td style={{ padding: "12px 16px", color: "#475569", fontWeight: "500" }}>{rep.tecnico_asignado || "Sin asignar"}</td>

                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                display: "inline-block",
                                backgroundColor: rep.estatus ? "#fdefb6" : "#dcfce7",
                                color: rep.estatus ? "#a84c05" : "#166534"
                              }}
                            >
                              {rep.estatus ? "Pendiente" : "Completado"}
                            </span>
                          </td>

                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                              {estaCompletado && (
                                <button
                                  onClick={() => generarYGuardarPDFAutomatico(rep)}
                                  style={{
                                    padding: "5px 10px",
                                    backgroundColor: "#b91c1c",
                                    color: "#ffffff",
                                    border: "1px solid #991b1b",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                    whiteSpace: "nowrap"
                                  }}
                                >
                                  PDF
                                </button>
                              )}

                              {rep.estatus && (
                                <button
                                  onClick={() => prepararEdicionReporte(rep)}
                                  style={{
                                    padding: "5px 10px",
                                    backgroundColor: "#ffef11",
                                    color: "#0f0e0e",
                                    border: "1px solid #fffb19",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                    whiteSpace: "nowrap"
                                  }}
                                >
                                  Editar
                                </button>
                              )}

                              <button
                                onClick={() => irAlMapaGeolocalizacion(rep)}
                                style={{
                                  padding: "5px 10px",
                                  backgroundColor: "#ad0601",
                                  color: "#ffffff",
                                  border: "1px solid #ad0601",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                  fontWeight: "600",
                                  whiteSpace: "nowrap"
                                }}
                              >
                                Ubicar Pin
                              </button>

                              <button
                                onClick={() => setReporteAEliminar(rep)}
                                style={{
                                  padding: "5px 10px",
                                  backgroundColor: "rgb(250, 4, 4)",
                                  color: "#f5f5f5",
                                  border: "1px solid #fd0202",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                  fontWeight: "600",
                                  whiteSpace: "nowrap"
                                }}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {reportesFiltrados.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ padding: "28px", textAlign: "center", color: "#64748b" }}>
                          No hay reportes bajo este filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
          {reporteAEliminar !== null && (
            <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000, backdropFilter: "blur(2px)" }}>
              <div style={{ backgroundColor: "#ffffff", padding: "24px 28px", borderRadius: "12px", width: "100%", maxWidth: "420px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)", border: "1px solid #e2e8f0", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 10px 0", color: "#dc2626", fontSize: "1.2rem", fontWeight: "700" }}>Eliminar Reporte</h3>
                <p style={{ color: "#334155", fontSize: "0.88rem", marginBottom: "20px" }}>
                  ¿Estás segura de que deseas eliminar el reporte <strong>#{reporteAEliminar.id_reporte || reporteAEliminar.id}</strong> del historial?
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                  <button
                    onClick={() => setReporteAEliminar(null)}
                    style={{ padding: "8px 16px", backgroundColor: "#e2e8f0", color: "#334155", border: "none", borderRadius: "6px", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarEliminarReporte}
                    style={{ padding: "8px 18px", backgroundColor: "#dc2626", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" }}
                  >
                    Sí, Eliminar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA DE FORMULARIO */}
          {pestanaActiva === "nuevo" && (
            <div style={{ 
              backgroundColor: "#ffffff", 
              padding: "22px 28px", 
              borderRadius: "10px", 
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)", 
              maxWidth: "720px", 
              margin: "0 auto", 
              border: "1px solid #e2e8f0" 
            }}>
              <h3 style={{ margin: "0 0 14px 0", color: "#0f172a", fontSize: "1.05rem", fontWeight: "700" }}>
                {idReporteEditando ? `Editar Incidencia Pendiente #${idReporteEditando}` : "Registrar Nueva Incidencia de Falla"}
              </h3>
              
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                      Dispositivo Afectado:
                    </label>
                    <select
                      name="tipo_elemento"
                      value={nuevoReporte.tipo_elemento}
                      onChange={handleTipoElementoChange}
                      disabled={!!idReporteEditando}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none", backgroundColor: idReporteEditando ? "#f1f5f9" : "#fff" }}
                    >
                      <option value="cliente">Modem / Cliente</option>
                      <option value="nap">Caja NAP</option>
                      <option value="poste">Poste</option>
                    </select>
                  </div>

                  <div style={{ position: "relative" }} ref={dropdownRef}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                      Buscar {nuevoReporte.tipo_elemento === "cliente" ? "Modem / Cliente" : nuevoReporte.tipo_elemento === "nap" ? "Caja NAP" : "Poste"}:
                    </label>
                    <input
                      type="text"
                      placeholder="Escribe para buscar..."
                      value={busquedaElemento}
                      disabled={!!idReporteEditando}
                      onFocus={() => !idReporteEditando && setMostrarDropdownElemento(true)}
                      onChange={(e) => {
                        if (!idReporteEditando) {
                          setBusquedaElemento(e.target.value);
                          setMostrarDropdownElemento(true);
                        }
                      }}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", backgroundColor: idReporteEditando ? "#f1f5f9" : "#fff" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: nuevoReporte.falla_presentada.startsWith("Otro") ? "1fr 1fr" : "1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                      Tipo de Falla Presentada:
                    </label>
                    <select
                      name="falla_presentada"
                      value={nuevoReporte.falla_presentada.startsWith("Otro") ? "Otro" : nuevoReporte.falla_presentada}
                      onChange={(e) => setNuevoReporte({ ...nuevoReporte, falla_presentada: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none", backgroundColor: "#fff" }}
                    >
                      {nuevoReporte.tipo_elemento === "cliente" && (
                        <>
                          <option value="Atenuación alta / Pérdida de señal (ONU)">Atenuación alta / Pérdida de señal (ONU)</option>
                          <option value="Falla de energía en ONU / Router">Falla de energía en ONU / Router</option>
                          <option value="Corte de fibra en acometida de cliente">Corte de fibra en acometida de cliente</option>
                          <option value="Sin servicio de internet (Conexión caída)">Sin servicio de internet (Conexión caída)</option>
                        </>
                      )}

                      {nuevoReporte.tipo_elemento === "nap" && (
                        <>
                          <option value="Saturación de puertos / Conector dañado en NAP">Saturación de puertos / Conector dañado en NAP</option>
                          <option value="Splitter averiado en Caja NAP">Splitter averiado en Caja NAP</option>
                          <option value="Caja NAP vandalizada / Abierta">Caja NAP vandalizada / Abierta</option>
                          <option value="Atenuación general en puerto de NAP">Atenuación general en puerto de NAP</option>
                        </>
                      )}

                      {nuevoReporte.tipo_elemento === "poste" && (
                        <>
                          <option value="Daño físico en estructura del poste">Daño físico en estructura del poste</option>
                          <option value="Poste caído o inclinado con riesgo en cableado">Poste caído o inclinado con riesgo en cableado</option>
                          <option value="Tendido de fibra principal trozado en poste">Tendido de fibra principal trozado en poste</option>
                          <option value="Incidente eléctrico en zona de postería">Incidente eléctrico en zona de postería</option>
                        </>
                      )}

                      <option value="Otro">Otro (Especificar motivo)</option>
                    </select>
                  </div>

                  {nuevoReporte.falla_presentada.startsWith("Otro") && (
                    <div>
                      <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                        Especifique la Falla:
                      </label>
                      <input
                        type="text"
                        placeholder="Describa brevemente la otra falla..."
                        value={nuevoReporte.otra_falla}
                        onChange={(e) => setNuevoReporte({ ...nuevoReporte, otra_falla: e.target.value })}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", backgroundColor: "#fff" }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                      Prioridad del Reporte:
                    </label>
                    <select
                      name="prioridad"
                      value={nuevoReporte.prioridad}
                      onChange={(e) => setNuevoReporte({ ...nuevoReporte, prioridad: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none", backgroundColor: "#fff" }}
                    >
                      <option value="Ordinaria">Ordinaria</option>
                      <option value="Urgente">Urgente</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                      Técnico de Soporte en Campo:
                    </label>
                    <select
                      name="tecnico_asignado"
                      value={nuevoReporte.tecnico_asignado}
                      onChange={(e) => setNuevoReporte({ ...nuevoReporte, tecnico_asignado: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none", backgroundColor: "#fff" }}
                    >
                      <option value="">-- Seleccionar Técnico --</option>
                      {tecnicosSoporte
                        .filter(t => t.rol && t.rol.toUpperCase() === "SOPORTE_TECNICO")
                        .map(t => (
                          <option key={t.id_usuario || t.id} value={t.nombre_completo || t.nombre}>
                            {t.nombre_completo || t.nombre}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                    Descripción Detallada (Máx. 350 caracteres):
                  </label>
                  <textarea
                    name="descripcion"
                    maxLength={350}
                    rows={2}
                    value={nuevoReporte.descripcion}
                    onChange={(e) => setNuevoReporte({ ...nuevoReporte, descripcion: e.target.value })}
                    placeholder="Escriba los detalles específicos de la incidencia..."
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", resize: "vertical", outline: "none", backgroundColor: "#fff" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
                  <button
                    type="button"
                    onClick={limpiarFormulario}
                    style={{ padding: "8px 16px", backgroundColor: "#e2e8f0", color: "#334155", border: "none", borderRadius: "6px", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{ padding: "8px 18px", backgroundColor: idReporteEditando ? '#16a34a' : '#16a34a', color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" }}
                  >
                    {idReporteEditando ? "Actualizar Reporte" : "Guardar Reporte"}
                  </button>
                </div>

              </form>
            </div>
          )}
        </>
      )}

      {toastMensaje && (
        <div 
          onClick={() => setToastMensaje("")}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            backgroundColor: "#16a34a",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "10px",
            fontWeight: "600",
            fontSize: "0.9rem",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
            zIndex: 9999,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span>{toastMensaje}</span>
        </div>
      )}

    </div>
  );
}

export default ReporteFallas;
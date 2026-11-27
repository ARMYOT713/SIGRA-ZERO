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
  const [onus, setOnus] = useState([]);
  const [naps, setNaps] = useState([]);
  const [postes, setPostes] = useState([]);
  const [tecnicosSoporte, setTecnicosSoporte] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [filaExpandida, setFilaExpandida] = useState(null);
  
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: "", tipo: "exito" });

  const [idReporteEditando, setIdReporteEditando] = useState(null);
  const [reporteAEliminar, setReporteAEliminar] = useState(null);
  const [reporteAResolver, setReporteAResolver] = useState(null);
  const [comentarioSolucion, setComentarioSolucion] = useState("");

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMostrarDropdownElemento(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const mostrarToast = (mensaje, tipo = "exito") => {
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

  const cargarDatosReales = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem("token");

      const [resReportes, resClientes, resNaps, resPostes, resUsuarios, resOnusTabla] = await Promise.all([
        fetch("https://sigra-zero.onrender.com/api/red/reportes", {
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        }).then(res => res.json()),

        fetch("https://sigra-zero.onrender.com/api/red/clientes", {
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        }).then(res => res.json()),

        fetch("https://sigra-zero.onrender.com/api/red/naps", {
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        }).then(res => res.json()),

        fetch("https://sigra-zero.onrender.com/api/red/postes", {
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        }).then(res => res.json()),

        fetch("https://sigra-zero.onrender.com/api/usuarios", {
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        }).then(res => res.json()).catch(() => []),

        fetch("https://sigra-zero.onrender.com/api/red/onus", {
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
        }).then(res => res.json()).catch(() => [])
      ]);

      const listaClientesRaw = Array.isArray(resClientes) ? resClientes : [];
      const clientesReales = listaClientesRaw.filter(c => !esDispositivoOnu(c));
      const onusDesdeClientes = listaClientesRaw.filter(c => esDispositivoOnu(c));
      const onusDesdeTabla = Array.isArray(resOnusTabla) ? resOnusTabla : [];

      const mapaOnusUnificadas = new Map();
      [...onusDesdeClientes, ...onusDesdeTabla].forEach(o => {
        const clave = String(o.id_cliente || o.id_onus || o.id);
        if (!mapaOnusUnificadas.has(clave)) {
          mapaOnusUnificadas.set(clave, o);
        }
      });

      setReportes(Array.isArray(resReportes) ? resReportes : []);
      setClientes(clientesReales);
      setOnus(Array.from(mapaOnusUnificadas.values()));
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
    if (nuevoTipo === "onu") fallaDefault = "Pérdida de potencia óptica / Nivel PON fuera de rango";

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
    const tipoRaw = (rep.tipo_elemento || "").toLowerCase();
    let tipoElem = "cliente";
    if (tipoRaw.includes("onu") || rep.id_onus || esDispositivoOnu(rep.cliente)) {
      tipoElem = "onu";
    } else if (tipoRaw.includes("nap") || rep.id_nap || rep.nap_id) {
      tipoElem = "nap";
    } else if (tipoRaw.includes("poste") || rep.id_poste || rep.poste_id) {
      tipoElem = "poste";
    }

    const idElem = rep.id_onus || rep.id_cliente || rep.cliente_id || rep.id_nap || rep.nap_id || rep.id_poste || rep.poste_id || rep.id_elemento || "";
    
    let nombreElem = "";
    if (tipoElem === "cliente") {
      const cli = clientes.find(c => String(c.id_cliente || c.id) === String(idElem));
      nombreElem = cli?.nombre_completo || cli?.cliente_ref || rep.cliente?.nombre_completo || "";
    } else if (tipoElem === "onu") {
      const onuObj = onus.find(o => String(o.id_cliente || o.id_onus || o.id) === String(idElem));
      nombreElem = onuObj?.cliente_ref || onuObj?.codigo || rep.onu?.codigo || rep.cliente?.cliente_ref || "";
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
    const nombre = (c.nombre_completo || c.cliente_ref || c.codigo || "").toLowerCase();
    const sigla = (c.localidad || c.siglas || c.barrio || "").toLowerCase();
    return nombre.includes(termino) || sigla.includes(termino);
  });

  const onusFiltradas = onus.filter(o => {
    const termino = busquedaElemento.toLowerCase();
    const codigo = (o.cliente_ref || o.codigo || o.nombre_completo || "").toLowerCase();
    const sigla = (o.localidad || "").toLowerCase();
    return codigo.includes(termino) || sigla.includes(termino);
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
        mostrarToast("Por favor completa la descripción.", "error");
        return;
      }
    } else {
      if (!nuevoReporte.id_elemento || !nuevoReporte.descripcion) {
        mostrarToast("Selecciona un dispositivo de la lista y escribe la descripción.", "error");
        return;
      }
    }

    const fallaFinal = nuevoReporte.falla_presentada === "Otro" 
      ? `Otro: ${nuevoReporte.otra_falla}` 
      : nuevoReporte.falla_presentada;

    const token = localStorage.getItem("token");

    try {
      if (idReporteEditando) {
        const bodyActualizacion = {
          falla_presentada: fallaFinal,
          prioridad: nuevoReporte.prioridad,
          descripcion: nuevoReporte.descripcion,
          tecnico_asignado: nuevoReporte.tecnico_asignado
        };

        const response = await fetch(`https://sigra-zero.onrender.com/api/red/reportes/${idReporteEditando}`, {
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
        const response = await fetch("https://sigra-zero.onrender.com/api/red/reportes", {
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
        mostrarToast("Registro exitoso.");
        limpiarFormulario();
        setPestanaActiva("consultar");
      }
    } catch (err) {
      mostrarToast(err.message, "error");
    }
  };

  const confirmarResolverReporte = async (e) => {
    e.preventDefault();
    if (!reporteAResolver) return;
    if (!comentarioSolucion.trim()) {
      mostrarToast("Ingresa el comentario con la solución aplicada.", "error");
      return;
    }

    const idReporte = reporteAResolver.id_reporte || reporteAResolver.id;
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`https://sigra-zero.onrender.com/api/red/reportes/${idReporte}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          estatus: false,
          comentarios_solucion: comentarioSolucion.trim()
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo marcar como completado");

      setReporteAResolver(null);
      setComentarioSolucion("");
      await cargarDatosReales();
      mostrarToast("Reporte marcado como completado con éxito.");
    } catch (err) {
      mostrarToast(err.message, "error");
    }
  };

  const confirmarEliminarReporte = async () => {
    if (!reporteAEliminar) return;
    const idReporte = reporteAEliminar.id_reporte || reporteAEliminar.id;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`https://sigra-zero.onrender.com/api/red/reportes/${idReporte}`, {
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
      mostrarToast(err.message, "error");
    }
  };

  const obtenerContadorReportesElemento = (repActual) => {
    const idCli = repActual.id_cliente || repActual.cliente_id || repActual.cliente?.id || repActual.cliente?.id_cliente;
    const idOnu = repActual.id_onus || repActual.onu?.id_onus;
    const idNap = repActual.id_nap || repActual.nap_id || repActual.nap?.id || repActual.nap?.id_nap;
    const idPoste = repActual.id_poste || repActual.poste_id || repActual.poste?.id || repActual.poste?.poste_id;

    const coincidencias = reportes.filter(r => {
      const rCli = r.id_cliente || r.cliente_id || r.cliente?.id || r.cliente?.id_cliente;
      const rOnu = r.id_onus || r.onu?.id_onus;
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

  const generarYGuardarPDFAutomatico = (rep) => {
    const ventana = window.open("", "_blank");
    if (!ventana) {
      mostrarToast("Permite las ventanas emergentes para visualizar el PDF.", "error");
      return;
    }

    const fechaCierreFormateada = new Date(rep.fecha_resolucion || Date.now()).toLocaleString();
    const totalReportesVeces = obtenerContadorReportesElemento(rep);

    const tipoElementoStr = (rep.tipo_elemento || "").toLowerCase();
    const esOnu = tipoElementoStr.includes("onu") || !!rep.id_onus || esDispositivoOnu(rep.cliente);
    const esNap = !esOnu && (tipoElementoStr.includes("nap") || !!rep.id_nap || !!rep.nap_id || !!rep.nap);
    const esPoste = !esOnu && !esNap && (tipoElementoStr.includes("poste") || !!rep.id_poste || !!rep.poste_id || !!rep.poste);
    const esCliente = !esOnu && !esNap && !esPoste;

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
        <div class="field"><strong>Tipo de Elemento:</strong> Cliente</div>
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
            margin: [8, 10, 12, 10],
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

            const totalPaginas = pdf.internal.getNumberOfPages();
            const anchoPagina = pdf.internal.pageSize.getWidth();
            const altoPagina = pdf.internal.pageSize.getHeight();

            for (let i = 1; i <= totalPaginas; i++) {
              pdf.setPage(i);
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(8);
              pdf.setTextColor(148, 163, 184);
              pdf.text(
                "© 2026 SIGRA - WinfoRed. Todos los derechos reservados. · Desarrollado por Carolina Garcia.",
                anchoPagina / 2,
                altoPagina - 6,
                { align: "center" }
              );
            }
          })
          .outputPdf("blob"); 

        const blobUrl = URL.createObjectURL(pdfBlob);
        ventana.location.href = blobUrl;
        setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
      } catch (error) {
        console.error("Error al generar el PDF:", error);
        ventana.close();
        mostrarToast("No se pudo generar el PDF del reporte.", "error");
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
    const tipoElementoStr = (rep.tipo_elemento || (rep.id_onus ? "onu" : rep.id_cliente || rep.cliente_id ? "cliente" : rep.id_nap || rep.nap_id ? "nap" : "poste")).toLowerCase();
    
    let tipoParam = "cliente";
    let idBuscado = null;
    let elementoEncontrado = null;

    if (tipoElementoStr.includes("onu") || rep.id_onus || esDispositivoOnu(rep.cliente)) {
      tipoParam = "onu";
      idBuscado = rep.onu?.id_onus || rep.cliente?.id_cliente || rep.id_onus || rep.id_cliente || rep.id_elemento;
      elementoEncontrado = rep.onu || rep.cliente || onus.find(o => String(o.id_cliente || o.id_onus || o.id) === String(idBuscado));
    } else if (tipoElementoStr.includes("cliente")) {
      tipoParam = "cliente";
      idBuscado = rep.cliente?.id_cliente || rep.cliente?.id || rep.id_elemento || rep.id_cliente || rep.cliente_id;
      elementoEncontrado = rep.cliente || clientes.find(c => String(c.id_cliente) === String(idBuscado) || String(c.id) === String(idBuscado));
    } else if (tipoElementoStr.includes("nap")) {
      tipoParam = "nap";
      idBuscado = rep.nap?.id_nap || rep.nap?.id || rep.id_elemento || rep.id_nap || rep.nap_id;
      elementoEncontrado = rep.nap || naps.find(n => String(n.id_nap) === String(idBuscado) || String(n.id) === String(idBuscado));
    } else {
      tipoParam = "poste";
      idBuscado = rep.poste?.poste_id || rep.poste?.id || rep.id_elemento || rep.id_poste || rep.poste_id;
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
      mostrarToast("Este elemento no cuenta con coordenadas geográficas registradas.", "error");
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

  const listaDropdownActual = nuevoReporte.tipo_elemento === "cliente"
    ? clientesFiltrados.map(c => ({
        id: c.id_cliente || c.id,
        texto: `${c.cliente_ref || c.codigo || ""} ${c.nombre_completo ? `- ${c.nombre_completo}` : ""}`.trim(),
        localidad: c.localidad || "MX-B1"
      }))
    : nuevoReporte.tipo_elemento === "onu"
    ? onusFiltradas.map(o => ({
        id: o.id_cliente || o.id_onus || o.id,
        texto: o.cliente_ref || o.codigo || o.nombre_completo || `ONU-${o.id}`,
        localidad: o.localidad || "MX-B1"
      }))
    : nuevoReporte.tipo_elemento === "nap"
    ? napsFiltradas.map(n => ({
        id: n.id_nap || n.id,
        texto: n.codigo_nap || n.codigo || n.nombre,
        localidad: n.localidad || "MX-B1"
      }))
    : postesFiltrados.map(p => ({
        id: p.poste_id || p.id,
        texto: p.codigo || p.identificador,
        localidad: p.localidad || "MX-B1"
      }));

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
              padding: "9px 18px",
              backgroundColor: pestanaActiva === "consultar" ? "#16a34a" : "#010203",
              color: "#ffffff",
              border: "none",
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
              padding: "9px 18px",
              backgroundColor: "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "700",
              fontSize: "0.82rem",
              cursor: "pointer"
            }}
          >
            + Registrar Reporte
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
            <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
              
              <div style={{ padding: "12px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc" }}>
                <span style={{ fontWeight: "700", color: "#0f172a", fontSize: "0.9rem" }}>Historial de Incidencias Registradas (Más recientes primero)</span>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "#475569", marginRight: "4px" }}>Estatus:</span>
                  {[
                    { id: "PENDIENTES", label: "PENDIENTES" },
                    { id: "COMPLETADOS", label: "COMPLETADOS" }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFiltroEstatus(f.id)}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: filtroEstatus === f.id ? "#0284c7" : "#ffffff",
                        color: filtroEstatus === f.id ? "#ffffff" : "#334155",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
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
                    <tr style={{ backgroundColor: "#f8fafc", color: "#64748b", borderBottom: "1px solid #e2e8f0", fontSize: "0.78rem", textTransform: "uppercase" }}>
                      <th style={{ padding: "12px 16px" }}>ID</th>
                      <th style={{ padding: "12px 16px" }}>Dispositivo</th>
                      <th style={{ padding: "12px 16px" }}>Falla Presentada</th>
                      <th style={{ padding: "12px 16px" }}>Prioridad</th>
                      <th style={{ padding: "12px 16px" }}>Técnico Asignado</th>
                      <th style={{ padding: "12px 16px", textAlign: "center" }}>Estatus</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportesFiltrados.map((rep) => {
                      const tipoElementoStr = (rep.tipo_elemento || (rep.id_onus ? "onu" : rep.id_cliente || rep.cliente_id ? "cliente" : rep.id_nap || rep.nap_id ? "nap" : "poste")).toLowerCase();
                      const esOnu = tipoElementoStr.includes("onu") || !!rep.id_onus || esDispositivoOnu(rep.cliente);
                      const esCliente = !esOnu && tipoElementoStr.includes("cliente");
                      const esNap = !esOnu && tipoElementoStr.includes("nap");
                      
                      const idBuscado = esOnu
                        ? (rep.onu?.id_onus || rep.cliente?.id_cliente || rep.id_onus || rep.id_cliente || rep.id_elemento)
                        : esCliente 
                        ? (rep.cliente?.id_cliente || rep.cliente?.id || rep.id_elemento || rep.id_cliente || rep.cliente_id)
                        : esNap 
                        ? (rep.nap?.id_nap || rep.nap?.id || rep.id_elemento || rep.id_nap || rep.nap_id)
                        : (rep.poste?.poste_id || rep.poste?.id || rep.id_elemento || rep.id_poste || rep.poste_id);
                      
                      const tipoDispositivo = esOnu ? "Equipo ONU" : esCliente ? "Modem / Cliente" : esNap ? "Caja NAP" : "Poste";
                      
                      const elementoCoincidente = esOnu
                        ? onus.find(o => String(o.id_cliente || o.id_onus || o.id) === String(idBuscado))
                        : esCliente 
                        ? clientes.find(c => String(c.id_cliente) === String(idBuscado) || String(c.id) === String(idBuscado))
                        : esNap 
                        ? naps.find(n => String(n.id_nap) === String(idBuscado) || String(n.id) === String(idBuscado))
                        : postes.find(p => String(p.poste_id) === String(idBuscado) || String(p.id) === String(idBuscado));

                      const nombreEspecifico = 
                        rep.onu?.codigo ||
                        rep.cliente?.cliente_ref ||
                        rep.cliente?.nombre_completo || 
                        rep.nombre_cliente || 
                        elementoCoincidente?.cliente_ref ||
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
                        <React.Fragment key={idReporteReal}>
                          <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "12px 16px", fontWeight: "700", color: "#0f172a" }}>#{idReporteReal}</td>
                            
                            <td style={{ padding: "12px 16px" }}>
                              <div style={{ fontWeight: "700", fontSize: "0.68rem", color: "#16a34a", letterSpacing: "0.5px", textTransform: "uppercase" }}>
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
                                  borderRadius: "4px",
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
                                  padding: "4px 10px",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: "700",
                                  display: "inline-block",
                                  backgroundColor: rep.estatus ? "#fef3c7" : "#dcfce7",
                                  color: rep.estatus ? "#b45309" : "#16a34a"
                                }}
                              >
                                {rep.estatus ? "Pendiente" : "Completado"}
                              </span>
                            </td>

                            <td style={{ padding: "12px 16px", textAlign: "right" }}>
                              <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                                <button
                                  onClick={() => irAlMapaGeolocalizacion(rep)}
                                  style={{
                                    padding: "5px 10px",
                                    backgroundColor: "#0284c7",
                                    color: "#ffffff",
                                    border: "none",
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
                                  onClick={() => setFilaExpandida(filaExpandida === idReporteReal ? null : idReporteReal)}
                                  style={{
                                    padding: "5px 10px",
                                    backgroundColor: "#475569",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                    whiteSpace: "nowrap"
                                  }}
                                >
                                  {filaExpandida === idReporteReal ? "Ocultar" : "Detalles"}
                                </button>

                                {estaCompletado && (
                                  <button
                                    onClick={() => generarYGuardarPDFAutomatico(rep)}
                                    style={{
                                      padding: "5px 10px",
                                      backgroundColor: "#f32011",
                                      color: "#ffffff",
                                      border: "none",
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
                                  <>
                                    <button
                                      onClick={() => {
                                        setReporteAResolver(rep);
                                        setComentarioSolucion("");
                                      }}
                                      style={{
                                        padding: "5px 10px",
                                        backgroundColor: "#16a34a",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "0.75rem",
                                        fontWeight: "600",
                                        whiteSpace: "nowrap"
                                      }}
                                    >
                                      Resolver
                                    </button>

                                    <button
                                      onClick={() => prepararEdicionReporte(rep)}
                                      style={{
                                        padding: "5px 10px",
                                        backgroundColor: "#d97706",
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        fontSize: "0.75rem",
                                        fontWeight: "600",
                                        whiteSpace: "nowrap"
                                      }}
                                    >
                                      Editar
                                    </button>
                                  </>
                                )}

                                <button
                                  onClick={() => setReporteAEliminar(rep)}
                                  style={{
                                    padding: "5px 10px",
                                    backgroundColor: "#dc2626",
                                    color: "#ffffff",
                                    border: "none",
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

                          {filaExpandida === idReporteReal && (
                            <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                              <td colSpan="7" style={{ padding: "14px 24px", fontSize: "0.82rem", color: "#334155" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                  <div>
                                    <strong>Descripción del reporte:</strong> {rep.descripcion || "Sin descripción"}
                                  </div>
                                  <div>
                                    <strong>Fecha de registro:</strong> {rep.fecha_reporte ? new Date(rep.fecha_reporte).toLocaleString() : "N/A"}
                                  </div>
                                  {!rep.estatus && (
                                    <div style={{ gridColumn: "1 / -1" }}>
                                      <strong>Solución aplicada:</strong> {rep.comentarios_solucion || "Sin comentarios de cierre"}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
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

          {/* MODAL PARA RESOLVER / COMPLETAR REPORTE */}
          {reporteAResolver !== null && (
            <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000 }}>
              <div style={{ backgroundColor: "#ffffff", padding: "24px 28px", borderRadius: "10px", width: "440px", border: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: "0 0 10px 0", color: "#0f172a", fontSize: "1.05rem", fontWeight: "700" }}>
                  Completar Reporte #{reporteAResolver.id_reporte || reporteAResolver.id}
                </h3>
                <p style={{ color: "#475569", fontSize: "0.82rem", marginBottom: "14px" }}>
                  Describe brevemente la solución o el trabajo realizado para cerrar esta incidencia:
                </p>
                <form onSubmit={confirmarResolverReporte} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <textarea
                    rows={3}
                    maxLength={500}
                    required
                    placeholder="Ej. Se reemplazó conector APC dañado y se verificó potencia óptica en parámetros normales..."
                    value={comentarioSolucion}
                    onChange={(e) => setComentarioSolucion(e.target.value)}
                    style={{ width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", resize: "vertical", outline: "none", boxSizing: "border-box" }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setReporteAResolver(null);
                        setComentarioSolucion("");
                      }}
                      style={{ padding: "8px 16px", backgroundColor: "#e2e8f0", color: "#334155", border: "none", borderRadius: "6px", fontWeight: "600", fontSize: "0.82rem", cursor: "pointer" }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      style={{ padding: "8px 18px", backgroundColor: "#16a34a", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: "700", fontSize: "0.82rem", cursor: "pointer" }}
                    >
                      Marcar Completado
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
          {reporteAEliminar !== null && (
            <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 3000 }}>
              <div style={{ backgroundColor: "#ffffff", padding: "24px 28px", borderRadius: "10px", width: "400px", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 10px 0", color: "#dc2626", fontSize: "1.1rem", fontWeight: "700" }}>Eliminar Reporte</h3>
                <p style={{ color: "#475569", fontSize: "0.85rem", marginBottom: "20px" }}>
                  ¿Estás segura de que deseas eliminar el reporte <strong>#{reporteAEliminar.id_reporte || reporteAEliminar.id}</strong> del historial?
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                  <button
                    onClick={() => setReporteAEliminar(null)}
                    style={{ padding: "8px 16px", backgroundColor: "#e2e8f0", color: "#334155", border: "none", borderRadius: "6px", fontWeight: "600", fontSize: "0.82rem", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarEliminarReporte}
                    style={{ padding: "8px 16px", backgroundColor: "#dc2626", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: "700", fontSize: "0.82rem", cursor: "pointer" }}
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
              padding: "24px 28px", 
              borderRadius: "10px", 
              maxWidth: "720px", 
              margin: "0 auto", 
              border: "1px solid #e2e8f0" 
            }}>
              <h3 style={{ margin: "0 0 14px 0", color: "#0f172a", fontSize: "1.05rem", fontWeight: "700" }}>
                {idReporteEditando ? `Editar Incidencia Pendiente #${idReporteEditando}` : "Registrar Nueva Incidencia de Falla"}
              </h3>
              
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                
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
                      style={{ width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none", backgroundColor: idReporteEditando ? "#f1f5f9" : "#fff" }}
                    >
                      <option value="cliente">Modem / Cliente</option>
                      <option value="nap">Caja NAP</option>
                      <option value="poste">Poste</option>
                      <option value="onu">ONU (Equipo de Red / Fibra)</option>
                    </select>
                  </div>

                  <div style={{ position: "relative" }} ref={dropdownRef}>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", marginBottom: "4px", color: "#334155" }}>
                      Buscar {nuevoReporte.tipo_elemento === "cliente" ? "Modem / Cliente" : nuevoReporte.tipo_elemento === "onu" ? "Equipo ONU" : nuevoReporte.tipo_elemento === "nap" ? "Caja NAP" : "Poste"}:
                    </label>
                    <input
                      type="text"
                      placeholder="Escribe código, nombre o localidad..."
                      value={busquedaElemento}
                      disabled={!!idReporteEditando}
                      onFocus={() => !idReporteEditando && setMostrarDropdownElemento(true)}
                      onChange={(e) => {
                        if (!idReporteEditando) {
                          setBusquedaElemento(e.target.value);
                          setMostrarDropdownElemento(true);
                          if (!e.target.value.trim()) {
                            setNuevoReporte(prev => ({ ...prev, id_elemento: "", nombre_elemento_seleccionado: "" }));
                          }
                        }
                      }}
                      style={{ width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", backgroundColor: idReporteEditando ? "#f1f5f9" : "#fff" }}
                    />

                    {mostrarDropdownElemento && !idReporteEditando && (
                      <div style={{
                        position: "absolute",
                        top: "calc(100% + 2px)",
                        left: 0,
                        right: 0,
                        backgroundColor: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        maxHeight: "200px",
                        overflowY: "auto",
                        zIndex: 4000,
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
                      }}>
                        {listaDropdownActual.length === 0 ? (
                          <div style={{ padding: "8px 12px", fontSize: "0.8rem", color: "#94a3b8" }}>
                            No se encontraron coincidencias
                          </div>
                        ) : (
                          listaDropdownActual.map((item, idx) => (
                            <div
                              key={`drop-rep-${idx}`}
                              onClick={() => seleccionarElemento(item.id, item.texto)}
                              style={{
                                padding: "8px 12px",
                                fontSize: "0.82rem",
                                fontWeight: "600",
                                color: "#0f172a",
                                cursor: "pointer",
                                borderBottom: "1px solid #f1f5f9",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f1f5f9"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#ffffff"; }}
                            >
                              <span>{item.texto}</span>
                              <span style={{ backgroundColor: "#e0f2fe", color: "#0369a1", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: "700" }}>
                                {item.localidad}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
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
                      style={{ width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none", backgroundColor: "#fff" }}
                    >
                      {nuevoReporte.tipo_elemento === "cliente" && (
                        <>
                          <option value="Atenuación alta / Pérdida de señal (ONU)">Atenuación alta / Pérdida de señal (ONU)</option>
                          <option value="Falla de energía en ONU / Router">Falla de energía en ONU / Router</option>
                          <option value="Corte de fibra en acometida de cliente">Corte de fibra en acometida de cliente</option>
                          <option value="Sin servicio de internet (Conexión caída)">Sin servicio de internet (Conexión caída)</option>
                        </>
                      )}

                      {nuevoReporte.tipo_elemento === "onu" && (
                        <>
                          <option value="Pérdida de potencia óptica / Nivel PON fuera de rango">Pérdida de potencia óptica / Nivel PON fuera de rango</option>
                          <option value="ONU sin enlace óptico (LOS en rojo)">ONU sin enlace óptico (LOS en rojo)</option>
                          <option value="Falla de alimentación eléctrica / Reinicio en bucle">Falla de alimentación eléctrica / Reinicio en bucle</option>
                          <option value="Desconfiguración o fallo en puerto óptico de la ONU">Desconfiguración o fallo en puerto óptico de la ONU</option>
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
                        style={{ width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none", boxSizing: "border-box", backgroundColor: "#fff" }}
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
                      style={{ width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none", backgroundColor: "#fff" }}
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
                      style={{ width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", outline: "none", backgroundColor: "#fff" }}
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
                    rows={3}
                    value={nuevoReporte.descripcion}
                    onChange={(e) => setNuevoReporte({ ...nuevoReporte, descripcion: e.target.value })}
                    placeholder="Escriba los detalles específicos de la incidencia..."
                    style={{ width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", resize: "vertical", outline: "none", backgroundColor: "#fff", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      limpiarFormulario();
                      setPestanaActiva("consultar");
                    }}
                    style={{ padding: "9px 16px", backgroundColor: "#e2e8f0", color: "#334155", border: "none", borderRadius: "6px", fontWeight: "600", fontSize: "0.82rem", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{ padding: "9px 20px", backgroundColor: "#16a34a", color: "#ffffff", border: "none", borderRadius: "6px", fontWeight: "700", fontSize: "0.82rem", cursor: "pointer" }}
                  >
                    {idReporteEditando ? "Actualizar" : "Guardar"}
                  </button>
                </div>

              </form>
            </div>
          )}
        </>
      )}

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

export default ReporteFallas;
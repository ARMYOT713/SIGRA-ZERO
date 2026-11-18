import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ResumenGlobal.css';

function Resumen() {
  const [metricas, setMetricas] = useState({
    postesTotales: 0,
    postesActivos: 0,
    postesInactivos: 0,
    postesPorLocalidad: {},

    napsTotales: 0,
    napsActivas: 0,
    napsInactivas: 0,
    napsPorLocalidad: {},

    clientesTotales: 0,
    clientesActivos: 0,
    clientesSuspendidos: 0,
    clientesCancelados: 0,
    clientesPorLocalidad: {},

    reportesPendientesTotales: 0,
    reportesCompletadosTotales: 0,
    resumenSoportes: []
  });

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    cargarDatosResumen(true);
    const intervalo = setInterval(() => {
      cargarDatosResumen(false);
    }, 15000);
    return () => clearInterval(intervalo);
  }, []);

  const cargarDatosResumen = async (mostrarCargaInicial = false) => {
    if (mostrarCargaInicial) setCargando(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const [resPostes, resNaps, resClientes, resReportes] = await Promise.all([
        fetch('https://sigra-zero.onrender.com/api/red/postes', { headers }).catch(() => ({ ok: false })),
        fetch('https://sigra-zero.onrender.com/api/red/naps', { headers }).catch(() => ({ ok: false })),
        fetch('https://sigra-zero.onrender.com/api/red/clientes', { headers }).catch(() => ({ ok: false })),
        fetch('https://sigra-zero.onrender.com/api/red/reportes', { headers }).catch(() => ({ ok: false }))
      ]);

      const dataPostes = resPostes.ok ? await resPostes.json() : [];
      const dataNaps = resNaps.ok ? await resNaps.json() : [];
      const dataClientes = resClientes.ok ? await resClientes.json() : [];
      const dataReportes = resReportes.ok ? await resReportes.json() : [];

      const esActivoReal = (item) => {
        const val = item.estado ?? item.estatus ?? item.status;
        if (val === undefined || val === null) return true;
        const str = String(val).trim().toUpperCase();
        return str === 'ACTIVO' || str === 'ACTIVADO' || str === 'TRUE' || str === '1' || val === true || val === 1;
      };

      const obtenerLocalidad = (item) => {
        const loc = item.localidad || item.municipio || item.barrio || item.ubicacion;
        if (!loc || String(loc).trim() === '') return 'MX-B1';
        return String(loc).trim().toUpperCase().replace(/_/g, '-');
      };

      const esOnuDetectada = (item) => {
        const tipoUpper = String(item.tipo || '').toUpperCase();
        const codigoUpper = String(item.codigo || item.cliente_ref || '').toUpperCase();
        return tipoUpper === 'ONU' || item.es_onu === true || codigoUpper.includes('ONU');
      };

      // 1. Postes
      let pAct = 0, pInact = 0;
      const postesLoc = {};
      const listaPostes = Array.isArray(dataPostes) ? dataPostes : (dataPostes.postes || []);
      listaPostes.forEach(p => {
        if (esActivoReal(p)) pAct++; else pInact++;
        const loc = obtenerLocalidad(p);
        postesLoc[loc] = (postesLoc[loc] || 0) + 1;
      });

      // 2. NAPs
      let napsAct = 0, napsInact = 0;
      const napsLoc = {};
      const listaNaps = Array.isArray(dataNaps) ? dataNaps : (dataNaps.naps || []);
      listaNaps.forEach(n => {
        if (esActivoReal(n)) napsAct++; else napsInact++;
        const loc = obtenerLocalidad(n);
        napsLoc[loc] = (napsLoc[loc] || 0) + 1;
      });

      // 3. Clientes (excluyendo ONUs para que el conteo coincida con la pestaña Clientes)
      const listaClientesCruda = Array.isArray(dataClientes) ? dataClientes : (dataClientes.clientes || []);
      const listaClientesReales = listaClientesCruda.filter(c => !esOnuDetectada(c));

      let cliAct = 0, cliSusp = 0, cliCanc = 0;
      const cliLoc = {};
      listaClientesReales.forEach(c => {
        const estadoStr = String(c.estado || (c.estatus === false ? 'CANCELADO' : 'ACTIVO')).toUpperCase();
        if (estadoStr.includes('SUSP')) cliSusp++;
        else if (estadoStr.includes('CANC')) cliCanc++;
        else cliAct++;

        const loc = obtenerLocalidad(c);
        cliLoc[loc] = (cliLoc[loc] || 0) + 1;
      });

      // 4. Reportes
      let pendientesCount = 0;
      let completadosCount = 0;
      const conteoPorSoporte = {};
      const listaReportes = Array.isArray(dataReportes) ? dataReportes : (dataReportes.reportes || []);

      listaReportes.forEach(rep => {
        const esPendiente = rep.estatus === true || rep.estatus === 1 || String(rep.estatus).toLowerCase() === 'pendiente';
        if (esPendiente) {
          pendientesCount++;
          const tecNombre = rep.tecnico_asignado || rep.soporte_asignado || (rep.tecnico?.nombre_completo) || 'SIN ASIGNAR';
          conteoPorSoporte[tecNombre] = (conteoPorSoporte[tecNombre] || 0) + 1;
        } else {
          completadosCount++;
        }
      });

      const listaResumenSoportes = Object.entries(conteoPorSoporte).map(([nombre, cant]) => ({
        nombre,
        pendientes: cant
      }));

      setMetricas({
        postesTotales: listaPostes.length,
        postesActivos: pAct,
        postesInactivos: pInact,
        postesPorLocalidad: postesLoc,

        napsTotales: listaNaps.length,
        napsActivas: napsAct,
        napsInactivas: napsInact,
        napsPorLocalidad: napsLoc,

        clientesTotales: listaClientesReales.length,
        clientesActivos: cliAct,
        clientesSuspendidos: cliSusp,
        clientesCancelados: cliCanc,
        clientesPorLocalidad: cliLoc,

        reportesPendientesTotales: pendientesCount,
        reportesCompletadosTotales: completadosCount,
        resumenSoportes: listaResumenSoportes
      });

      setError('');
    } catch (err) {
      console.error('Error al cargar datos del resumen:', err);
      setError('No se pudo conectar con la base de datos de SIGRA.');
    } finally {
      if (mostrarCargaInicial) setCargando(false);
    }
  };

  return (
    <div className="resumen-container">
      {/* CABECERA */}
      <div className="resumen-header">
        <h2>Resumen Global de Red</h2>
        <div className="resumen-header-line"></div>
        <p>Indicadores clave de infraestructura y soporte técnico en tiempo real.</p>
      </div>

      {error && <div className="resumen-error">{error}</div>}

      {/* CONTENEDOR DE 4 TARJETAS HORIZONTALES */}
      <div className="kpi-grid-horizontal">
        
        {/* TARJETA 1: POSTES */}
        <div className="kpi-card-extended" onClick={() => navigate('/dispositivos?filtro=postes')}>
          <div className="kpi-header-block">
            <span className="kpi-title">POSTES</span>
            <div className="kpi-main-number">{cargando ? '...' : metricas.postesTotales}</div>
          </div>

          <div className="kpi-status-group status-column">
            <div><span className="pill-active">● ACTIVOS: {metricas.postesActivos}</span></div>
            <div><span className="pill-danger">● DESACTIVADOS: {metricas.postesInactivos}</span></div>
          </div>

          <div className="kpi-section-divider"></div>

          <div className="kpi-subcontent">
            <span className="kpi-subtitle">Distribución por Localidad:</span>
            <div className="localidades-scroll-list">
              {Object.keys(metricas.postesPorLocalidad).length > 0 ? (
                Object.entries(metricas.postesPorLocalidad).map(([loc, cnt]) => (
                  <div key={loc} className="loc-row">
                    <span className="loc-badge">{loc}</span>
                    <strong className="loc-count">{cnt}</strong>
                  </div>
                ))
              ) : (
                <span className="no-data">Sin registros</span>
              )}
            </div>
          </div>
        </div>

        {/* TARJETA 2: CAJAS NAP */}
        <div className="kpi-card-extended" onClick={() => navigate('/dispositivos?filtro=naps')}>
          <div className="kpi-header-block">
            <span className="kpi-title">CAJAS NAP</span>
            <div className="kpi-main-number">{cargando ? '...' : metricas.napsTotales}</div>
          </div>

          <div className="kpi-status-group status-column">
            <div><span className="pill-active">● ACTIVAS: {metricas.napsActivas}</span></div>
            <div><span className="pill-danger">● DESACTIVADAS: {metricas.napsInactivas}</span></div>
          </div>

          <div className="kpi-section-divider"></div>

          <div className="kpi-subcontent">
            <span className="kpi-subtitle">Distribución por Localidad:</span>
            <div className="localidades-scroll-list">
              {Object.keys(metricas.napsPorLocalidad).length > 0 ? (
                Object.entries(metricas.napsPorLocalidad).map(([loc, cnt]) => (
                  <div key={loc} className="loc-row">
                    <span className="loc-badge">{loc}</span>
                    <strong className="loc-count">{cnt}</strong>
                  </div>
                ))
              ) : (
                <span className="no-data">Sin registros</span>
              )}
            </div>
          </div>
        </div>

        {/* TARJETA 3: CLIENTES REGISTRADOS */}
        <div className="kpi-card-extended" onClick={() => navigate('/dispositivos?filtro=clientes')}>
          <div className="kpi-header-block">
            <span className="kpi-title">CLIENTES</span>
            <div className="kpi-main-number">{cargando ? '...' : metricas.clientesTotales}</div>
          </div>

          <div className="kpi-status-group status-column">
            <div><span className="pill-active">● ACTIVOS: {metricas.clientesActivos}</span></div>
            <div><span className="pill-warning">● SUSPENDIDOS: {metricas.clientesSuspendidos}</span></div>
            <div><span className="pill-danger">● CANCELADOS: {metricas.clientesCancelados}</span></div>
          </div>

          <div className="kpi-section-divider"></div>

          <div className="kpi-subcontent">
            <span className="kpi-subtitle">Distribución por Localidad:</span>
            <div className="localidades-scroll-list">
              {Object.keys(metricas.clientesPorLocalidad).length > 0 ? (
                Object.entries(metricas.clientesPorLocalidad).map(([loc, cnt]) => (
                  <div key={loc} className="loc-row">
                    <span className="loc-badge">{loc}</span>
                    <strong className="loc-count">{cnt}</strong>
                  </div>
                ))
              ) : (
                <span className="no-data">Sin registros</span>
              )}
            </div>
          </div>
        </div>

        {/* TARJETA 4: REPORTES / SOPORTE PENDIENTE */}
        <div 
          className="kpi-card-extended alerta" 
          onClick={() => navigate('/reportes?filtro=PENDIENTES')}
        >
          <div className="kpi-header-block">
            <span className="kpi-title">REPORTES / SOPORTE PENDIENTE</span>
            <div className="kpi-main-number alerta">
              {cargando ? '...' : metricas.reportesPendientesTotales}
            </div>
          </div>

          <div className="kpi-status-group status-column">
            <div><span className="subtext-alerta">● ATENCIONES EN CAMPO: {metricas.reportesPendientesTotales}</span></div>
            <div><span className="pill-active">● COMPLETADOS: {metricas.reportesCompletadosTotales}</span></div>
          </div>

          <div className="kpi-section-divider"></div>

          <div className="kpi-subcontent">
            <span className="kpi-subtitle">Soportes Asignados:</span>
            <div className="localidades-scroll-list">
              {metricas.resumenSoportes.length > 0 ? (
                metricas.resumenSoportes.map((sop, idx) => (
                  <div key={idx} className="soporte-resumen-row">
                    <span className="soporte-tag">Soporte: {sop.nombre.toUpperCase()}</span>
                    <strong className={sop.pendientes > 0 ? 'cant-pendiente' : 'cant-cero'}>
                      {sop.pendientes} PEND.
                    </strong>
                  </div>
                ))
              ) : (
                <span className="no-pending-text">✓ SIN PENDIENTES ASIGNADOS</span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Resumen;
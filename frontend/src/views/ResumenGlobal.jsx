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

    onusTotales: 0,
    onusActivas: 0,
    onusDesactivadas: 0,
    onusMantenimiento: 0,
    onusPorLocalidad: {},

    reportesPendientesTotales: 0,
    reportesCompletadosTotales: 0,
    resumenSoportes: []
  });

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'exito' });

  const navigate = useNavigate();

  const mostrarAlertaFlotante = (mensaje, tipo = 'exito') => {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => {
      setNotificacion(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  useEffect(() => {
    cargarDatosResumen(false);
  }, []);

  const cargarDatosResumen = async (mostrarToastConfirmacion = false) => {
    setCargando(true);
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

      // 3. Separar Clientes reales y ONUs (misma lógica que Dispositivos.jsx)
      const listaClientesCruda = Array.isArray(dataClientes) ? dataClientes : (dataClientes.clientes || []);
      const listaClientesReales = listaClientesCruda.filter(c => !esOnuDetectada(c));
      const listaOnusReales = listaClientesCruda.filter(c => esOnuDetectada(c));

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

      // 4. ONUs
      let onuAct = 0, onuDesact = 0, onuMant = 0;
      const onuLoc = {};
      listaOnusReales.forEach(o => {
        const estadoStr = String(o.estado || (o.estatus === false ? 'DESACTIVADO' : 'ACTIVO')).toUpperCase();
        if (estadoStr.includes('MANT')) onuMant++;
        else if (estadoStr.includes('DESACT') || estadoStr.includes('INACT')) onuDesact++;
        else onuAct++;

        const loc = obtenerLocalidad(o);
        onuLoc[loc] = (onuLoc[loc] || 0) + 1;
      });

      // 5. Reportes
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

        onusTotales: listaOnusReales.length,
        onusActivas: onuAct,
        onusDesactivadas: onuDesact,
        onusMantenimiento: onuMant,
        onusPorLocalidad: onuLoc,

        reportesPendientesTotales: pendientesCount,
        reportesCompletadosTotales: completadosCount,
        resumenSoportes: listaResumenSoportes
      });

      setError('');
      if (mostrarToastConfirmacion) {
        mostrarAlertaFlotante('Indicadores actualizados en tiempo real.');
      }
    } catch (err) {
      console.error('Error al cargar datos del resumen:', err);
      setError('No se pudo conectar con la base de datos de SIGRA.');
      if (mostrarToastConfirmacion) {
        mostrarAlertaFlotante('Error al sincronizar los indicadores.', 'error');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="resumen-container">
      {/* CABECERA ESTANDARIZADA */}
      <div className="resumen-header-top">
        <div className="resumen-header">
          <h2>Resumen Global de Red</h2>
          <div className="resumen-header-line"></div>
          <p>Indicadores clave de infraestructura y soporte técnico en tiempo real.</p>
        </div>

        <button
          onClick={() => cargarDatosResumen(true)}
          disabled={cargando}
          className="btn-actualizar-resumen"
        >
          {cargando ? 'Actualizando...' : 'Actualizar Indicadores'}
        </button>
      </div>

      {error && <div className="resumen-error">{error}</div>}

      {/* CONTENEDOR DE TARJETAS HORIZONTALES */}
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

        {/* TARJETA 4: EQUIPOS ONU */}
        <div className="kpi-card-extended" onClick={() => navigate('/dispositivos?filtro=onus')}>
          <div className="kpi-header-block">
            <span className="kpi-title">ONUS</span>
            <div className="kpi-main-number">{cargando ? '...' : metricas.onusTotales}</div>
          </div>

          <div className="kpi-status-group status-column">
            <div><span className="pill-active">● ACTIVAS: {metricas.onusActivas}</span></div>
            <div><span className="pill-info">● MANTENIMIENTO: {metricas.onusMantenimiento}</span></div>
            <div><span className="pill-danger">● DESACTIVADAS: {metricas.onusDesactivadas}</span></div>
          </div>

          <div className="kpi-section-divider"></div>

          <div className="kpi-subcontent">
            <span className="kpi-subtitle">Distribución por Localidad:</span>
            <div className="localidades-scroll-list">
              {Object.keys(metricas.onusPorLocalidad).length > 0 ? (
                Object.entries(metricas.onusPorLocalidad).map(([loc, cnt]) => (
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

        {/* TARJETA 5: REPORTES / SOPORTE PENDIENTE */}
        <div 
          className="kpi-card-extended alerta" 
          onClick={() => navigate('/reportes?filtro=PENDIENTES')}
        >
          <div className="kpi-header-block">
            <span className="kpi-title">REPORTES PENDIENTES</span>
            <div className="kpi-main-number alerta">
              {cargando ? '...' : metricas.reportesPendientesTotales}
            </div>
          </div>

          <div className="kpi-status-group status-column">
            <div><span className="subtext-alerta">● EN CAMPO: {metricas.reportesPendientesTotales}</span></div>
            <div><span className="pill-active">● COMPLETADOS: {metricas.reportesCompletadosTotales}</span></div>
          </div>

          <div className="kpi-section-divider"></div>

          <div className="kpi-subcontent">
            <span className="kpi-subtitle">Soportes Asignados:</span>
            <div className="localidades-scroll-list">
              {metricas.resumenSoportes.length > 0 ? (
                metricas.resumenSoportes.map((sop, idx) => (
                  <div key={idx} className="soporte-resumen-row">
                    <span className="soporte-tag">{sop.nombre.toUpperCase()}</span>
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

      {/* TOAST FLOTANTE ESTANDARIZADO EN ESQUINA INFERIOR DERECHA */}
      {notificacion.visible && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: notificacion.tipo === 'error' ? '#dc2626' : '#16a34a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          zIndex: 9999,
          fontSize: '0.85rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{notificacion.mensaje}</span>
        </div>
      )}
    </div>
  );
}

export default Resumen;
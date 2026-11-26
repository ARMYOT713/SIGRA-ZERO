import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';

const CATALOGO_LOCALIDADES = [
  { codigo: "MX-B1", nombre: "MX-B1 - Santiaguito Maxda (Barrio 1)" },
  { codigo: "MX-B2", nombre: "MX-B2 - Santiaguito Maxda (Barrio 2)" },
  { codigo: "MX-B3", nombre: "MX-B3 - Santiaguito Maxda (Barrio 3)" },
  { codigo: "MX-B4", nombre: "MX-B4 - Santiaguito Maxda (Barrio 4)" },
  { codigo: "CM", nombre: "CM - Cabecera Municipal" },
  { codigo: "BI", nombre: "BI - Barrio Iturbide" },
  { codigo: "BH", nombre: "BH - Barrio Hidalgo" },
  { codigo: "BM", nombre: "BM - Barrio Morelos" },
  { codigo: "ICJ", nombre: "ICJ - Ixcaja" },
  { codigo: "YDJ", nombre: "YDJ - Yondeje" }
];

function GestionKMZ() {
  const [pestanaActiva, setPestanaActiva] = useState('importacion');

  // Estados de importación
  const [elementosLeidos, setElementosLeidos] = useState([]);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [localidadLoteImportacion, setLocalidadLoteImportacion] = useState('MX-B1');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('success');
  const [filtroBusquedaImportacion, setFiltroBusquedaImportacion] = useState('');

  // Estados de exportación y filtros
  const [elementosExportar, setElementosExportar] = useState([]);
  const [cargandoExportacion, setCargandoExportacion] = useState(false);
  const [mensajeExportacion, setMensajeExportacion] = useState('');
  const [filtroBusquedaExportacion, setFiltroBusquedaExportacion] = useState('');
  const [filtroTipoExportacion, setFiltroTipoExportacion] = useState('TODOS');

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const formatearLocalidadVista = (loc) => {
    if (!loc) return 'MX-B1';
    return String(loc).trim().toUpperCase().replace(/_/g, '-');
  };

  const normalizarLocalidadBD = (loc) => {
    if (!loc) return 'MX_B1';
    const limpio = String(loc).trim().toUpperCase().replace(/-/g, '_');
    const validas = ['MX_B1', 'MX_B2', 'MX_B3', 'MX_B4', 'CM', 'BI', 'BH', 'BM', 'ICJ', 'YDJ'];
    return validas.includes(limpio) ? limpio : 'MX_B1';
  };

  const cambiarLocalidadTodoElLote = (nuevaLoc) => {
    setLocalidadLoteImportacion(nuevaLoc);
    setElementosLeidos(prev => prev.map(item => ({ ...item, localidad: nuevaLoc })));
  };

  const cambiarLocalidadPuntoIndividual = (idPunto, nuevaLoc) => {
    setElementosLeidos(prev => prev.map(item => item.id === idPunto ? { ...item, localidad: nuevaLoc } : item));
  };

  // --- LÓGICA DE IMPORTACIÓN ROBUSTA CON FILTRADO DE DUPLICADOS ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setNombreArchivo(file.name);
    setCargando(true);
    setMensaje('');

    try {
      const token = localStorage.getItem('token');
      
      try {
        const resVerificacion = await fetch(`https://sigra-zero.onrender.com/api/red/verificar-archivo?nombre=${encodeURIComponent(file.name)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resVerificacion.ok) {
          const data = await resVerificacion.json().catch(() => ({}));
          if (data.yaExiste) {
            setTipoMensaje('error');
            setMensaje('Este archivo ya se leyó anteriormente y sus elementos ya están registrados.');
            setCargando(false);
            limpiarSeleccion();
            return;
          }
        }
      } catch (err) {
        console.warn('Verificación de archivo omitida o no disponible:', err);
      }

      const headers = { 'Authorization': `Bearer ${token}` };
      const [resPostes, resNaps, resClientes] = await Promise.all([
        fetch('https://sigra-zero.onrender.com/api/red/postes', { headers }).catch(() => ({ ok: false })),
        fetch('https://sigra-zero.onrender.com/api/red/naps', { headers }).catch(() => ({ ok: false })),
        fetch('https://sigra-zero.onrender.com/api/red/clientes', { headers }).catch(() => ({ ok: false }))
      ]);

      const codigosExistentes = new Set();
      
      if (resPostes.ok) {
        const data = await resPostes.json().catch(() => ([]));
        const lista = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : (data.postes || []));
        lista.forEach(item => {
          const cod = item.codigo || item.nombre;
          if (cod) codigosExistentes.add(cod.trim().toLowerCase());
        });
      }

      if (resNaps.ok) {
        const data = await resNaps.json().catch(() => ([]));
        const lista = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : (data.naps || []));
        lista.forEach(item => {
          const cod = item.codigo_nap || item.codigo || item.nombre;
          if (cod) codigosExistentes.add(cod.trim().toLowerCase());
        });
      }

      if (resClientes.ok) {
        const data = await resClientes.json().catch(() => ([]));
        const lista = Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : (data.clientes || []));
        lista.forEach(item => {
          const cod = item.cliente_ref || item.codigo || item.nombre;
          if (cod) codigosExistentes.add(cod.trim().toLowerCase());
        });
      }

      let kmlText = '';
      if (file.name.endsWith('.kmz') || file.name.endsWith('.ZIP') || file.name.endsWith('.zip')) {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);
        const kmlFileName = Object.keys(zipContent.files).find(filename => filename.toLowerCase().endsWith('.kml'));
        
        if (!kmlFileName) throw new Error('No se encontró ningún archivo .kml válido dentro del contenedor KMZ.');
        kmlText = await zipContent.files[kmlFileName].async('text');
      } else if (file.name.endsWith('.kml')) {
        kmlText = await file.text();
      } else {
        throw new Error('Formato no soportado. Sube un archivo .kmz o .kml válido.');
      }

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
      const placemarks = xmlDoc.getElementsByTagName('Placemark');
      const puntosExtraidos = [];
      let duplicadosOmitidos = 0;

      for (let i = 0; i < placemarks.length; i++) {
        const pm = placemarks[i];
        const name = pm.getElementsByTagName('name')[0]?.textContent?.trim() || `Punto ${i + 1}`;
        const coordsText = pm.getElementsByTagName('coordinates')[0]?.textContent?.trim() || '';
        
        if (coordsText) {
          const primeraCoordenada = coordsText.split(/\s+/)[0];
          const partes = primeraCoordenada.split(',');

          if (partes.length >= 2) {
            const lngNum = parseFloat(partes[0]);
            const latNum = parseFloat(partes[1]);

            if (!isNaN(latNum) && !isNaN(lngNum)) {
              if (codigosExistentes.has(name.toLowerCase())) {
                duplicadosOmitidos++;
                continue;
              }

              const nameLower = name.toLowerCase();
              let tipoDetectado = 'POSTE';

              if (nameLower.includes('nap') || nameLower.includes('caja') || nameLower.includes('splitter')) {
                tipoDetectado = 'NAP';
              } else if (nameLower.includes('onu') || nameLower.includes('modem') || nameLower.includes('cliente')) {
                tipoDetectado = 'ONU';
              } else if (nameLower.includes('site') || nameLower.includes('olt') || nameLower.includes('cent')) {
                tipoDetectado = 'SITE';
              }

              puntosExtraidos.push({ 
                id: i + 1, 
                nombre: name, 
                latitud: latNum, 
                longitud: lngNum,
                tipo: tipoDetectado,
                localidad: localidadLoteImportacion
              });
            }
          }
        }
      }

      if (puntosExtraidos.length === 0) {
        setTipoMensaje('error');
        setMensaje(duplicadosOmitidos > 0 
          ? 'Los elementos del archivo ya se encuentran registrados en el sistema.' 
          : 'El archivo no contiene puntos geográficos válidos (Placemarks con coordenadas).');
        setElementosLeidos([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setElementosLeidos(puntosExtraidos);
        setTipoMensaje('success');
        let msg = 'Se leyó el archivo correctamente.';
        if (duplicadosOmitidos > 0) {
          msg += ` (Se omitieron ${duplicadosOmitidos} elementos por ya estar registrados).`;
        }
        setMensaje(msg);
      }
    } catch (error) {
      console.error('Error al procesar el archivo:', error);
      setTipoMensaje('error');
      setMensaje(`Error al leer el archivo: ${error.message || error}`);
      limpiarSeleccion();
    } finally {
      setCargando(false);
    }
  };

  const limpiarSeleccion = () => {
    setElementosLeidos([]);
    setNombreArchivo('');
    setMensaje('');
    setFiltroBusquedaImportacion('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const elementosFiltradosImportacion = elementosLeidos.filter(item => 
    item.nombre.toLowerCase().includes(filtroBusquedaImportacion.toLowerCase()) ||
    item.latitud.toString().includes(filtroBusquedaImportacion) ||
    item.longitud.toString().includes(filtroBusquedaImportacion) ||
    item.tipo.toLowerCase().includes(filtroBusquedaImportacion.toLowerCase()) ||
    (item.localidad || '').toLowerCase().includes(filtroBusquedaImportacion.toLowerCase())
  );

  // --- GUARDADO INTELIGENTE Y SEGURO HACIA EL BACKEND ---
  const guardarInfraestructuraEnMapa = async () => {
    if (guardando || elementosLeidos.length === 0) return;
    setGuardando(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setTipoMensaje('error');
        setMensaje('Error: No hay sesión activa. Vuelve a iniciar sesión.');
        setGuardando(false);
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      let ultimoPunto = null;

      for (const item of elementosLeidos) {
        const localidadBD = normalizarLocalidadBD(item.localidad || localidadLoteImportacion);
        let endpoint = 'https://sigra-zero.onrender.com/api/red/postes';
        let bodyData = {
          codigo: item.nombre,
          localidad: localidadBD,
          estado: 'ACTIVO',
          latitud: item.latitud,
          longitud: item.longitud,
          archivo_kmz: nombreArchivo
        };

        if (item.tipo === 'NAP') {
          endpoint = 'https://sigra-zero.onrender.com/api/red/naps';
          bodyData = {
            codigo_nap: item.nombre,
            localidad: localidadBD,
            estado: 'ACTIVO',
            latitud: item.latitud,
            longitud: item.longitud,
            archivo_kmz: nombreArchivo
          };
        } else if (item.tipo === 'ONU' || item.tipo === 'SITE') {
          endpoint = 'https://sigra-zero.onrender.com/api/red/clientes';
          bodyData = {
            cliente_ref: item.nombre,
            nombre_completo: item.nombre,
            localidad: localidadBD,
            estatus: true,
            estado: 'ACTIVO',
            tipo: 'ONU',
            es_onu: true,
            latitud: item.latitud,
            longitud: item.longitud
          };
        }

        const respuesta = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyData)
        });

        if (respuesta.status === 401 || respuesta.status === 403) {
          throw new Error('Sesión expirada o sin permisos.');
        }

        ultimoPunto = item;
      }

      setTipoMensaje('success');
      setMensaje('Infraestructura guardada y clasificada con éxito. Redirigiendo al mapa...');
      
      setTimeout(() => {
        navigate('/mapa', { 
          state: { centrarLat: ultimoPunto?.latitud, centrarLng: ultimoPunto?.longitud, zoom: 18 } 
        });
      }, 2500);

    } catch (error) {
      console.error('Error al guardar en el mapa:', error);
      setTipoMensaje('error');
      setMensaje(`Ocurrió un error al registrar los puntos: ${error.message}`);
      setGuardando(false);
    }
  };

  // --- LÓGICA DE EXPORTACIÓN (Postes, NAPs y ONUs) ---
  const cargarElementosParaExportar = async () => {
    setCargandoExportacion(true);
    setMensajeExportacion('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const headers = { 'Authorization': `Bearer ${token}` };

      const [resPostes, resNaps, resClientes] = await Promise.all([
        fetch('https://sigra-zero.onrender.com/api/red/postes', { headers }),
        fetch('https://sigra-zero.onrender.com/api/red/naps', { headers }),
        fetch('https://sigra-zero.onrender.com/api/red/clientes', { headers })
      ]);

      if (resPostes.status === 401 || resNaps.status === 401 || resClientes.status === 401) {
        navigate('/login');
        return;
      }

      let todosLosElementos = [];

      if (resPostes.ok) {
        const dataPostes = await resPostes.json();
        const listaPostes = Array.isArray(dataPostes) ? dataPostes : (Array.isArray(dataPostes.data) ? dataPostes.data : (dataPostes.postes || []));
        todosLosElementos.push(...listaPostes.map(item => ({
          ...item,
          realId: item.id || item.poste_id || item.id_poste || item._id,
          codigo: item.codigo || item.codigo_poste || item.nombre,
          localidad: formatearLocalidadVista(item.localidad),
          tipoElemento: 'POSTE'
        })));
      }

      if (resNaps.ok) {
        const dataNaps = await resNaps.json();
        const listaNaps = Array.isArray(dataNaps) ? dataNaps : (Array.isArray(dataNaps.data) ? dataNaps.data : (dataNaps.naps || []));
        todosLosElementos.push(...listaNaps.map(item => ({
          ...item,
          realId: item.id || item.nap_id || item.id_nap || item._id,
          codigo: item.codigo_nap || item.codigo || item.nombre,
          localidad: formatearLocalidadVista(item.localidad),
          tipoElemento: 'NAP'
        })));
      }

      if (resClientes.ok) {
        const dataClientes = await resClientes.json();
        const listaClientesCruda = Array.isArray(dataClientes) ? dataClientes : (Array.isArray(dataClientes.data) ? dataClientes.data : (dataClientes.clientes || []));
        const listaOnus = listaClientesCruda.filter(item => {
          const tipoUpper = (item.tipo || '').toUpperCase();
          const codigoUpper = (item.codigo || item.cliente_ref || item.nombre || '').toUpperCase();
          return tipoUpper === 'ONU' || item.es_onu === true || codigoUpper.includes('ONU');
        });

        todosLosElementos.push(...listaOnus.map(item => ({
          ...item,
          realId: item.id || item.cliente_id || item.id_cliente || item._id,
          codigo: item.cliente_ref || item.codigo || item.nombre,
          localidad: formatearLocalidadVista(item.localidad),
          tipoElemento: 'ONU'
        })));
      }

      setElementosExportar(todosLosElementos);
    } catch (error) {
      console.error('Error:', error);
      setMensajeExportacion('No se pudo conectar con el servidor para cargar la infraestructura.');
    } finally {
      setCargandoExportacion(false);
    }
  };

  const irAlMapaGeolocalizacion = (el) => {
    let tipoParam = 'poste';
    if (el.tipoElemento === 'NAP') tipoParam = 'nap';
    else if (el.tipoElemento === 'ONU') tipoParam = 'onu';

    const idBuscado = el.realId || el.id || el.poste_id || el.id_nap || el.id_cliente;
    const lat = el.latitud ?? el.lat;
    const lng = el.longitud ?? el.lng;

    if (lat !== undefined && lng !== undefined && lat !== null && lng !== null) {
      if (idBuscado) {
        window.location.href = `/mapa?lat=${lat}&lng=${lng}&tipo=${tipoParam}&id=${idBuscado}&zoom=18`;
      } else {
        window.location.href = `/mapa?lat=${lat}&lng=${lng}&zoom=18`;
      }
    } else {
      alert('Este elemento no cuenta con coordenadas geográficas válidas.');
    }
  };

  const elementosTablaExportar = elementosExportar.filter(el => {
    if (filtroTipoExportacion === 'POSTES' && el.tipoElemento !== 'POSTE') return false;
    if (filtroTipoExportacion === 'NAP' && el.tipoElemento !== 'NAP') return false;
    if (filtroTipoExportacion === 'ONUS' && el.tipoElemento !== 'ONU') return false;

    if (!filtroBusquedaExportacion.trim()) return true;

    const filtro = filtroBusquedaExportacion.toLowerCase().trim().replace(/_/g, '-');
    const codigo = (el.codigo || el.nombre || '').toLowerCase().replace(/_/g, '-');
    const locCodigo = (el.localidad || 'MX-B1').toLowerCase().replace(/_/g, '-');
    const locObj = CATALOGO_LOCALIDADES.find(l => l.codigo.toLowerCase() === locCodigo);
    const locNombre = locObj ? locObj.nombre.toLowerCase() : '';

    return codigo.includes(filtro) || locCodigo.includes(filtro) || locNombre.includes(filtro);
  });

  const exportarElementoKML = (el) => {
    const nombre = el.codigo || el.nombre || 'Punto';
    const lat = el.latitud ?? el.lat;
    const lng = el.longitud ?? el.lng;

    const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${nombre}.kml</name>
    <Placemark>
      <name>${nombre}</name>
      <Point>
        <coordinates>${lng},${lat},0</coordinates>
      </Point>
    </Placemark>
  </Document>
</kml>`;

    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombre}.kml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const cambiarPestana = (pestana) => {
    setPestanaActiva(pestana);
    if (pestana === 'exportacion') {
      cargarElementosParaExportar();
    }
  };

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#f8fafc', height: '100%', boxSizing: 'border-box', overflowY: 'auto', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Importación y Exportación de Archivos KMZ / KML</h2>
        <div style={{ width: '40px', height: '3px', backgroundColor: '#16a34a', marginTop: '4px', borderRadius: '2px' }}></div>
      </div>

      {/* Pestañas */}
      <div style={{ display: 'flex', gap: '30px', borderBottom: '2px solid #e2e8f0', marginBottom: '25px', marginTop: '15px' }}>
        <button
          onClick={() => cambiarPestana('importacion')}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '10px 0',
            fontSize: '0.95rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            color: pestanaActiva === 'importacion' ? '#16a34a' : '#64748b',
            borderBottom: pestanaActiva === 'importacion' ? '3px solid #16a34a' : '3px solid transparent',
            marginBottom: '-2px'
          }}
        >
          IMPORTACIÓN
        </button>
        <button
          onClick={() => cambiarPestana('exportacion')}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '10px 0',
            fontSize: '0.95rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            color: pestanaActiva === 'exportacion' ? '#16a34a' : '#64748b',
            borderBottom: pestanaActiva === 'exportacion' ? '3px solid #16a34a' : '3px solid transparent',
            marginBottom: '-2px'
          }}
        >
          EXPORTACIÓN
        </button>
      </div>

      {/* VISTA 1: IMPORTACIÓN */}
      {pestanaActiva === 'importacion' && (
        <div>
          <div style={{ 
            border: '2px dashed #cbd5e1', 
            padding: '30px', 
            borderRadius: '8px', 
            textAlign: 'center',
            backgroundColor: '#ffffff',
            marginTop: '20px'
          }}>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".kmz,.kml,.ZIP,.zip" 
              onChange={handleFileUpload}
              style={{ marginBottom: '10px' }}
            />
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Archivos compatibles: .KMZ / .KML</p>
          </div>

          {cargando && <p style={{ marginTop: '15px', fontWeight: '600', color: '#16a34a' }}>Procesando archivo...</p>}
          
          {mensaje && (
            <p style={{ marginTop: '15px', color: tipoMensaje === 'error' ? '#dc2626' : '#16a34a', fontWeight: '700' }}>
              {mensaje}
            </p>
          )}

          {elementosLeidos.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              {/* Selector de Localidad / Barrio para todo el lote a importar */}
              <div style={{ marginBottom: '16px', backgroundColor: '#ffffff', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ fontSize: '0.82rem', color: '#0369a1', fontWeight: '700' }}>
                    Asignar Localidad / Barrio a todo el archivo:
                  </label>
                  <select
                    value={localidadLoteImportacion}
                    onChange={(e) => cambiarLocalidadTodoElLote(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontWeight: '600', fontSize: '0.82rem', color: '#0f172a' }}
                  >
                    {CATALOGO_LOCALIDADES.map((loc) => (
                      <option key={loc.codigo} value={loc.codigo}>
                        {loc.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="Filtrar elementos leídos..."
                  value={filtroBusquedaImportacion}
                  onChange={(e) => setFiltroBusquedaImportacion(e.target.value)}
                  style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', width: '240px' }}
                />
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', color: '#64748b', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px' }}>Nombre / Etiqueta</th>
                    <th style={{ padding: '12px 16px' }}>Tipo Detectado</th>
                    <th style={{ padding: '12px 16px' }}>Localidad / Barrio</th>
                    <th style={{ padding: '12px 16px' }}>Latitud</th>
                    <th style={{ padding: '12px 16px' }}>Longitud</th>
                  </tr>
                </thead>
                <tbody>
                  {elementosFiltradosImportacion.map((punto) => (
                    <tr key={punto.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>{punto.nombre}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          fontWeight: '700',
                          backgroundColor: punto.tipo === 'NAP' ? '#e0f2fe' : punto.tipo === 'ONU' ? '#fef3c7' : '#dcfce7',
                          color: punto.tipo === 'NAP' ? '#0369a1' : punto.tipo === 'ONU' ? '#b45309' : '#16a34a'
                        }}>
                          {punto.tipo}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <select
                          value={punto.localidad || localidadLoteImportacion}
                          onChange={(e) => cambiarLocalidadPuntoIndividual(punto.id, e.target.value)}
                          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #bae6fd', backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                        >
                          {CATALOGO_LOCALIDADES.map((loc) => (
                            <option key={loc.codigo} value={loc.codigo}>
                              {loc.nombre}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>{punto.latitud}</td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>{punto.longitud}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '20px' }}>
                <button 
                  style={{ backgroundColor: guardando ? '#94a3b8' : '#16a34a', color: '#ffffff', border: 'none', padding: '10px 20px', fontWeight: '700', fontSize: '0.82rem', borderRadius: '6px', cursor: guardando ? 'not-allowed' : 'pointer' }}
                  onClick={guardarInfraestructuraEnMapa}
                  disabled={guardando}
                >
                  {guardando ? 'Guardando Dispositivo...' : 'Guardar Dispositivo'}
                </button>

                <button
                  onClick={limpiarSeleccion}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 20px',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: EXPORTACIÓN */}
      {pestanaActiva === 'exportacion' && (
        <div style={{ marginTop: '20px' }}>
          {cargandoExportacion && <p style={{ fontWeight: '600', color: '#16a34a' }}>Cargando elementos registrados...</p>}
          {mensajeExportacion && <p style={{ color: '#dc2626', fontWeight: '700' }}>{mensajeExportacion}</p>}

          {!cargandoExportacion && (
            <div>
              {/* Buscador Global con soporte de siglas de Localidad */}
              <div style={{ marginBottom: '16px', backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Buscador:</span>
                <input 
                  type="text"
                  placeholder="Buscar Poste, NAP u ONU por Código o Localidad (ej. MX-B1, CM, BI, YDJ)..."
                  value={filtroBusquedaExportacion}
                  onChange={(e) => setFiltroBusquedaExportacion(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '7px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: '#fff'
                  }}
                />
                {filtroBusquedaExportacion && (
                  <button 
                    onClick={() => setFiltroBusquedaExportacion('')}
                    style={{ backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '7px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {/* Botones de Filtro: TODOS, POSTES, NAP, ONUS */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { id: 'TODOS', label: 'TODOS' },
                    { id: 'POSTES', label: 'POSTES' },
                    { id: 'NAP', label: 'NAP' },
                    { id: 'ONUS', label: 'ONUS' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setFiltroTipoExportacion(tab.id)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: filtroTipoExportacion === tab.id ? '#16a34a' : '#010203',
                        color: '#ffffff',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#1e293b', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 16px' }}>Código / Nombre</th>
                      <th style={{ padding: '12px 16px' }}>Localidad / Barrio</th>
                      <th style={{ padding: '12px 16px' }}>Latitud</th>
                      <th style={{ padding: '12px 16px' }}>Longitud</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {elementosTablaExportar.length > 0 ? (
                      elementosTablaExportar.map((el, index) => {
                        const locCodigo = el.localidad || 'MX-B1';
                        const locInfo = CATALOGO_LOCALIDADES.find(l => l.codigo === locCodigo);

                        return (
                          <tr key={`${el.tipoElemento}-${el.realId || index}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>
                              {el.codigo || el.nombre}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span 
                                title={locInfo ? locInfo.nombre : locCodigo}
                                style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}
                              >
                                {locCodigo}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: '#334155' }}>{el.latitud ?? el.lat}</td>
                            <td style={{ padding: '12px 16px', color: '#334155' }}>{el.longitud ?? el.lng}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <button
                                onClick={() => irAlMapaGeolocalizacion(el)}
                                style={{
                                  backgroundColor: '#0284c7',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  fontWeight: '600',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  marginRight: '8px'
                                }}
                              >
                                Ubicar Pin
                              </button>
                              <button
                                onClick={() => exportarElementoKML(el)}
                                style={{
                                  backgroundColor: '#16a34a',
                                  color: '#ffffff',
                                  border: 'none',
                                  padding: '6px 12px',
                                  borderRadius: '4px',
                                  fontWeight: '600',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer'
                                }}
                              >
                                Exportar KML
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                          No se encontraron Postes, Cajas NAP u ONUs que coincidan con la búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GestionKMZ;
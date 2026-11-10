import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';

function GestionKMZ() {
  const [pestanaActiva, setPestanaActiva] = useState('importacion');

  // Estados de importación
  const [elementosLeidos, setElementosLeidos] = useState([]);
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('success');
  const [filtroBusquedaImportacion, setFiltroBusquedaImportacion] = useState('');

  // Estados de exportación y buscador flotante
  const [elementosExportar, setElementosExportar] = useState([]);
  const [cargandoExportacion, setCargandoExportacion] = useState(false);
  const [mensajeExportacion, setMensajeExportacion] = useState('');
  const [filtroBusquedaExportacion, setFiltroBusquedaExportacion] = useState('');

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  // --- LÓGICA DE IMPORTACIÓN ROBUSTA CON FILTRADO DE DUPLICADOS ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setNombreArchivo(file.name);
    setCargando(true);
    setMensaje('');

    try {
      const token = localStorage.getItem('token');
      
      // 1. Validación previa de archivo duplicado completo en servidor
      try {
        const resVerificacion = await fetch(`http://localhost:3000/api/red/verificar-archivo?nombre=${encodeURIComponent(file.name)}`, {
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

      // 2. Obtener elementos existentes en la BD para filtrar duplicados individuales por nombre/código
      const headers = { 'Authorization': `Bearer ${token}` };
      const [resPostes, resNaps, resOnus] = await Promise.all([
        fetch('http://localhost:3000/api/red/postes', { headers }).catch(() => ({ ok: false })),
        fetch('http://localhost:3000/api/red/naps', { headers }).catch(() => ({ ok: false })),
        fetch('http://localhost:3000/api/red/onus', { headers }).catch(() => ({ ok: false }))
      ]);

      const codigosExistentes = new Set();
      
      if (resPostes.ok) {
        const data = await resPostes.json().catch(() => ([]));
        const lista = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        lista.forEach(item => {
          const cod = item.codigo || item.nombre;
          if (cod) codigosExistentes.add(cod.trim().toLowerCase());
        });
      }

      if (resNaps.ok) {
        const data = await resNaps.json().catch(() => ([]));
        const lista = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        lista.forEach(item => {
          const cod = item.codigo_nap || item.codigo || item.nombre;
          if (cod) codigosExistentes.add(cod.trim().toLowerCase());
        });
      }

      if (resOnus.ok) {
        const data = await resOnus.json().catch(() => ([]));
        const lista = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        lista.forEach(item => {
          const cod = item.codigo || item.nombre;
          if (cod) codigosExistentes.add(cod.trim().toLowerCase());
        });
      }

      // 3. Lectura de KML o KMZ
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
                tipo: tipoDetectado 
              });
            }
          }
        }
      }

      if (puntosExtraidos.length === 0) {
        setTipoMensaje('error');
        setMensaje(duplicadosOmitidos > 0 
          ? `El archivo ya se encuentran registrados en el sistema` 
          : 'El archivo no contiene puntos geográficos válidos (Placemarks con coordenadas).');
        setElementosLeidos([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setElementosLeidos(puntosExtraidos);
        setTipoMensaje('success');
        let msg = `Se leyo el archivo correctamente`;
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
    item.tipo.toLowerCase().includes(filtroBusquedaImportacion.toLowerCase())
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
        let endpoint = 'http://localhost:3000/api/red/postes';
        let bodyData = {
          codigo: item.nombre,
          latitud: item.latitud,
          longitud: item.longitud,
          archivo_kmz: nombreArchivo
        };

        if (item.tipo === 'NAP') {
          endpoint = 'http://localhost:3000/api/red/naps';
          bodyData = {
            codigo_nap: item.nombre,
            latitud: item.latitud,
            longitud: item.longitud,
            archivo_kmz: nombreArchivo
          };
        } else if (item.tipo === 'ONU') {
          endpoint = 'http://localhost:3000/api/red/onus';
          bodyData = {
            codigo: item.nombre,
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
      setMensaje('¡Infraestructura guardada y clasificada con éxito! Redirigiendo al mapa...');
      
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

  // --- LÓGICA DE EXPORTACIÓN (Postes, NAPs y ONUs tipo SITE) ---
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

      const [resPostes, resNaps, resOnus] = await Promise.all([
        fetch('http://localhost:3000/api/red/postes', { headers }),
        fetch('http://localhost:3000/api/red/naps', { headers }),
        fetch('http://localhost:3000/api/red/onus', { headers })
      ]);

      if (resPostes.status === 401 || resNaps.status === 401 || resOnus.status === 401) {
        navigate('/login');
        return;
      }

      let todosLosElementos = [];

      if (resPostes.ok) {
        const dataPostes = await resPostes.json();
        const listaPostes = Array.isArray(dataPostes.data) ? dataPostes.data : (Array.isArray(dataPostes) ? dataPostes : []);
        todosLosElementos.push(...listaPostes.map(item => ({ ...item, tipoElemento: 'POSTE' })));
      }

      if (resNaps.ok) {
        const dataNaps = await resNaps.json();
        const listaNaps = Array.isArray(dataNaps.data) ? dataNaps.data : (Array.isArray(dataNaps) ? dataNaps : []);
        todosLosElementos.push(...listaNaps.map(item => ({ ...item, tipoElemento: 'NAP' })));
      }

      if (resOnus.ok) {
        const dataOnus = await resOnus.json();
        const listaOnus = Array.isArray(dataOnus.data) ? dataOnus.data : (Array.isArray(dataOnus) ? dataOnus : []);
        
        const onusFiltrados = listaOnus.filter(item => {
          const nombre = (item.codigo || item.nombre || '').toLowerCase();
          return nombre.includes('site') || nombre.includes('olt') || nombre.includes('cent');
        });

        todosLosElementos.push(...onusFiltrados.map(item => ({ ...item, tipoElemento: 'ONU-SITE' })));
      }

      setElementosExportar(todosLosElementos);
    } catch (error) {
      console.error('Error:', error);
      setMensajeExportacion('No se pudo conectar con el servidor para cargar toda la infraestructura.');
    } finally {
      setCargandoExportacion(false);
    }
  };

  const elementosTablaExportar = elementosExportar.filter(el => {
    if (!filtroBusquedaExportacion.trim()) return true;
    const codigo = (el.codigo || el.nombre || '').toLowerCase();
    const filtro = filtroBusquedaExportacion.toLowerCase();
    return codigo.includes(filtro);
  });

  const exportarElementoKML = (el) => {
    const nombre = el.codigo || el.nombre || 'Punto';
    const lat = el.latitud || el.lat;
    const lng = el.longitud || el.lng;

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
    <div style={{ padding: '30px', fontFamily: 'Segoe UI, sans-serif' }}>
      <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Importación y Exportación de Archivos KMZ / KML</h2>

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
            color: pestanaActiva === 'importacion' ? '#10b981' : '#64748b',
            borderBottom: pestanaActiva === 'importacion' ? '3px solid #10b981' : '3px solid transparent',
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
            color: pestanaActiva === 'exportacion' ? '#10b981' : '#64748b',
            borderBottom: pestanaActiva === 'exportacion' ? '3px solid #10b981' : '3px solid transparent',
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
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Archivos compatibles: .KMZ / .KML </p>
          </div>

          {cargando && <p style={{ marginTop: '15px', fontWeight: '600', color: '#10b981' }}>Procesando archivo ...</p>}
          
          {mensaje && (
            <p style={{ marginTop: '15px', color: tipoMensaje === 'error' ? '#ef4444' : '#10b981', fontWeight: '600' }}>
              {mensaje}
            </p>
          )}

          {elementosLeidos.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#fff', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Nombre / Etiqueta</th>
                    <th style={{ padding: '12px' }}>Tipo Detectado</th>
                    <th style={{ padding: '12px' }}>Latitud</th>
                    <th style={{ padding: '12px' }}>Longitud</th>
                  </tr>
                </thead>
                <tbody>
                  {elementosFiltradosImportacion.map((punto) => (
                    <tr key={punto.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '10px', fontWeight: '600' }}>{punto.nombre}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ 
                          padding: '3px 8px', 
                          borderRadius: '4px', 
                          fontSize: '0.8rem', 
                          fontWeight: 'bold',
                          backgroundColor: punto.tipo === 'NAP' ? '#e0f2fe' : punto.tipo === 'ONU' ? '#fef08a' : '#dcfce7',
                          color: punto.tipo === 'NAP' ? '#0369a1' : punto.tipo === 'ONU' ? '#854d0e' : '#166534'
                        }}>
                          {punto.tipo}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>{punto.latitud}</td>
                      <td style={{ padding: '10px' }}>{punto.longitud}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '20px' }}>
                <button 
                  style={{ backgroundColor: guardando ? '#94a3b8' : '#10b981', color: '#fff', border: 'none', padding: '10px 20px', fontWeight: '700', borderRadius: '4px', cursor: guardando ? 'not-allowed' : 'pointer' }}
                  onClick={guardarInfraestructuraEnMapa}
                  disabled={guardando}
                >
                  {guardando ? 'Guardando infraestructura...' : 'Guardar infraestructura en el mapa'}
                </button>

                <button
                  onClick={limpiarSeleccion}
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 20px',
                    fontWeight: '700',
                    borderRadius: '4px',
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
          {cargandoExportacion && <p style={{ fontWeight: '600', color: '#10b981' }}>Cargando elementos registrados...</p>}
          {mensajeExportacion && <p style={{ color: '#ef4444', fontWeight: '600' }}>{mensajeExportacion}</p>}

          {!cargandoExportacion && (
            <div>
              <div style={{ position: 'relative', marginBottom: '20px' }}>
                <input 
                  type="text"
                  placeholder="Buscador..."
                  value={filtroBusquedaExportacion}
                  onChange={(e) => setFiltroBusquedaExportacion(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    backgroundColor: '#fff'
                  }}
                />
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#fff', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>Código / Nombre</th>
                    <th style={{ padding: '12px' }}>Latitud</th>
                    <th style={{ padding: '12px' }}>Longitud</th>
                    <th style={{ padding: '12px', textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {elementosTablaExportar.length > 0 ? (
                    elementosTablaExportar.map((el, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px', fontWeight: '600' }}>{el.codigo || el.nombre}</td>
                        <td style={{ padding: '10px' }}>{el.latitud || el.lat}</td>
                        <td style={{ padding: '10px' }}>{el.longitud || el.lng}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button
                            onClick={() => exportarElementoKML(el)}
                            style={{
                              backgroundColor: '#10b981',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontWeight: '600',
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                          >
                            Exportar KML
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                        No se encontraron elementos coincidentes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GestionKMZ;
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Polyline, 
  Tooltip, 
  LayersControl, 
  useMap
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { iconoNap, iconoPoste, iconoCliente, iconoOnu } from '../utils/mapIcon';
import { calcularDistancia } from '../utils/haversine';
import { obtenerDispositivosMapa } from '../services/api';

const { BaseLayer } = LayersControl;

const iconoGpsUsuario = L.icon({
  iconUrl: '/icons/persona.png',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -34]
});

const iconoUbicacionExterna = L.icon({
  iconUrl: '/icons/pin.png',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -34]
});

const iconoPuntoRojoSeleccion = L.divIcon({
  className: 'custom-red-dot-marker',
  html: `<div style="
    background-color: #ef4444;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid #ffffff;
    box-shadow: 0 0 6px rgba(239, 68, 68, 0.9);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

function InvalidarTamanoMapa({ panelAbierto }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => clearTimeout(timer);
  }, [panelAbierto, map]);

  return null;
}

const clasificarTipoDispositivo = (disp) => {
  if (!disp) return 'CLIENTE';
  if (disp.tipo === 'MI_UBICACION' || disp.tipo === 'UBICACION_EXTERNA') return disp.tipo;

  const tipoUpper = String(disp.tipo || '').toUpperCase();
  const codigoUpper = String(disp.codigo || disp.cliente_ref || '').toUpperCase();

  if (tipoUpper.includes('POSTE')) return 'POSTE';
  if (tipoUpper.includes('NAP')) return 'NAP';
  if (tipoUpper.includes('ONU') || codigoUpper.includes('ONU') || disp.es_onu === true) return 'ONU';
  return 'CLIENTE';
};

const obtenerClaveUnicaDispositivo = (disp) => {
  if (!disp) return '';
  if (disp.idUnico && (disp.tipo === 'MI_UBICACION' || disp.tipo === 'UBICACION_EXTERNA')) {
    return disp.idUnico;
  }
  const categoria = clasificarTipoDispositivo(disp);
  const rawId = disp.id ?? disp.poste_id ?? disp.id_nap ?? disp.id_cliente ?? disp.id_onus ?? '';
  return `${categoria}-${rawId}`;
};

const obtenerIconoBaseSegunTipo = (disp) => {
  const categoria = clasificarTipoDispositivo(disp);
  if (categoria === 'POSTE') return iconoPoste;
  if (categoria === 'NAP') return iconoNap;
  if (categoria === 'ONU') return iconoOnu;
  return iconoCliente;
};

const formatearLocalidad = (loc) => {
  if (!loc) return 'MX-B1';
  return String(loc).trim().toUpperCase().replace(/_/g, '-');
};

function ControlVistaMapa({ centro, zoomForzado }) {
  const map = useMap();
  const ultimaTransaccionRef = useRef(null);

  useEffect(() => {
    if (centro) {
      const [lat, lng] = centro;
      const claveRef = `${lat}-${lng}-${zoomForzado}`;
      if (ultimaTransaccionRef.current !== claveRef) {
        ultimaTransaccionRef.current = claveRef;
        map.setView([lat, lng], zoomForzado, { animate: true });
      }
    }
  }, [centro, zoomForzado, map]);

  return null;
}

function MapaRed() {
  const [dispositivos, setDispositivos] = useState([]);
  const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState(null);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [origen, setOrigen] = useState(null); 
  const [destino, setDestino] = useState(null); 
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'exito' });
  
  const location = useLocation();
  const navigate = useNavigate();
  
  const CENTRO_VISTA_GENERAL = [19.8050, -99.7750];
  const ZOOM_GENERAL = 12;

  const [centroMapa, setCentroMapa] = useState(CENTRO_VISTA_GENERAL);
  const [zoomMapa, setZoomMapa] = useState(ZOOM_GENERAL);

  const [textoBusqueda, setTextoBusqueda] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [ubicacionExterna, setUbicacionExterna] = useState(null);

  const mostrarAlertaFlotante = (mensaje, tipo = 'exito') => {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => {
      setNotificacion(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const cargarDatosMapa = async () => {
    try {
      const respuesta = await obtenerDispositivosMapa();
      const items = Array.isArray(respuesta.data) ? respuesta.data : (Array.isArray(respuesta) ? respuesta : []);
      setDispositivos(items);

      const params = new URLSearchParams(window.location.search);
      const urlId = params.get('id');
      const urlLat = location.state?.centrarLat || parseFloat(params.get('lat'));
      const urlLng = location.state?.centrarLng || parseFloat(params.get('lng'));

      if (!isNaN(urlLat) && !isNaN(urlLng)) {
        setCentroMapa([urlLat, urlLng]);
        setZoomMapa(18);

        let encontrado = null;
        if (urlId) {
          const urlTipo = params.get('tipo')?.toLowerCase() || '';
          encontrado = items.find(disp => {
            const rawId = disp.id ?? disp.poste_id ?? disp.id_nap ?? disp.id_cliente ?? disp.id_onus;
            const coincideId = String(rawId) === String(urlId);
            if (!coincideId) return false;
            if (!urlTipo) return true;

            const categoria = clasificarTipoDispositivo(disp);
            if (urlTipo.includes('nap')) return categoria === 'NAP';
            if (urlTipo.includes('poste')) return categoria === 'POSTE';
            if (urlTipo.includes('onu')) return categoria === 'ONU';
            if (urlTipo.includes('cliente')) return categoria === 'CLIENTE' || categoria === 'ONU';

            return true;
          });
        }

        if (encontrado) {
          const idUnico = obtenerClaveUnicaDispositivo(encontrado);
          const dispConId = { ...encontrado, idUnico };
          setDispositivoSeleccionado(dispConId);
          setPanelAbierto(true);
          if (!origen) {
            setOrigen(dispConId);
          } else if (origen && !destino) {
            setDestino(dispConId);
          }
        } else {
          const esRedireccionImportacion = !urlId && location.state?.centrarLat;
          
          if (esRedireccionImportacion) {
            setUbicacionExterna(null);
            setDispositivoSeleccionado(null);
            setPanelAbierto(false);
          } else {
            const pinTemporal = {
              idUnico: 'pin-soporte-temporal',
              tipo: 'UBICACION_EXTERNA',
              nombre: 'Ubicación de Incidencia / Reporte',
              latitud: urlLat,
              longitud: urlLng,
              estado: 'Activo'
            };
            setUbicacionExterna(pinTemporal);
            setDispositivoSeleccionado(pinTemporal);
            setPanelAbierto(true);
            if (!origen) setOrigen(pinTemporal);
          }
        }
      } else {
        setCentroMapa(CENTRO_VISTA_GENERAL);
        setZoomMapa(ZOOM_GENERAL);
      }
    } catch (error) {
      console.error('Error al cargar dispositivos:', error);
    }
  };

  useEffect(() => {
    cargarDatosMapa();
  }, [location.state]);

  const cerrarPanelYLimpiarSeleccion = () => {
    setPanelAbierto(false);
    setDispositivoSeleccionado(null);
    setOrigen(null);
    setDestino(null);
    setUbicacionExterna(null);
    setTextoBusqueda('');
  };

  const toggleMiUbicacionGPS = () => {
    if (origen && origen.tipo === 'MI_UBICACION') {
      setOrigen(null);
      setDestino(null);
      return;
    }

    if (!navigator.geolocation) {
      mostrarAlertaFlotante("Tu navegador no soporta geolocalización.", "error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latUser = position.coords.latitude;
        const lngUser = position.coords.longitude;

        const puntoMiUbicacion = {
          idUnico: 'mi-gps-actual',
          tipo: 'MI_UBICACION',
          nombre: 'Mi Ubicación GPS',
          latitud: latUser,
          longitud: lngUser,
          estado: 'Activo'
        };

        setOrigen(puntoMiUbicacion);
        if (dispositivoSeleccionado) {
          setDestino(dispositivoSeleccionado);
        }
        setCentroMapa([latUser, lngUser]);
        setZoomMapa(18);
        mostrarAlertaFlotante("Ubicación GPS activada con éxito.");
      },
      (error) => {
        console.error("Error al obtener GPS:", error);
        mostrarAlertaFlotante("No se pudo obtener la ubicación actual. Revisa los permisos del navegador.", "error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const convertirGMSADecimal = (grados, minutos, segundos, direccion) => {
    let dec = parseFloat(grados) + parseFloat(minutos) / 60 + parseFloat(segundos) / 3600;
    if (direccion === 'S' || direccion === 'W') {
      dec = -dec;
    }
    return dec;
  };

  const intentarExtraerCoordenadas = (texto) => {
    const limpio = texto.trim();
    const regexGMS = /(\d+)°\s*(\d+)'\s*([\d.]+)"?\s*([NS])\s*[,]?\s*(\d+)°\s*(\d+)'\s*([\d.]+)"?\s*([EW])/i;
    const matchGMS = limpio.match(regexGMS);
    if (matchGMS) {
      const lat = convertirGMSADecimal(matchGMS[1], matchGMS[2], matchGMS[3], matchGMS[4].toUpperCase());
      const lng = convertirGMSADecimal(matchGMS[5], matchGMS[6], matchGMS[7], matchGMS[8].toUpperCase());
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }

    const partes = limpio.split(/[\s,]+/);
    if (partes.length === 2) {
      const lat = parseFloat(partes[0]);
      const lng = parseFloat(partes[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }

    return null;
  };

  const handleBusquedaChange = (e) => {
    const valor = e.target.value;
    setTextoBusqueda(valor);

    if (valor.trim().length < 2) {
      setSugerencias([]);
      setMostrarSugerencias(false);
    } else {
      const termino = valor.toLowerCase().replace(/_/g, '-').trim();

      const filtrados = dispositivos.filter(disp => {
        const codigo = (disp.codigo || disp.codigo_nap || disp.nombre || '').toLowerCase().replace(/_/g, '-');
        const cliente = (disp.nombre_completo || disp.cliente_ref || '').toLowerCase();
        const categoria = clasificarTipoDispositivo(disp).toLowerCase();
        const serie = (disp.no_serie || '').toLowerCase();

        const localidad = (disp.localidad || '').toLowerCase().replace(/_/g, '-');
        const barrio = (disp.barrio || '').toLowerCase().replace(/_/g, '-');
        const siglas = (disp.siglas || '').toLowerCase().replace(/_/g, '-');

        return (
          codigo.includes(termino) ||
          cliente.includes(termino) ||
          categoria.includes(termino) ||
          serie.includes(termino) ||
          localidad.includes(termino) ||
          barrio.includes(termino) ||
          siglas.includes(termino)
        );
      });

      setSugerencias(filtrados);
      setMostrarSugerencias(true);
    }
  };

  const handleKeyDownBusqueda = (e) => {
    if (e.key === 'Enter') {
      const coords = intentarExtraerCoordenadas(textoBusqueda);
      if (coords) {
        setMostrarSugerencias(false);
        const nuevoPinExterno = {
          idUnico: 'ubicacion-externa',
          tipo: 'UBICACION_EXTERNA',
          nombre: 'Ubicación Externa',
          latitud: coords.lat,
          longitud: coords.lng,
          estado: 'Activo'
        };
        setUbicacionExterna(nuevoPinExterno);
        setDispositivoSeleccionado(nuevoPinExterno);
        setPanelAbierto(true);
        setCentroMapa([coords.lat, coords.lng]);
        setZoomMapa(18);

        if (!origen) {
          setOrigen(nuevoPinExterno);
        } else {
          setDestino(nuevoPinExterno);
        }
      }
    }
  };

  const seleccionarDispositivoDesdeBusqueda = (disp) => {
    setMostrarSugerencias(false);
    setTextoBusqueda('');
    
    const lat = parseFloat(disp.latitud ?? disp.lat);
    const lng = parseFloat(disp.longitud ?? disp.lng);
    if (!isNaN(lat) && !isNaN(lng)) {
      setCentroMapa([lat, lng]);
      setZoomMapa(18);
    }
    manejarSeleccionEquipo(disp);
  };

  const manejarSeleccionEquipo = (disp, e) => {
    if (e && e.originalEvent) {
      e.originalEvent.stopPropagation();
    }

    const idUnico = obtenerClaveUnicaDispositivo(disp);
    const dispActualizado = dispositivos.find(d => obtenerClaveUnicaDispositivo(d) === idUnico) || disp;

    const dispConId = { ...dispActualizado, idUnico };
    const lat = parseFloat(dispConId.latitud ?? dispConId.lat);
    const lng = parseFloat(dispConId.longitud ?? dispConId.lng);

    setDispositivoSeleccionado(dispConId);
    setPanelAbierto(true);

    if (!isNaN(lat) && !isNaN(lng)) {
      setCentroMapa([lat, lng]);
      setZoomMapa(18);
    }

    if (!origen) {
      setOrigen(dispConId);
    } else if (origen && !destino) {
      if (origen.idUnico !== dispConId.idUnico) {
        setDestino(dispConId);
      }
    } else {
      setOrigen(destino);
      setDestino(dispConId);
    }
  };

  const obtenerNombrePunto = (punto) => {
    if (!punto) return '';
    const categoria = clasificarTipoDispositivo(punto);
    if (categoria === 'ONU') {
      return punto.cliente_ref || punto.codigo || punto.nombre_completo || 'ONU';
    }
    if (punto.nombre_completo) return punto.nombre_completo;
    if (punto.cliente_ref) return punto.cliente_ref;
    return punto.codigo || punto.codigo_nap || punto.nombre || 'Dispositivo';
  };

  const obtenerEstatusPunto = (punto) => {
    if (!punto) return 'ACTIVO';
    const valor = punto.estado ?? punto.estatus ?? punto.status ?? punto.state ?? 'ACTIVO';
    return String(valor).trim().toUpperCase();
  };

  const obtenerColorTextoEstatus = (estatusStr) => {
    const val = (estatusStr || '').toUpperCase().trim();
    if (val === 'ACTIVO' || val === 'ACTIVADO' || val === 'TRUE') return '#16a34a';
    if (val.includes('SUSP')) return '#d97706';
    if (val.includes('MANT')) return '#0284c7';
    return '#dc2626';
  };

  const obtenerDistanciaFormateada = () => {
    const puntoA = origen;
    const puntoB = destino || (dispositivoSeleccionado && origen && dispositivoSeleccionado.idUnico !== origen.idUnico ? dispositivoSeleccionado : null);
    if (!puntoA || !puntoB) return null;
    if (puntoA.idUnico === puntoB.idUnico) return null;

    const latOrig = parseFloat(puntoA.latitud ?? puntoA.lat);
    const lngOrig = parseFloat(puntoA.longitud ?? puntoA.lng);
    const latDest = parseFloat(puntoB.latitud ?? puntoB.lat);
    const lngDest = parseFloat(puntoB.longitud ?? puntoB.lng);

    if (isNaN(latOrig) || isNaN(lngOrig) || isNaN(latDest) || isNaN(lngDest)) return null;

    const distKm = calcularDistancia(latOrig, lngOrig, latDest, lngDest);
    const metros = Math.round(distKm * 1000);
    const textoMetros = metros < 1000 ? `${metros} metros` : `${distKm.toFixed(2)} km (${metros} m)`;

    return {
      origenNombre: obtenerNombrePunto(puntoA),
      origenEstatus: obtenerEstatusPunto(puntoA),
      destinoNombre: obtenerNombrePunto(puntoB),
      destinoEstatus: obtenerEstatusPunto(puntoB),
      distanciaTexto: textoMetros
    };
  };

  const obtenerRutaCoords = () => {
    const puntoA = origen;
    const puntoB = destino || (dispositivoSeleccionado && origen && dispositivoSeleccionado.idUnico !== origen.idUnico ? dispositivoSeleccionado : null);
    if (!puntoA || !puntoB) return [];

    const latOrig = parseFloat(puntoA.latitud ?? puntoA.lat);
    const lngOrig = parseFloat(puntoA.longitud ?? puntoA.lng);
    const latDest = parseFloat(puntoB.latitud ?? puntoB.lat);
    const lngDest = parseFloat(puntoB.longitud ?? puntoB.lng);

    if (isNaN(latOrig) || isNaN(lngOrig) || isNaN(latDest) || isNaN(lngDest)) return [];

    return [
      [latOrig, lngOrig],
      [latDest, lngDest]
    ];
  };

  const dispositivosFiltrados = dispositivos.filter(disp => {
    if (filtroTipo === 'TODOS') return true;
    const categoria = clasificarTipoDispositivo(disp);
    return categoria === filtroTipo;
  });

  const infoDistancia = obtenerDistanciaFormateada();
  const rutaCoords = obtenerRutaCoords();
  const hayDosSeleccionados = Boolean(origen && destino && origen.idUnico !== destino.idUnico);

  const renderizarDetallesTecnicosCompletos = (disp) => {
    if (!disp) return null;

    const claveActual = obtenerClaveUnicaDispositivo(disp);
    const dispFresca = dispositivos.find(d => obtenerClaveUnicaDispositivo(d) === claveActual) || disp;

    if (dispFresca.tipo === 'MI_UBICACION') {
      return (
        <div style={{ backgroundColor: '#f0fdf4', padding: '14px 16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
          <span style={{ fontSize: '0.95rem', color: '#16a34a', fontWeight: '800', display: 'block', marginTop: '4px' }}>
            Posición Actual (Inicio de Instalación)
          </span>
        </div>
      );
    }

    if (dispFresca.tipo === 'UBICACION_EXTERNA') {
      return (
        <div style={{ backgroundColor: '#fef2f2', padding: '14px 16px', borderRadius: '12px', border: '1px solid #fecaca' }}>
          <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: '800', display: 'block' }}>UBICACIÓN EXTERNA</span>
          <span style={{ fontSize: '0.95rem', color: '#991b1b', fontWeight: '800', display: 'block', marginTop: '4px' }}>
            Pin temporal
          </span>
          <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginTop: '6px' }}>
            Lat: {dispFresca.latitud.toFixed(6)}, Lng: {dispFresca.longitud.toFixed(6)}
          </span>
        </div>
      );
    }

    const categoria = clasificarTipoDispositivo(dispFresca);
    const esCliente = categoria === 'CLIENTE';
    const esOnu = categoria === 'ONU';
    const esNap = categoria === 'NAP';
    const esPoste = categoria === 'POSTE';

    const identificador = dispFresca.codigo || dispFresca.codigo_nap || dispFresca.cliente_ref || dispFresca.nombre || dispFresca.identificador || 'S/N';
    const estadoStr = obtenerEstatusPunto(dispFresca);
    const localidadFormateada = formatearLocalidad(dispFresca.localidad || dispFresca.siglas || dispFresca.barrio);

    let napsAsociadasAlPoste = [];
    if (esPoste) {
      const idPosteActual = dispFresca.poste_id ?? dispFresca.id;
      const textoNapsDesdeBackend = dispFresca.nap_asociada && dispFresca.nap_asociada !== 'Sin NAP asociada'
        ? dispFresca.nap_asociada.split(',').map(s => s.trim())
        : [];

      const napsFiltradas = dispositivos.filter(d => {
        if (clasificarTipoDispositivo(d) !== 'NAP') return false;
        const dPosteId = d.poste_id ?? d.id_poste ?? d.posteId;
        const coincideId = idPosteActual && dPosteId && String(dPosteId) === String(idPosteActual);
        const coincideNombre = textoNapsDesdeBackend.includes(d.codigo || d.codigo_nap);
        return coincideId || coincideNombre;
      });

      napsAsociadasAlPoste = napsFiltradas.length > 0
        ? napsFiltradas.map(n => n.codigo || n.codigo_nap)
        : textoNapsDesdeBackend;
    }

    const totalPuertos = Number(dispFresca.capacidad_puertos ?? dispFresca.puertos_totales ?? dispFresca.capacidad) || 8;
    let clientesEnNap = [];
    if (esNap) {
      const nombreNapActual = (dispFresca.codigo || dispFresca.codigo_nap || dispFresca.nombre || '').toLowerCase();
      clientesEnNap = dispositivos.filter(d => {
        if (clasificarTipoDispositivo(d) !== 'CLIENTE') return false;
        const dNapRef = (d.nap_asociada || d.codigo_nap || d.nombre_nap || '').toLowerCase();
        return dNapRef === nombreNapActual;
      });
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', display: 'block' }}>
              {esOnu ? 'Equipo ONU' : esNap ? 'Caja NAP' : esPoste ? 'Poste' : 'Cliente'}
            </span>
            <h4 style={{ margin: '4px 0 0 0', fontSize: '1rem', color: '#0f172a', fontWeight: '800' }}>
              {esCliente ? (dispFresca.nombre_completo || dispFresca.cliente_ref || identificador) : identificador}
            </h4>
          </div>
          <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
            {localidadFormateada}
          </span>
        </div>

        {esOnu && (
          <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', display: 'block' }}>TIPO DE INFRAESTRUCTURA</span>
            <span style={{ fontSize: '0.88rem', color: '#0284c7', fontWeight: '800', display: 'block', marginTop: '3px' }}>
              Terminal Óptica de Red (ONU / Fibra)
            </span>
          </div>
        )}

        {esCliente && (
          <>
            <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', display: 'block' }}>CAJA NAP CONECTADA</span>
              <span style={{ fontSize: '0.9rem', color: '#0284c7', fontWeight: '800', display: 'block', marginTop: '3px' }}>
                {dispFresca.nap_asociada || dispFresca.codigo_nap || dispFresca.nombre_nap || 'Sin NAP asociada'}
              </span>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', display: 'block' }}>PUERTO ASIGNADO</span>
              <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '800', display: 'block', marginTop: '3px' }}>
                {dispFresca.puerto ? `Puerto #${dispFresca.puerto}` : 'No especificado'}
              </span>
            </div>
          </>
        )}

        {esNap && (
          <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', display: 'block' }}>ESTADO DE PUERTOS (NAP)</span>
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Array.from({ length: totalPuertos }, (_, i) => {
                const numPuerto = i + 1;
                const clienteEnPuerto = clientesEnNap.find(c => Number(c.puerto) === numPuerto);
                const estaOcupado = Boolean(clienteEnPuerto);

                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '4px 8px', backgroundColor: estaOcupado ? '#fef2f2' : '#f0fdf4', borderRadius: '6px', border: `1px solid ${estaOcupado ? '#fecaca' : '#bbf7d0'}` }}>
                    <span style={{ fontWeight: '700', color: '#334155' }}>Puerto #{numPuerto}</span>
                    <span style={{ fontWeight: '700', color: estaOcupado ? '#dc2626' : '#16a34a' }}>
                      {estaOcupado ? `Ocupado: ${clienteEnPuerto.nombre_completo || clienteEnPuerto.cliente_ref || 'Cliente'}` : 'Libre'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {esPoste && (
          <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', display: 'block' }}>CAJAS NAP ASOCIADAS EN ESTE POSTE</span>
            <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {napsAsociadasAlPoste.length > 0 ? (
                napsAsociadasAlPoste.map((codigoNapStr, nIdx) => (
                  <span key={nIdx} style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: '700' }}>
                    • {codigoNapStr}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: '700' }}>
                  Sin NAP asociada
                </span>
              )}
            </div>
          </div>
        )}

        <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', display: 'block' }}>ESTADO</span>
          <span style={{ fontSize: '0.85rem', color: obtenerColorTextoEstatus(estadoStr), fontWeight: '700', display: 'block', marginTop: '3px' }}>
            {estadoStr}
          </span>
        </div>
      </div>
    );
  };

  return (
    <React.Fragment>
      <div style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', width: '100%', overflow: 'hidden' }}>
        <div style={{ flex: 1, height: '100%', position: 'relative' }}>
          <MapContainer
            center={centroMapa}
            zoom={zoomMapa}
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
            dragging={true}
            scrollWheelZoom={true}
          >
            <ControlVistaMapa centro={centroMapa} zoomForzado={zoomMapa} />
            <InvalidarTamanoMapa panelAbierto={panelAbierto} />

            <LayersControl position="topright">
              <BaseLayer checked name="Google Maps Satélite">
                <TileLayer
                  url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                  maxZoom={20}
                  attribution="&copy; Google Maps"
                />
              </BaseLayer>

              <BaseLayer name="Google Maps Calles">
                <TileLayer
                  url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                  maxZoom={20}
                  attribution="&copy; Google Maps"
                />
              </BaseLayer>
            </LayersControl>

            {rutaCoords.length > 0 && (
              <>
                <Polyline positions={rutaCoords} color="#15803d" weight={6} opacity={0.85} pane="markerPane" />
                <Polyline positions={rutaCoords} color="#22c55e" weight={3} opacity={1} pane="markerPane" />
              </>
            )}

            {dispositivosFiltrados.map((disp, index) => {
              const lat = parseFloat(disp.latitud ?? disp.lat);
              const lng = parseFloat(disp.longitud ?? disp.lng);
              if (isNaN(lat) || isNaN(lng)) return null;

              const etiquetaTooltip = obtenerNombrePunto(disp) || `Elemento #${index}`;
              const keyId = `${obtenerClaveUnicaDispositivo(disp)}-${index}`;

              return (
                <Marker
                  key={keyId}
                  position={[lat, lng]}
                  icon={obtenerIconoBaseSegunTipo(disp)}
                  eventHandlers={{
                    click: (e) => manejarSeleccionEquipo(disp, e),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                      <div>{etiquetaTooltip}</div>
                    </div>
                  </Tooltip>
                </Marker>
              );
            })}

            {origen && !isNaN(parseFloat(origen.latitud ?? origen.lat)) && (
              <Marker
                position={[parseFloat(origen.latitud ?? origen.lat), parseFloat(origen.longitud ?? origen.lng)]}
                icon={iconoPuntoRojoSeleccion}
                interactive={false}
              />
            )}

            {destino && !isNaN(parseFloat(destino.latitud ?? destino.lat)) && (
              <Marker
                position={[parseFloat(destino.latitud ?? destino.lat), parseFloat(destino.longitud ?? destino.lng)]}
                icon={iconoPuntoRojoSeleccion}
                interactive={false}
              />
            )}

            {origen && origen.tipo === 'MI_UBICACION' && (
              <Marker
                position={[origen.latitud, origen.longitud]}
                icon={iconoGpsUsuario}
              />
            )}

            {ubicacionExterna && (
              <Marker
                position={[ubicacionExterna.latitud, ubicacionExterna.longitud]}
                icon={iconoUbicacionExterna}
                eventHandlers={{
                  click: (e) => manejarSeleccionEquipo(ubicacionExterna, e),
                }}
              >
                <Tooltip direction="top" offset={[0, -25]} permanent>
                  <span style={{ fontWeight: 'bold', color: '#ef4444' }}>Ubicación Externa</span>
                </Tooltip>
              </Marker>
            )}
          </MapContainer>

          <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 1000, width: '350px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Busca dispositivo o pega coordenadas..."
                value={textoBusqueda}
                onChange={handleBusquedaChange}
                onKeyDown={handleKeyDownBusqueda}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  outline: 'none',
                  fontSize: '0.9rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={toggleMiUbicacionGPS}
                title="Activar / Desactivar mi ubicación GPS"
                style={{
                  backgroundColor: (origen && origen.tipo === 'MI_UBICACION') ? '#e0f2fe' : '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  width: '46px',
                  height: '46px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  flexShrink: 0
                }}
              >
                <img src="/icons/gps.png" alt="GPS" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'TODOS', label: 'Todos' },
                { id: 'POSTE', label: 'Poste' },
                { id: 'NAP', label: 'Nap' },
                { id: 'CLIENTE', label: 'Cliente' },
                { id: 'ONU', label: 'ONU' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFiltroTipo(item.id)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: filtroTipo === item.id ? '#0284c7' : '#ffffff',
                    color: filtroTipo === item.id ? '#ffffff' : '#334155',
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
                 
            {mostrarSugerencias && textoBusqueda.trim().length >= 2 && sugerencias.length > 0 && (
              <ul
                style={{
                  maxHeight: '280px',
                  overflowY: 'auto',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                  listStyle: 'none',
                  padding: '4px 0',
                  margin: 0,
                  zIndex: 1005
                }}
              >
                {sugerencias.map((disp, idx) => {
                  const nombreVisible = obtenerNombrePunto(disp);
                  const siglaLocalidad = formatearLocalidad(disp.localidad || disp.siglas || disp.barrio);
                  const keyId = `sug-${obtenerClaveUnicaDispositivo(disp)}-${idx}`;

                  return (
                    <li
                      key={keyId}
                      onClick={() => seleccionarDispositivoDesdeBusqueda(disp)}
                      style={{ padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a' }}>
                          {nombreVisible}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: '700', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px' }}>
                          {siglaLocalidad}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {panelAbierto && dispositivoSeleccionado && (
          <aside
            style={{
              width: '380px',
              height: '100%',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              boxShadow: '-8px 0 30px rgba(0,0,0,0.1)',
              zIndex: 1001,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderLeft: '1px solid #e2e8f0',
              flexShrink: 0
            }}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#f8fafc'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '800', color: '#1e293b' }}>DETALLES TÉCNICOS</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={cerrarPanelYLimpiarSeleccion}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {infoDistancia && (
                  <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: '#15803d', display: 'block', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      DISTANCIA DE MEDICIÓN
                    </span>
                    <strong style={{ fontSize: '1.2rem', color: '#16a34a', display: 'block', marginTop: '6px' }}>
                      {infoDistancia.distanciaTexto}
                    </strong>
                  </div>
                )}

                {hayDosSeleccionados && infoDistancia ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', borderBottom: '2px solid #e2e8f0', paddingBottom: '6px' }}>
                      SELECCIÓN:
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '700' }}>
                        Dispositivo: {infoDistancia.origenNombre}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: '700' }}>
                        Estatus: <span style={{ color: obtenerColorTextoEstatus(infoDistancia.origenEstatus) }}>{infoDistancia.origenEstatus}</span>
                      </span>
                    </div>

                    <div style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: '800', color: '#64748b', textTransform: 'lowercase', margin: '-2px 0' }}>
                      a
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '700' }}>
                        Dispositivo: {infoDistancia.destinoNombre}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: '#0f172a', fontWeight: '700' }}>
                        Estatus: <span style={{ color: obtenerColorTextoEstatus(infoDistancia.destinoEstatus) }}>{infoDistancia.destinoEstatus}</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    {renderizarDetallesTecnicosCompletos(dispositivoSeleccionado)}

                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(!destino || origen?.idUnico === dispositivoSeleccionado?.idUnico) && dispositivoSeleccionado.tipo !== 'MI_UBICACION' && (
                        <button
                          onClick={() => {
                            const objetivo = dispositivoSeleccionado;
                            if (!objetivo) return;
                            const latDest = parseFloat(objetivo.latitud ?? objetivo.lat);
                            const lngDest = parseFloat(objetivo.longitud ?? objetivo.lng);
                            if (isNaN(latDest) || isNaN(lngDest)) return;

                            if (origen && origen.tipo === 'MI_UBICACION') {
                              window.open(`https://www.google.com/maps/dir/?api=1&origin=${origen.latitud},${origen.longitud}&destination=${latDest},${lngDest}`, '_blank');
                            } else {
                              if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition(
                                  (position) => {
                                    const latUser = position.coords.latitude;
                                    const lngUser = position.coords.longitude;
                                    window.open(`https://www.google.com/maps/dir/?api=1&origin=${latUser},${lngUser}&destination=${latDest},${lngDest}`, '_blank');
                                  },
                                  () => {
                                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${latDest},${lngDest}`, '_blank');
                                  },
                                  { enableHighAccuracy: true, timeout: 5000 }
                                );
                              } else {
                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${latDest},${lngDest}`, '_blank');
                              }
                            }
                          }}
                          style={{
                            width: '100%',
                            backgroundColor: '#0284c7',
                            color: '#ffffff',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '10px',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                          }}
                        >
                          INICIAR RUTA EN GOOGLE MAPS
                        </button>
                      )}

                      {dispositivoSeleccionado.tipo !== 'UBICACION_EXTERNA' && dispositivoSeleccionado.tipo !== 'MI_UBICACION' && (
                        <button
                          onClick={() => {
                            const objetivo = dispositivoSeleccionado;
                            if (!objetivo) return;
                            const rawId = objetivo.id ?? objetivo.poste_id ?? objetivo.id_nap ?? objetivo.id_cliente ?? objetivo.id_onus;
                            const categoria = clasificarTipoDispositivo(objetivo);
                            navigate(`/dispositivos?editar=${rawId}&tipo=${categoria}`, { state: { editarId: rawId, editarTipo: categoria, dispositivo: objetivo } });
                          }}
                          style={{
                            width: '100%',
                            backgroundColor: '#d97706',
                            color: '#ffffff',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '10px',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
                          }}
                        >
                          EDITAR
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </aside>
        )}

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
    </React.Fragment>
  );
}

export default MapaRed;
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { convertirDMSaDecimal } from '../utils/coordenadas';

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

function Dispositivos() {
  const [pestanaActiva, setPestanaActiva] = useState('CLIENTES');
  const [filtroEstatusDispositivo, setFiltroEstatusDispositivo] = useState('TODOS');
  const [dispositivos, setDispositivos] = useState([]);
  const [napsDisponiblesBD, setNapsDisponiblesBD] = useState([]);
  const [postesDisponiblesBD, setPostesDisponiblesBD] = useState([]);
  const [clientesDisponiblesBD, setClientesDisponiblesBD] = useState([]);
  const [onusDisponiblesBD, setOnusDisponiblesBD] = useState([]);
  const [filaExpandida, setFilaExpandida] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [elementoSeleccionado, setElementoSeleccionado] = useState(null);

  const [textoDMS, setTextoDMS] = useState('');
  const [filtroTablaGeneral, setFiltroTablaGeneral] = useState('');
  
  const [textoBusquedaPoste, setTextoBusquedaPoste] = useState('');
  const [mostrarDropdownPostes, setMostrarDropdownPostes] = useState(false);
  const dropdownPosteRef = useRef(null);

  const [textoBusquedaNap, setTextoBusquedaNap] = useState('');
  const [mostrarDropdownNap, setMostrarDropdownNap] = useState(false);
  const dropdownNapRef = useRef(null);

  const [textoBusquedaNapPoste, setTextoBusquedaNapPoste] = useState('');
  const [mostrarDropdownNapPoste, setMostrarDropdownNapPoste] = useState(false);
  const dropdownNapPosteRef = useRef(null);

  const [napsSeleccionadasPosteForm, setNapsSeleccionadasPosteForm] = useState([]);
  const [notificacion, setNotificacion] = useState({ visible: false, mensaje: '', tipo: 'exito' });

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const mostrarAlertaFlotante = (mensaje, tipo = 'exito') => {
    setNotificacion({ visible: true, mensaje, tipo });
    setTimeout(() => {
      setNotificacion(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const [form, setForm] = useState({
    tipo: 'Clientes',
    codigo: '',
    localidad: 'MX-B1',
    poste_id: '',
    posteAsociado: '',
    clienteAsociado: '',
    napAsociada: '',
    puertoAsignado: '',
    serie: '',
    cliente: '',
    nombreCliente: '',
    fecha_instalacion: new Date().toISOString().split('T')[0],
    latitud: '',
    longitud: '',
    estado: 'ACTIVO',
    capacidad_puertos: '8',
    puertos_usados: '0',
    napsAsociadas: [],
    onuSerie: '',
    onuModelo: ''
  });

  const obtenerTodosLosDispositivos = async () => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [resClientes, resNaps, resPostes] = await Promise.all([
        fetch('http://localhost:3000/api/red/clientes', { headers }),
        fetch('http://localhost:3000/api/red/naps', { headers }),
        fetch('http://localhost:3000/api/red/postes', { headers })
      ]);

      const dataClientes = resClientes.ok ? await resClientes.json() : [];
      const dataNaps = resNaps.ok ? await resNaps.json() : [];
      const dataPostes = resPostes.ok ? await resPostes.json() : [];

      const listaPostes = (Array.isArray(dataPostes) ? dataPostes : dataPostes.postes || []).map((item, idx) => ({
        ...item,
        realId: item.id || item.poste_id || item.id_poste || item._id,
        uniqueKey: `poste-${item.id || idx}`,
        codigo: item.codigo || item.codigo_poste,
        localidad: item.localidad || 'MX-B1',
        tipo: 'Poste',
        estado: (item.estado || item.estatus || 'ACTIVO').toUpperCase()
      }));

      const listaClientesCruda = (Array.isArray(dataClientes) ? dataClientes : dataClientes.clientes || []);

      const listaOnus = listaClientesCruda
        .filter(item => item.tipo === 'ONU' || item.es_onu)
        .map((item, idx) => ({
          ...item,
          realId: item.id || item.cliente_id || item.id_cliente || item._id,
          uniqueKey: `onu-${item.id || idx}`,
          tipo: 'ONU',
          codigo: item.cliente_ref || item.codigo || '',
          localidad: item.localidad || 'MX-B1',
          no_serie: item.no_serie || item.contacto || '',
          modelo: item.modelo || '',
          estado: (item.estado || item.estatus || 'ACTIVO').toUpperCase()
        }));

      const listaClientes = listaClientesCruda
        .filter(item => !(item.tipo === 'ONU' || item.es_onu))
        .map((item, idx) => {
          const napVal = item.napAsociada || item.nap_asociada || (item.nap ? item.nap.codigo_nap : '') || '';
          const puertoVal = item.puertoAsignado !== null && item.puertoAsignado !== undefined 
            ? item.puertoAsignado 
            : (item.puerto_asignado !== null && item.puerto_asignado !== undefined ? item.puerto_asignado : '');
          const posteVal = item.posteAsociado || item.poste_asociado || item.poste?.codigo || '';

          let estadoCliente = 'ACTIVO';
          if (item.estado) {
            estadoCliente = String(item.estado).toUpperCase();
          } else if (item.estatus !== undefined) {
            if (typeof item.estatus === 'boolean') {
              estadoCliente = item.estatus ? 'ACTIVO' : 'CANCELADO';
            } else {
              estadoCliente = String(item.estatus).toUpperCase();
            }
          }

          return {
            ...item,
            realId: item.id || item.cliente_id || item.id_cliente || item._id,
            uniqueKey: `cliente-${item.id || idx}`,
            tipo: 'Clientes',
            codigo: item.cliente_ref || item.codigo || '',
            localidad: item.localidad || 'MX-B1',
            nombre_completo: item.nombre_completo || '',
            no_serie: item.no_serie || item.contacto || '',
            napAsociada: napVal,
            posteAsociado: posteVal,
            puertoAsignado: puertoVal,
            id_nap: item.id_nap || item.nap_id || item.nap?.id || '',
            estado: estadoCliente
          };
        });

      const listaNaps = (Array.isArray(dataNaps) ? dataNaps : dataNaps.naps || []).map((item, idx) => {
        const codigoNap = item.codigo_nap || item.codigo;
        const idPosteReferencia = item.poste_id || item.poste?.id || item.id_poste;
        
        let posteAsocVal = item.posteAsociado || 
                           item.poste_asociado || 
                           item.poste?.codigo || 
                           item.codigo_poste || 
                           item.poste_nombre || 
                           item.nombre_poste || '';

        if (!posteAsocVal && idPosteReferencia) {
          const encontradoPorId = listaPostes.find(p => String(p.realId) === String(idPosteReferencia));
          if (encontradoPorId) {
            posteAsocVal = encontradoPorId.codigo;
          }
        }

        const clientesEnEstaNap = listaClientes.filter(cli => 
          String(cli.napAsociada).trim().toLowerCase() === String(codigoNap).trim().toLowerCase() || 
          String(cli.id_nap) === String(item.id) ||
          String(cli.id_nap) === String(item.nap_id)
        );
        const puertosOcupadosCount = clientesEnEstaNap.length;

        return {
          ...item,
          realId: item.id || item.nap_id || item.id_nap || item._id,
          uniqueKey: `nap-${item.id || idx}`,
          codigo: codigoNap,
          localidad: item.localidad || 'MX-B1',
          tipo: 'Caja NAP',
          poste_id: idPosteReferencia || '',
          posteAsociado: posteAsocVal,
          puertos_usados: puertosOcupadosCount,
          clientesEnNap: clientesEnEstaNap,
          estado: (item.estado || item.estatus || 'ACTIVO').toUpperCase()
        };
      });

      setDispositivos([...listaClientes, ...listaNaps, ...listaPostes, ...listaOnus]);
      setNapsDisponiblesBD(listaNaps);
      setPostesDisponiblesBD(listaPostes);
      setClientesDisponiblesBD(listaClientes);
      setOnusDisponiblesBD(listaOnus);
    } catch (error) {
      console.error('Error al obtener los dispositivos:', error);
    }
  };

  useEffect(() => {
    obtenerTodosLosDispositivos();
    const filtroParam = searchParams.get('filtro');
    if (filtroParam) {
      const filtroUpper = filtroParam.toUpperCase();
      if (filtroUpper === 'POSTES') {
        setPestanaActiva('POSTES');
      } else if (filtroUpper === 'NAPS') {
        setPestanaActiva('NAP');
      } else if (filtroUpper === 'CLIENTES') {
        setPestanaActiva('CLIENTES');
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const editarIdUrl = searchParams.get('editar');
    const idBuscado = editarIdUrl || location.state?.editarId;

    if (idBuscado && dispositivos.length > 0) {
      const elementoEncontrado = dispositivos.find(d => {
        const idUnico = d.realId || d.id || d.poste_id || d.id_nap || d.id_cliente || d.id_onus;
        return String(idUnico) === String(idBuscado);
      });

      if (elementoEncontrado) {
        window.history.replaceState({}, document.title, window.location.pathname);

        const tipoUpper = (elementoEncontrado.tipo || '').toUpperCase();
        let pestañaDestino = 'CLIENTES';

        if (tipoUpper.includes('POSTE')) {
          pestañaDestino = 'POSTES';
        } else if (tipoUpper.includes('NAP')) {
          pestañaDestino = 'NAP';
        } else if (tipoUpper.includes('ONU')) {
          pestañaDestino = 'ONUS';
        } else {
          pestañaDestino = 'CLIENTES';
        }

        setPestanaActiva(pestañaDestino);
        setTimeout(() => {
          const eventoFalso = { stopPropagation: () => {} };
          abrirModalEditar(elementoEncontrado, eventoFalso);
        }, 150);
      }
    }
  }, [dispositivos, searchParams, location.state]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownPosteRef.current && !dropdownPosteRef.current.contains(event.target)) {
        setMostrarDropdownPostes(false);
      }
      if (dropdownNapRef.current && !dropdownNapRef.current.contains(event.target)) {
        setMostrarDropdownNap(false);
      }
      if (dropdownNapPosteRef.current && !dropdownNapPosteRef.current.contains(event.target)) {
        setMostrarDropdownNapPoste(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const irAlMapaGeolocalizacion = (item) => {
    const tipoStr = (item.tipo || '').toLowerCase();
    let tipoParam = "cliente";
    if (tipoStr.includes("nap")) tipoParam = "nap";
    else if (tipoStr.includes("poste")) tipoParam = "poste";
    else if (tipoStr.includes("onu")) tipoParam = "cliente";

    const idBuscado = item.realId || item.id || item.poste_id || item.id_nap || item.id_cliente;
    const lat = item.latitud;
    const lng = item.longitud;

    if (lat && lng) {
      if (idBuscado) {
        window.location.href = `/mapa?lat=${lat}&lng=${lng}&tipo=${tipoParam}&id=${idBuscado}&zoom=18`;
      } else {
        window.location.href = `/mapa?lat=${lat}&lng=${lng}&zoom=18`;
      }
    } else {
      mostrarAlertaFlotante("Este dispositivo no cuenta con coordenadas geográficas registradas.", "error");
    }
  };

  const cargarDatosAuxiliares = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [resNaps, resPostes] = await Promise.all([
        fetch('http://localhost:3000/api/red/naps', { headers }),
        fetch('http://localhost:3000/api/red/postes', { headers })
      ]);
      
      let postesTemp = [];
      if (resPostes.ok) {
        const data = await resPostes.json();
        const lista = Array.isArray(data) ? data : data.postes || [];
        postesTemp = lista.map(item => ({ ...item, realId: item.id || item.poste_id, codigo: item.codigo || item.codigo_poste }));
        setPostesDisponiblesBD(postesTemp);
      }

      if (resNaps.ok) {
        const data = await resNaps.json();
        const lista = Array.isArray(data) ? data : data.naps || [];
        
        const resClientes = await fetch('http://localhost:3000/api/red/clientes', { headers });
        const dataClientes = resClientes.ok ? await resClientes.json() : [];
        const listaClientesCruda = Array.isArray(dataClientes) ? dataClientes : dataClientes.clientes || [];
        const listaClientes = listaClientesCruda.filter(cli => !(cli.tipo === 'ONU' || cli.es_onu));

        const listaNapsMapeadas = lista.map(item => {
          const codigoNap = item.codigo_nap || item.codigo;
          let posteAsocVal = item.posteAsociado || 
                               item.poste_asociado || 
                               item.poste?.codigo || 
                               item.codigo_poste || '';
          const idPosteRef = item.poste_id || item.poste?.id;
          if (!posteAsocVal && idPosteRef) {
            const enc = postesTemp.find(p => String(p.realId) === String(idPosteRef));
            if (enc) posteAsocVal = enc.codigo;
          }

          const clientesEnNap = listaClientes.filter(cli => 
            String(cli.napAsociada || cli.nap_asociada || '').trim().toLowerCase() === String(codigoNap).trim().toLowerCase() || 
            String(cli.id_nap) === String(item.id)
          );

          return { 
            ...item, 
            codigo: codigoNap, 
            realId: item.id || item.nap_id || item.id_nap,
            posteAsociado: posteAsocVal,
            poste_id: idPosteRef || '',
            puertos_usados: clientesEnNap.length
          };
        });
        setNapsDisponiblesBD(listaNapsMapeadas);
      }
    } catch (error) {
      console.error("Error al consultar auxiliares:", error);
    }
  };

  const capturarGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setForm(prev => ({
            ...prev,
            latitud: position.coords.latitude.toString(),
            longitud: position.coords.longitude.toString()
          }));
        },
        () => alert("No se pudo obtener la ubicación.")
      );
    }
  };

  const handleCalcularDMS = () => {
    const resultado = convertirDMSaDecimal(textoDMS);
    if (resultado) {
      setForm(prev => ({
        ...prev,
        latitud: resultado.latitud,
        longitud: resultado.longitud
      }));
      alert("Coordenadas calculadas y aplicadas con éxito.");
    } else {
      alert("No se pudo reconocer el formato de coordenadas.");
    }
  };

  const seleccionarNap = (nap) => {
    const posteAsocVal = nap.posteAsociado || nap.poste_asociado || nap.poste?.codigo || '';
    const posteObjEncontrado = postesDisponiblesBD.find(p => p.codigo === posteAsocVal || String(p.realId) === String(nap.poste_id));

    setForm(prev => ({
      ...prev,
      napAsociada: nap.codigo,
      puertoAsignado: '', 
      posteAsociado: posteAsocVal || 'Sin poste asociado',
      poste_id: posteObjEncontrado ? String(posteObjEncontrado.realId) : (nap.poste_id ? String(nap.poste_id) : '')
    }));
    setTextoBusquedaNap(nap.codigo);
    setMostrarDropdownNap(false);
  };

  // Buscador Global Jerárquico por Código, Nombre, Serie, Modelo, Poste, NAP y Localidad/Barrio
  const dispositivosFiltrados = dispositivos.filter(d => {
    const tipo = d.tipo || '';
    if (pestanaActiva === 'NAP' && tipo !== 'Caja NAP') return false;
    if (pestanaActiva === 'CLIENTES' && tipo !== 'Clientes') return false;
    if (pestanaActiva === 'POSTES' && tipo !== 'Poste') return false;
    if (pestanaActiva === 'ONUS' && tipo !== 'ONU') return false;

    // Filtro por estatus
    if (filtroEstatusDispositivo !== 'TODOS') {
      const estadoStr = String(d.estado ?? d.estatus ?? 'ACTIVO').trim().toUpperCase();
      if (filtroEstatusDispositivo === 'ACTIVO' && estadoStr !== 'ACTIVO') return false;
      if (filtroEstatusDispositivo === 'SUSPENDIDO' && estadoStr !== 'SUSPENDIDO') return false;
      if (filtroEstatusDispositivo === 'CANCELADO' && estadoStr !== 'CANCELADO') return false;
      if (filtroEstatusDispositivo === 'DESACTIVADO' && estadoStr !== 'DESACTIVADO') return false;
    }

    if (!filtroTablaGeneral.trim()) return true;

    const texto = filtroTablaGeneral.toLowerCase().trim();
    const loc = String(d.localidad || '').toLowerCase();

    return (d.codigo || '').toLowerCase().includes(texto) ||
           (d.nombre_completo || '').toLowerCase().includes(texto) ||
           (d.no_serie || '').toLowerCase().includes(texto) ||
           (d.modelo || '').toLowerCase().includes(texto) ||
           (d.posteAsociado || '').toLowerCase().includes(texto) ||
           (d.napAsociada || '').toLowerCase().includes(texto) ||
           loc.includes(texto);
  });

  const abrirModalCrear = async () => {
    setModoEdicion(false);
    setElementoSeleccionado(null);
    setTextoDMS('');
    setTextoBusquedaPoste('');
    setTextoBusquedaNap('');
    setTextoBusquedaNapPoste('');
    setNapsSeleccionadasPosteForm([]);
    setMostrarDropdownPostes(false);
    setMostrarDropdownNap(false);
    setMostrarDropdownNapPoste(false);
    await cargarDatosAuxiliares();

    let tipoInicial = 'Clientes';
    if (pestanaActiva === 'NAP') tipoInicial = 'Caja NAP';
    else if (pestanaActiva === 'POSTES') tipoInicial = 'Poste';
    else if (pestanaActiva === 'ONUS') tipoInicial = 'ONU';

    setForm({
      tipo: tipoInicial,
      codigo: '',
      localidad: 'MX-B1',
      poste_id: '',
      posteAsociado: '',
      clienteAsociado: '',
      napAsociada: '',
      puertoAsignado: '',
      serie: '',
      cliente: '',
      nombreCliente: '',
      fecha_instalacion: new Date().toISOString().split('T')[0],
      latitud: '',
      longitud: '',
      estado: 'ACTIVO',
      capacidad_puertos: '8',
      puertos_usados: '0',
      napsAsociadas: [],
      onuSerie: '',
      onuModelo: ''
    });
    setModalAbierto(true);
  };
  
  const abrirModalEditar = async (item, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setModoEdicion(true);
    setElementoSeleccionado(item);
    setTextoDMS('');
    setTextoBusquedaNapPoste('');
    setMostrarDropdownPostes(false);
    setMostrarDropdownNap(false);
    setMostrarDropdownNapPoste(false);
    await cargarDatosAuxiliares();

    const posteEncontrado = postesDisponiblesBD.find(p => String(p.realId) === String(item.poste_id || item.poste?.id));
    const nombrePosteInicial = item.posteAsociado || posteEncontrado?.codigo || '';
    setTextoBusquedaPoste(nombrePosteInicial);
    setTextoBusquedaNap(item.napAsociada || '');

    const idPosteActual = String(item.realId);
    const napsInicialesPoste = napsDisponiblesBD.filter(n => 
      String(n.poste_id) === idPosteActual || 
      String(n.posteAsociado || '').toLowerCase() === String(item.codigo || '').toLowerCase()
    );
    setNapsSeleccionadasPosteForm(napsInicialesPoste);

    const estadoBD = (item.estado || item.estatus || 'ACTIVO').toUpperCase();

    setForm({
      tipo: item.tipo,
      codigo: item.codigo_nap || item.codigo || item.cliente_ref || '',
      localidad: item.localidad || 'MX-B1',
      poste_id: item.poste_id !== null && item.poste_id !== undefined ? String(item.poste_id) : '',
      posteAsociado: nombrePosteInicial,
      clienteAsociado: item.clienteAsociado || '',
      napAsociada: item.napAsociada || item.id_nap || '',
      puertoAsignado: item.puertoAsignado !== null && item.puertoAsignado !== undefined ? String(item.puertoAsignado) : '',
      serie: item.no_serie || item.contacto || '',
      cliente: item.cliente_ref || '',
      nombreCliente: item.nombre_completo || '',
      fecha_instalacion: item.fecha_instalacion ? item.fecha_instalacion.split('T')[0] : new Date().toISOString().split('T')[0],
      latitud: item.latitud !== null && item.latitud !== undefined ? String(item.latitud) : '',
      longitud: item.longitud !== null && item.longitud !== undefined ? String(item.longitud) : '',
      estado: estadoBD.includes('SUSP') ? 'SUSPENDIDO' : estadoBD.includes('CANC') ? 'CANCELADO' : estadoBD.includes('DESACT') ? 'DESACTIVADO' : 'ACTIVO',
      capacidad_puertos: item.capacidad_puertos ? String(item.capacidad_puertos) : '8',
      puertos_usados: item.puertos_usados !== null && item.puertos_usados !== undefined ? String(item.puertos_usados) : '0',
      napsAsociadas: napsInicialesPoste.map(n => n.realId),
      onuSerie: item.tipo === 'ONU' ? (item.no_serie || item.contacto || '') : '',
      onuModelo: item.tipo === 'ONU' ? (item.modelo || '') : ''
    });

    setModalAbierto(true);
  };

  const abrirModalEliminar = (item, e) => {
    e.stopPropagation();
    setElementoSeleccionado(item);
    setModalEliminar(true);
  };

  const confirmarEliminar = async () => {
    if (!elementoSeleccionado) return;
    let endpoint = 'clientes';
    if (elementoSeleccionado.tipo === 'Caja NAP') endpoint = 'naps';
    if (elementoSeleccionado.tipo === 'Poste') endpoint = 'postes';
    if (elementoSeleccionado.tipo === 'ONU') endpoint = 'clientes';

    if (!elementoSeleccionado.realId) {
      mostrarAlertaFlotante("Error: El elemento seleccionado no tiene un ID válido.", "error");
      return;
    }

    try {
      const respuesta = await fetch(`http://localhost:3000/api/red/${endpoint}/${elementoSeleccionado.realId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      const dataRes = await respuesta.json().catch(() => ({}));

      if (respuesta.ok) {
        setModalEliminar(false);
        mostrarAlertaFlotante("Elemento eliminado con éxito del sistema.");
        obtenerTodosLosDispositivos();
      } else {
        const mensajeBackend = dataRes.error || dataRes.message || "No se pudo eliminar el elemento.";
        mostrarAlertaFlotante(mensajeBackend, "error");
      }
    } catch (error) {
      console.error(error);
      mostrarAlertaFlotante("Error de conexión al intentar eliminar el elemento.", "error");
    }
  };

   const handleGuardar = async (e) => {
    e.preventDefault();
    let endpoint = 'clientes';
    if (form.tipo === 'Caja NAP') endpoint = 'naps';
    if (form.tipo === 'Poste') endpoint = 'postes';

    const normalizarLocalidad = (loc) => {
      if (!loc) return "MX_B1";
      const limpio = loc.trim().toUpperCase().replace(/-/g, '_');
      const validas = ["MX_B1", "MX_B2", "MX_B3", "MX_B4", "CM", "BI", "BH", "BM", "ICJ", "YDJ"];
      return validas.includes(limpio) ? limpio : "MX_B1";
    };

    const localidadFinal = normalizarLocalidad(form.localidad);

    let datosAEnviar = {};

    if (form.tipo === 'Clientes') {
      const napSeleccionadaObj = napsDisponiblesBD.find(n => String(n.codigo || '').toLowerCase() === String(form.napAsociada || '').toLowerCase() || String(n.realId) === String(form.napAsociada));
      const idNapFinal = napSeleccionadaObj ? Number(napSeleccionadaObj.realId) : null;

      datosAEnviar = {
      cliente_ref: form.codigo,
      nombre_completo: form.nombreCliente || form.codigo,
      contacto: form.serie || '', 
      localidad: localidadFinal,
      estatus: form.estado === 'ACTIVO',
      estado: form.estado,
      id_nap: idNapFinal,
      puerto_asignado: form.puertoAsignado ? Number(form.puertoAsignado) : null,
      fecha_instalacion: form.fecha_instalacion ? new Date(form.fecha_instalacion).toISOString() : new Date().toISOString(),
      latitud: form.latitud ? parseFloat(form.latitud) : null,
      longitud: form.longitud ? parseFloat(form.longitud) : null
      };
    
    } else if (form.tipo === 'ONU') {
     datosAEnviar = {
    cliente_ref: form.codigo,
    nombre_completo: form.nombreCliente || form.codigo,
    contacto: form.serie || '', 
    localidad: localidadFinal, 
    estatus: form.estado === 'ACTIVO',
    estado: form.estado,
    id_nap: idNapFinal,
    puerto_asignado: form.puertoAsignado ? Number(form.puertoAsignado) : null,
    fecha_instalacion: form.fecha_instalacion ? new Date(form.fecha_instalacion).toISOString() : new Date().toISOString(),
    latitud: form.latitud ? parseFloat(form.latitud) : null,
    longitud: form.longitud ? parseFloat(form.longitud) : null
    };

    } else if (form.tipo === 'Caja NAP') {
      const posteSeleccionadoObj = postesDisponiblesBD.find(p => String(p.codigo || '').toLowerCase() === String(form.posteAsociado || '').toLowerCase() || String(p.realId) === String(form.poste_id));
      const idPosteFinal = posteSeleccionadoObj ? Number(posteSeleccionadoObj.realId) : null;

        datosAEnviar = {
         poste_id: idPosteFinal,
         codigo_nap: form.codigo,
         localidad: localidadFinal, // <--- Aquí usamos la variable normalizada
         no_serie: form.serie || null,
         estado: form.estado,
         latitud: form.latitud ? parseFloat(form.latitud) : null,
         longitud: form.longitud ? parseFloat(form.longitud) : null,
         capacidad_puertos: form.capacidad_puertos ? Number(form.capacidad_puertos) : 8,
         fecha_instalacion: form.fecha_instalacion ? new Date(form.fecha_instalacion).toISOString() : new Date().toISOString()
        };
    } else {
      // Para Postes
      datosAEnviar = {
      codigo: form.codigo,
      localidad: localidadFinal,
      estado: form.estado,
      latitud: form.latitud ? parseFloat(form.latitud) : null,
      longitud: form.longitud ? parseFloat(form.longitud) : null,
      fecha_instalacion: form.fecha_instalacion ? new Date(form.fecha_instalacion).toISOString() : new Date().toISOString(),
      napsAsociadas: napsSeleccionadasPosteForm.map(n => n.realId)
     };
    }

    try {
      const url = modoEdicion && elementoSeleccionado?.realId
        ? `http://localhost:3000/api/red/${endpoint}/${elementoSeleccionado.realId}` 
        : `http://localhost:3000/api/red/${endpoint}`;

      const respuesta = await fetch(url, {
        method: modoEdicion ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(datosAEnviar)
      });

      if (respuesta.ok) {
        setModalAbierto(false);
        if (modoEdicion) {
          mostrarAlertaFlotante("Datos actualizados con éxito.");
        } else {
          mostrarAlertaFlotante("Registro exitoso.");
        }
        obtenerTodosLosDispositivos();
      } else {
        const errorData = await respuesta.json().catch(() => ({}));
        mostrarAlertaFlotante(`Error: ${errorData.error || errorData.message || respuesta.statusText}`, "error");
      }
    } catch (error) {
      console.error(error);
      mostrarAlertaFlotante("Error de conexión al guardar el registro.", "error");
    }
  };

  const napSeleccionadaObj = napsDisponiblesBD.find(
    n => String(n.codigo || '').toLowerCase() === String(form.napAsociada || '').toLowerCase() || String(n.realId) === String(form.napAsociada)
  );

  const clientesEnEstaNap = clientesDisponiblesBD.filter(cli => 
    String(cli.napAsociada || '').trim().toLowerCase() === String(napSeleccionadaObj?.codigo || '').trim().toLowerCase() ||
    String(cli.id_nap) === String(napSeleccionadaObj?.realId)
  );

  const puertosOcupadosMap = {};
  clientesEnEstaNap.forEach(cli => {
    if (modoEdicion && elementoSeleccionado && String(cli.realId) === String(elementoSeleccionado.realId)) {
      return;
    }
    if (cli.puertoAsignado !== null && cli.puertoAsignado !== undefined && cli.puertoAsignado !== '') {
      puertosOcupadosMap[Number(cli.puertoAsignado)] = cli.nombre_completo || cli.cliente_ref;
    }
  });

  const capacidadTotalNap = napSeleccionadaObj ? Number(napSeleccionadaObj.capacidad_puertos) || 8 : 8;

  const posteAsociadoDetectado = napSeleccionadaObj 
    ? (napSeleccionadaObj.posteAsociado || postesDisponiblesBD.find(p => String(p.realId) === String(napSeleccionadaObj.poste_id))?.codigo || 'N/A')
    : 'N/A';

  const postesFiltradosDropdown = postesDisponiblesBD.filter(p => {
    if (!textoBusquedaPoste.trim()) return true;
    return (p.codigo || '').toLowerCase().includes(textoBusquedaPoste.toLowerCase().trim());
  });

  const napsFiltradasDropdown = napsDisponiblesBD.filter(n => {
    if (!textoBusquedaNap.trim()) return true;
    const codigo = (n.codigo || '').toLowerCase();
    const poste = (n.posteAsociado || '').toLowerCase();
    const texto = textoBusquedaNap.toLowerCase().trim();
    return codigo.includes(texto) || poste.includes(texto);
  });

  const napsFiltradasParaDropdownPoste = napsDisponiblesBD.filter(n => {
    if (!textoBusquedaNapPoste.trim()) return true;
    return (n.codigo || '').toLowerCase().includes(textoBusquedaNapPoste.toLowerCase().trim());
  });

  return (
    <div style={{ padding: '24px 32px', backgroundColor: '#f8fafc', height: '100%', boxSizing: 'border-box', overflowY: 'auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>Gestión de Dispositivos</h2>
        <div style={{ width: '40px', height: '3px', backgroundColor: '#16a34a', marginTop: '4px', borderRadius: '2px' }}></div>
      </div>

      <div style={{ marginBottom: '16px', backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Buscador Global:</span>
        <input 
          type="text"
          placeholder="Buscar por Código, Serie, Modelo, POSTE, NAP, Localidad (ej. MX, MX-B1, CM, YDJ)..."
          value={filtroTablaGeneral}
          onChange={(e) => setFiltroTablaGeneral(e.target.value)}
          style={{ flex: 1, padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
        />
        {filtroTablaGeneral && (
          <button 
            onClick={() => setFiltroTablaGeneral('')}
            style={{ backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '7px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' }}
          >
            Limpiar
          </button>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'NAP', label: 'NAP' },
            { id: 'CLIENTES', label: 'CLIENTES' },
            { id: 'POSTES', label: 'POSTES' },
            { id: 'ONUS', label: 'ONUS' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setPestanaActiva(tab.id); setFilaExpandida(null); }}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: pestanaActiva === tab.id ? '#16a34a' : '#010203',
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

        {/* Botones de Filtro por Estatus Dinámicos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569' }}>Estatus:</span>
          {(pestanaActiva === 'NAP' || pestanaActiva === 'POSTES') ? (
            [
              { id: 'TODOS', label: 'TODOS' },
              { id: 'ACTIVO', label: 'ACTIVO' },
              { id: 'DESACTIVADO', label: 'DESACTIVADO' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltroEstatusDispositivo(f.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: filtroEstatusDispositivo === f.id ? '#017d9c' : '#ffffff',
                  color: filtroEstatusDispositivo === f.id ? '#ffffff' : '#1a1b1b',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))
          ) : (
            [
              { id: 'TODOS', label: 'TODOS' },
              { id: 'ACTIVO', label: 'ACTIVO' },
              { id: 'SUSPENDIDO', label: 'SUSPENDIDO' },
              { id: 'CANCELADO', label: 'CANCELADO' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltroEstatusDispositivo(f.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: filtroEstatusDispositivo === f.id ? '#017d9c' : '#ffffff',
                  color: filtroEstatusDispositivo === f.id ? '#ffffff' : '#1a1b1b',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={abrirModalCrear}
            style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '9px 18px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}
          >
            + Registrar Dispositivo
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#1e293b', fontSize: '0.85rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '12px 16px' }}>ID del Dispositivo</th>
              <th style={{ padding: '12px 16px' }}>Localidad / Barrio</th>
              <th style={{ padding: '12px 16px' }}>Estado</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {dispositivosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                  No hay registros que coincidan con la búsqueda o estatus.
                </td>
              </tr>
            ) : (
              dispositivosFiltrados.map((item) => {
                const estadoStr = String(item.estado ?? item.estatus ?? 'ACTIVO').trim().toUpperCase();
                
                const esSuspendido = estadoStr === 'SUSPENDIDO';
                const esCancelado = estadoStr === 'CANCELADO';
                const esDesactivado = estadoStr === 'DESACTIVADO' || estadoStr === 'INACTIVO';

                let colorTexto = '#16a34a';
                let fondoColor = '#dcfce7';
                let textoEstatus = 'Activo';

                if (esSuspendido) {
                  colorTexto = '#b45309';
                  fondoColor = '#fef3c7';
                  textoEstatus = 'Suspendido';
                } else if (esCancelado) {
                  colorTexto = '#dc2626';
                  fondoColor = '#fee2e2';
                  textoEstatus = 'Cancelado';
                } else if (esDesactivado) {
                  colorTexto = '#64748b';
                  fondoColor = '#f1f5f9';
                  textoEstatus = 'Desactivado';
                }

                return (
                  <React.Fragment key={item.uniqueKey}>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#0f172a' }}>
                        {item.codigo} {item.nombre_completo && item.tipo !== 'ONU' ? `- ${item.nombre_completo}` : ''}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>
                          {item.localidad || 'MX-B1'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ color: colorTexto, fontWeight: '700', backgroundColor: fondoColor, padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem' }}>
                          {textoEstatus}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button 
                          onClick={() => irAlMapaGeolocalizacion(item)}
                          style={{ backgroundColor: '#022d58', color: '#ffffff', border: '1px solid #022a5a', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px', fontSize: '0.75rem', fontWeight: '600' }}
                        >
                          Ubicar Pin
                        </button>
                        <button 
                          onClick={() => setFilaExpandida(filaExpandida === item.uniqueKey ? null : item.uniqueKey)}
                          style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px', fontSize: '0.75rem', fontWeight: '600' }}
                        >
                          {filaExpandida === item.uniqueKey ? 'Ocultar' : 'Detalles'}
                        </button>
                        <button 
                          onClick={(e) => abrirModalEditar(item, e)}
                          style={{ backgroundColor: '#fef08a', color: '#854d0e', border: '1px solid #fde047', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '8px', fontSize: '0.75rem', fontWeight: '600' }}
                        >
                          Editar
                        </button>
                        <button 
                          onClick={(e) => abrirModalEliminar(item, e)}
                          style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                    {filaExpandida === item.uniqueKey && (
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td colSpan="4" style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: '#334155', fontSize: '0.82rem' }}>
                            {item.tipo === 'Clientes' ? (
                              (() => {
                                const napDelCliente = napsDisponiblesBD.find(n => 
                                  String(n.codigo || '').trim().toLowerCase() === String(item.napAsociada || '').trim().toLowerCase() ||
                                  String(n.realId) === String(item.id_nap)
                                );
                                
                                const posteFinalDetalle = napDelCliente?.posteAsociado || 
                                                          postesDisponiblesBD.find(p => String(p.realId) === String(napDelCliente?.poste_id))?.codigo || 
                                                          item.posteAsociado || 
                                                          'N/A';

                                return (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                    <div><strong>Contacto / Serie:</strong> {item.contacto || item.no_serie || 'N/A'}</div>
                                    <div><strong>NAP / Puerto:</strong> {item.napAsociada ? `${item.napAsociada} (P. ${item.puertoAsignado || 'N/A'})` : 'N/A'}</div>
                                    <div><strong>Poste Asoc.:</strong> {posteFinalDetalle}</div>
                                  </div>
                                );
                              })()
                            ) : item.tipo === 'ONU' ? (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                <div><strong>N° Serie ONU:</strong> {item.no_serie || item.contacto || 'N/A'}</div>
                                <div><strong>Modelo:</strong> {item.modelo || 'N/A'}</div>
                                <div><strong>Instalación:</strong> {item.fecha_instalacion ? item.fecha_instalacion.split('T')[0] : 'S/N'}</div>
                              </div>
                            ) : item.tipo === 'Caja NAP' ? (
                              <div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                                  <div><strong>Poste Asoc.:</strong> {item.posteAsociado || 'N/A'}</div>
                                  <div><strong>N° Serie:</strong> {item.no_serie || 'N/A'}</div>
                                  <div><strong>Puertos Usados:</strong> {item.puertos_usados} / {item.capacidad_puertos}</div>
                                </div>
                                <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                  <strong style={{ display: 'block', marginBottom: '10px', color: '#0369a1', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    CLIENTES CONECTADOS
                                  </strong>
                                  {item.clientesEnNap && item.clientesEnNap.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      {item.clientesEnNap.map((cli, idxCli) => {
                                        const cliEstatusStr = String(cli.estatus ?? 'ACTIVO').trim().toUpperCase();
                                        const cliEsActivo = cliEstatusStr === 'ACTIVO' || cliEstatusStr === 'TRUE';

                                        return (
                                          <div key={`cli-nap-lista-${idxCli}`} style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                              <div>
                                                <span style={{ fontWeight: '700', color: '#475569' }}>Nombre del cliente:</span>{' '}
                                                <span style={{ color: '#0f172a', fontWeight: '700' }}>{cli.nombre_completo || 'Sin nombre'}</span>
                                              </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '2px' }}>
                                              <div>
                                                <span style={{ fontWeight: '700', color: '#475569' }}>Puerto Ocupado:</span>{' '}
                                                <span style={{ color: '#0369a1', fontWeight: '700' }}>{cli.puerto_asignado || 'N/A'}</span>
                                              </div>
                                              <div>
                                                <span style={{ fontWeight: '700', color: '#475569' }}>Estado:</span>{' '}
                                                <span style={{ color: cliEsActivo ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                                                  {cliEsActivo ? 'ACTIVO' : 'INACTIVO'}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>No hay clientes conectados a esta caja NAP todavía.</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <strong>Cajas NAP en este poste:</strong> {
                                    napsDisponiblesBD
                                      .filter(n => String(n.poste_id) === String(item.realId) || String(n.posteAsociado || '').toLowerCase() === String(item.codigo || '').toLowerCase())
                                      .map(n => n.codigo)
                                      .join(', ') || 'Ninguna'
                                  }
                                </div>
                                <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                                  <strong>Instalación:</strong> {item.fecha_instalacion ? item.fecha_instalacion.split('T')[0] : 'S/N'}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '24px 28px', borderRadius: '10px', width: '620px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', color: '#0f172a' }}>{modoEdicion ? 'Editar Dispositivo' : 'Registrar Dispositivo'}</h3>
            <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Tipo de Registro:</label>
                  <select 
                    value={form.tipo}
                    onChange={(e) => setForm({...form, tipo: e.target.value})}
                    style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="Clientes">Cliente</option>
                    <option value="Caja NAP">Caja NAP</option>
                    <option value="Poste">Poste</option>
                    <option value="ONU">ONU</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>ID del Dispositivo:</label>
                  <input 
                    type="text" 
                    required
                    value={form.codigo}
                    onChange={(e) => setForm({...form, codigo: e.target.value})}
                    style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Selector de Localidad / Barrio para evitar duplicidad de nombres */}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                  Localidad / Barrio:
                </label>
                <select 
                  value={form.localidad}
                  onChange={(e) => setForm({...form, localidad: e.target.value})}
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontWeight: '600' }}
                >
                  {CATALOGO_LOCALIDADES.map((loc) => (
                    <option key={loc.codigo} value={loc.codigo}>
                      {loc.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selector de Estatus Operativo Dinámico */}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Estatus Operativo:</label>
                {(form.tipo === 'Caja NAP' || form.tipo === 'Poste') ? (
                  <select 
                    value={form.estado}
                    onChange={(e) => setForm({...form, estado: e.target.value})}
                    style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontWeight: '600' }}
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="DESACTIVADO">DESACTIVADO</option>
                  </select>
                ) : (
                  <select 
                    value={form.estado}
                    onChange={(e) => setForm({...form, estado: e.target.value})}
                    style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontWeight: '600' }}
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="SUSPENDIDO">SUSPENDIDO</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </select>
                )}
              </div>

              {form.tipo === 'Clientes' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Contacto:</label>
                      <input 
                        type="text" 
                        value={form.serie}
                        onChange={(e) => setForm({...form, serie: e.target.value})}
                        style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Nombre del Cliente:</label>
                      <input 
                        type="text" 
                        value={form.nombreCliente}
                        onChange={(e) => setForm({...form, nombreCliente: e.target.value})}
                        style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Fecha de Instalación:</label>
                      <input 
                        type="date" 
                        value={form.fecha_instalacion}
                        onChange={(e) => setForm({...form, fecha_instalacion: e.target.value})}
                        style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '6px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div style={{ position: 'relative' }} ref={dropdownNapRef}>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Caja NAP Origen:</label>
                        <input 
                          type="text"
                          placeholder="Escribe para buscar Caja NAP..."
                          value={textoBusquedaNap}
                          onChange={(e) => {
                            setTextoBusquedaNap(e.target.value);
                            setMostrarDropdownNap(true);
                            if (!e.target.value.trim()) {
                              setForm(prev => ({ ...prev, napAsociada: '', puertoAsignado: '', posteAsociado: '', poste_id: '' }));
                            }
                          }}
                          onFocus={() => setMostrarDropdownNap(true)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box', backgroundColor: '#fff' }}
                        />

                        {mostrarDropdownNap && (
                          <div style={{
                            position: 'absolute',
                            top: 'calc(100% - 2px)',
                            left: '0',
                            right: '-60px',
                            backgroundColor: '#fff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '0 0 6px 6px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 4000,
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                          }}>
                            {napsFiltradasDropdown.length === 0 ? (
                              <div style={{ padding: '8px 12px', fontSize: '0.78rem', color: '#94a3b8' }}>No se encontraron Cajas NAP</div>
                            ) : (
                              napsFiltradasDropdown.map((nap, idx) => {
                                const capacidadTotal = Number(nap.capacidad_puertos) || 8;
                                const usados = Number(nap.puertos_usados) || 0;
                                const libres = Math.max(0, capacidadTotal - usados);

                                return (
                                  <div
                                    key={`dropdown-nap-${idx}`}
                                    onClick={() => seleccionarNap(nap)}
                                    style={{
                                      padding: '8px 12px',
                                      fontSize: '0.8rem',
                                      fontWeight: '600',
                                      cursor: 'pointer',
                                      borderBottom: '1px solid #f1f5f9',
                                      color: '#000000',
                                      backgroundColor: '#ffffff'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                                  >
                                    {nap.codigo} {nap.posteAsociado ? `(Poste: ${nap.posteAsociado})` : ''} — <strong>Puertos usados: {usados}/{capacidadTotal} (Libres: {libres})</strong>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '700' }}>N° Puerto:</label>
                        <select 
                          name="puertoAsignado"
                          value={form.puertoAsignado}
                          onChange={(e) => setForm({...form, puertoAsignado: e.target.value})}
                          disabled={!form.napAsociada}
                          style={{ 
                            width: '100%', 
                            minWidth: '100%', 
                            padding: '8px 12px', 
                            borderRadius: '6px', 
                            border: '1px solid #cbd5e1', 
                            fontSize: '0.8rem', 
                            backgroundColor: form.napAsociada ? '#fff' : '#f1f5f9', 
                            boxSizing: 'border-box' 
                          }}
                          required
                        >
                          <option value="">-- Puerto --</option>
                          {Array.from({ length: capacidadTotalNap }, (_, index) => {
                            const numeroPuerto = index + 1;
                            const clienteOcupante = puertosOcupadosMap[numeroPuerto];
                            const estaOcupado = Boolean(clienteOcupante);

                            return (
                              <option 
                                key={numeroPuerto} 
                                value={numeroPuerto}
                                disabled={estaOcupado}
                                style={estaOcupado ? { color: '#dc2626', backgroundColor: '#fee2e2', fontWeight: '600' } : { color: '#16a34a', fontWeight: '600' }}
                              >
                                {estaOcupado 
                                  ? `Puerto ${numeroPuerto} - Ocupado - ${clienteOcupante}` 
                                  : `Puerto ${numeroPuerto} - Disponible`}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>

                    <div style={{ paddingTop: '4px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#1e3a8a', fontWeight: '700', fontSize: '0.8rem' }}>
                        Poste Asociado: <span style={{ fontWeight: '400', color: '#334155' }}>{posteAsociadoDetectado}</span>
                      </span>
                    </div>

                  </div>
                </>
              )}

              {form.tipo === 'ONU' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>N° Serie de la ONU:</label>
                      <input 
                        type="text" 
                        value={form.onuSerie}
                        onChange={(e) => setForm({...form, onuSerie: e.target.value})}
                        placeholder="Ej. ONU-HW-98231"
                        style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Modelo / Marca:</label>
                      <input 
                        type="text" 
                        value={form.onuModelo}
                        onChange={(e) => setForm({...form, onuModelo: e.target.value})}
                        placeholder="Ej. Huawei / ZTE"
                        style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Fecha de Instalación:</label>
                    <input 
                      type="date" 
                      value={form.fecha_instalacion}
                      onChange={(e) => setForm({...form, fecha_instalacion: e.target.value})}
                      style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}

              {form.tipo === 'Caja NAP' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>N° Serie:</label>
                      <input 
                        type="text" 
                        value={form.serie}
                        onChange={(e) => setForm({...form, serie: e.target.value})}
                        style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Fecha de Instalación:</label>
                      <input 
                        type="date" 
                        value={form.fecha_instalacion}
                        onChange={(e) => setForm({...form, fecha_instalacion: e.target.value})}
                        style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Capacidad de Puertos:</label>
                      <select 
                        value={form.capacidad_puertos}
                        onChange={(e) => setForm({...form, capacidad_puertos: e.target.value})}
                        style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}
                      >
                        <option value="8">8 Puertos</option>
                        <option value="16">16 Puertos</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ border: '1px solid #cbd5e1', padding: '10px', borderRadius: '6px', backgroundColor: '#f8fafc', position: 'relative' }} ref={dropdownPosteRef}>
                    <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                      Asociar Poste a esta Caja NAP:
                    </label>

                    <input 
                      type="text"
                      placeholder="Escribe para buscar poste..."
                      value={textoBusquedaPoste}
                      onChange={(e) => {
                        setTextoBusquedaPoste(e.target.value);
                        setMostrarDropdownPostes(true);
                        if (!e.target.value.trim()) {
                          setForm(prev => ({ ...prev, poste_id: '', posteAsociado: '' }));
                        }
                      }}
                      onFocus={() => setMostrarDropdownPostes(true)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box', backgroundColor: '#fff' }}
                    />

                    {mostrarDropdownPostes && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% - 2px)',
                        left: '10px',
                        right: '10px',
                        backgroundColor: '#fff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0 0 6px 6px',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        zIndex: 4000,
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                      }}>
                        {postesFiltradosDropdown.length === 0 ? (
                          <div style={{ padding: '8px 12px', fontSize: '0.78rem', color: '#94a3b8' }}>No se encontraron postes</div>
                        ) : (
                          postesFiltradosDropdown.map((p, idx) => {
                            const napAsociadaAlPoste = napsDisponiblesBD.find(n => 
                              String(n.poste_id) === String(p.realId) || 
                              String(n.posteAsociado || '').toLowerCase() === String(p.codigo || '').toLowerCase()
                            );
                            
                            const esLaMismaNap = modoEdicion && elementoSeleccionado && 
                              (String(napAsociadaAlPoste?.realId) === String(elementoSeleccionado.realId) || 
                               String(napAsociadaAlPoste?.codigo) === String(elementoSeleccionado.codigo));

                            const estaOcupado = napAsociadaAlPoste && !esLaMismaNap;
                            const codigoNapOcupante = napAsociadaAlPoste ? (napAsociadaAlPoste.codigo || napAsociadaAlPoste.codigo_nap) : '';

                            return (
                              <div
                                key={`dropdown-poste-${idx}`}
                                onClick={() => {
                                  if (estaOcupado) return;

                                  setForm(prev => ({
                                    ...prev,
                                    poste_id: String(p.realId),
                                    posteAsociado: p.codigo
                                  }));
                                  setTextoBusquedaPoste(p.codigo);
                                  setMostrarDropdownPostes(false);
                                }}
                                style={{
                                  padding: '7px 10px',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  cursor: estaOcupado ? 'not-allowed' : 'pointer',
                                  borderBottom: '1px solid #f1f5f9',
                                  color: estaOcupado ? '#dc2626' : '#16a34a',
                                  backgroundColor: estaOcupado ? '#fee2e2' : '#f0fdf4',
                                  opacity: estaOcupado ? 0.8 : 1
                                }}
                              >
                                {estaOcupado 
                                  ? `${p.codigo} — Ocupado por NAP: ${codigoNapOcupante}` 
                                  : `${p.codigo} — Disponible`}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {form.tipo === 'Poste' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Fecha de Instalación:</label>
                    <input 
                      type="date" 
                      value={form.fecha_instalacion}
                      onChange={(e) => setForm({...form, fecha_instalacion: e.target.value})}
                      style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ border: '1px solid #cbd5e1', padding: '12px', borderRadius: '6px', backgroundColor: '#f8fafc', position: 'relative' }} ref={dropdownNapPosteRef}>
                    <label style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Caja NAP instalada en este Poste (Máximo 1):
                    </label>

                    {napsSeleccionadasPosteForm.length === 0 ? (
                      <>
                        <input 
                          type="text"
                          placeholder="Escribe para buscar Caja NAP..."
                          value={textoBusquedaNapPoste}
                          onChange={(e) => {
                            setTextoBusquedaNapPoste(e.target.value);
                            setMostrarDropdownNapPoste(true);
                          }}
                          onFocus={() => setMostrarDropdownNapPoste(true)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box', backgroundColor: '#fff' }}
                        />

                        {mostrarDropdownNapPoste && (
                          <div style={{
                            position: 'absolute',
                            top: 'calc(100% - 2px)',
                            left: '12px',
                            right: '12px',
                            backgroundColor: '#fff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '0 0 6px 6px',
                            maxHeight: '180px',
                            overflowY: 'auto',
                            zIndex: 4000,
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                          }}>
                            <div
                              onClick={() => {
                                setNapsSeleccionadasPosteForm([]);
                                setTextoBusquedaNapPoste('No Aplica');
                                setMostrarDropdownNapPoste(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                fontSize: '0.8rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                borderBottom: '1px solid #e2e8f0',
                                color: '#475569',
                                backgroundColor: '#f1f5f9'
                              }}
                            >
                              No Aplica (Sin Caja NAP)
                            </div>

                            {napsFiltradasParaDropdownPoste.length === 0 ? (
                              <div style={{ padding: '8px 12px', fontSize: '0.78rem', color: '#94a3b8' }}>No se encontraron Cajas NAP</div>
                            ) : (
                              napsFiltradasParaDropdownPoste.map((napItem, idxN) => {
                                const posteActualId = elementoSeleccionado ? String(elementoSeleccionado.realId) : '';
                                const posteAsignadoNapId = napItem.poste_id ? String(napItem.poste_id) : '';
                                const posteAsignadoNapCodigo = (napItem.posteAsociado || '').toLowerCase();
                                const codigoPosteActualForm = (form.codigo || '').toLowerCase();

                                const yaEstaEnEstePoste = (posteAsignadoNapId && posteActualId && posteAsignadoNapId === posteActualId) ||
                                                         (posteAsignadoNapCodigo && codigoPosteActualForm && posteAsignadoNapCodigo === codigoPosteActualForm);

                                const estaAsignadaAOtro = napItem.posteAsociado && !yaEstaEnEstePoste;

                                return (
                                  <div
                                    key={`dropdown-nap-poste-${idxN}`}
                                    onClick={() => {
                                      if (!estaAsignadaAOtro) {
                                        setNapsSeleccionadasPosteForm([napItem]);
                                      }
                                      setTextoBusquedaNapPoste('');
                                      setMostrarDropdownNapPoste(false);
                                    }}
                                    style={{
                                      padding: '7px 10px',
                                      fontSize: '0.8rem',
                                      fontWeight: '600',
                                      cursor: estaAsignadaAOtro ? 'not-allowed' : 'pointer',
                                      borderBottom: '1px solid #f1f5f9',
                                      color: estaAsignadaAOtro ? '#dc2626' : '#16a34a',
                                      backgroundColor: estaAsignadaAOtro ? '#fee2e2' : '#f0fdf4'
                                    }}
                                  >
                                    {estaAsignadaAOtro 
                                      ? `${napItem.codigo} — Ocupada por POSTE: ${napItem.posteAsociado}` 
                                      : `${napItem.codigo} — Disponible`}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </>
                    ) : null}

                    <div style={{ marginTop: '8px' }}>
                      {napsSeleccionadasPosteForm.length > 0 ? (
                        napsSeleccionadasPosteForm.map((napSel, iSel) => (
                          <div key={`nap-sel-${iSel}`} style={{ backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: '700', color: '#1e293b' }}>{napSel.codigo}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setNapsSeleccionadasPosteForm([]);
                                setTextoBusquedaNapPoste('');
                              }}
                              style={{ backgroundColor: '#f8f8f8', color: '#030303', border: 'none', padding: '3px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                            >
                              X
                            </button>
                          </div>
                        ))
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: '#161515', fontStyle: 'italic' }}>
                            {textoBusquedaNapPoste === 'No Aplica' ? 'Seleccionado: No Aplica (Sin Caja NAP)' : 'Ninguna Caja NAP seleccionada todavía.'}
                          </span>
                          {textoBusquedaNapPoste === 'No Aplica' && (
                            <button
                              type="button"
                              onClick={() => setTextoBusquedaNapPoste('')}
                              style={{ backgroundColor: '#ffffff', color: '#050505', border: 'none', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer' }}
                            >
                              X
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ border: '1px dashed #cbd5e1', padding: '14px', borderRadius: '6px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '700', display: 'block' }}>Ubicación Física del Dispositivo:</span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <input 
                    type="text" 
                    placeholder="Pega aquí coordenada DMS..." 
                    value={textoDMS}
                    onChange={(e) => setTextoDMS(e.target.value)}
                    style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', boxSizing: 'border-box' }}
                  />
                  <button 
                    type="button" 
                    onClick={handleCalcularDMS}
                    style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Convertir DMS
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    placeholder="Latitud" 
                    value={form.latitud}
                    onChange={(e) => setForm({...form, latitud: e.target.value})}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box' }}
                  />
                  <input 
                    type="text" 
                    placeholder="Longitud" 
                    value={form.longitud}
                    onChange={(e) => setForm({...form, longitud: e.target.value})}
                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box' }}
                  />
                  <button 
                    type="button" 
                    onClick={capturarGPS}
                    style={{ backgroundColor: '#475569', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    GPS
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setModalAbierto(false)}
                  style={{ backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '9px 16px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  style={{ backgroundColor: '#16a34a', color: '#ffffff', border: 'none', padding: '9px 20px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}
                >
                  {modoEdicion ? 'Actualizar' : 'Guardar'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {modalEliminar && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '24px 28px', borderRadius: '10px', width: '400px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#dc2626' }}>Eliminar Dispositivo</h3>
            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '20px' }}>
              ¿Estás segura de que deseas eliminar el elemento <strong>{elementoSeleccionado?.codigo}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button 
                onClick={() => setModalEliminar(false)}
                style={{ backgroundColor: '#e2e8f0', color: '#334155', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarEliminar}
                style={{ backgroundColor: '#dc2626', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}
              > 
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
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
  );
}

export default Dispositivos;
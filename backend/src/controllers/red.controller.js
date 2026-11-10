const prisma = require("../config/db");

// ==================== POSTES ====================
const obtenerPostes = async (req, res) => {
  try {
    const postes = await prisma.postes.findMany({ include: { naps: true } });
    const normalizados = postes.map(p => ({
      ...p,
      id: p.poste_id,
      codigo: p.codigo
    }));
    res.json(normalizados);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los postes', detalle: error.message });
  }
};

const crearPoste = async (req, res) => {
  try {
    const { codigo, latitud, longitud, fecha_instalacion, archivo_kmz } = req.body;
    
    const nuevoPoste = await prisma.postes.create({
      data: {
        codigo,
        latitud: parseFloat(latitud),
        longitud: parseFloat(longitud),
        fecha_instalacion: fecha_instalacion ? new Date(fecha_instalacion) : new Date(),
        archivo_kmz: archivo_kmz || null
      }
    });
    res.status(201).json({ mensaje: 'Poste creado exitosamente', poste: nuevoPoste });
  } catch (error) {
    console.error("Error detallado al crear poste:", error);
    res.status(500).json({ error: 'Error al crear el poste', detalle: error.message });
  }
};

const actualizarPoste = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, latitud, longitud, estado } = req.body;
    const posteActualizado = await prisma.postes.update({
      where: { poste_id: Number(id) },
      data: {
        codigo,
        latitud: latitud ? parseFloat(latitud) : undefined,
        longitud: longitud ? parseFloat(longitud) : undefined,
        estado
      }
    });
    res.json({ mensaje: 'Poste actualizado exitosamente', poste: posteActualizado });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el poste', detalle: error.message });
  }
};

const eliminarPoste = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.postes.delete({ where: { poste_id: Number(id) } });
    res.json({ mensaje: 'Poste eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el poste', detalle: error.message });
  }
};

// ==================== NAPS ====================
const obtenerNaps = async (req, res) => {
  try {
    const naps = await prisma.nAP.findMany();
    const normalizados = naps.map(n => ({
      ...n,
      id: n.id_nap,
      codigo: n.codigo_nap
    }));
    res.json(normalizados);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las NAPs', detalle: error.message });
  }
};

const crearNap = async (req, res) => {
  try {
    const { poste_id, codigo_nap, localidad, no_serie, potencia, latitud, longitud, capacidad_puertos, puertos_usados, archivo_kmz } = req.body;
    
    const nuevaNap = await prisma.nAP.create({
      data: {
        poste_id: poste_id ? Number(poste_id) : null,
        codigo_nap,
        localidad: localidad ? localidad.replace('-', '_') : 'MX_B1',
        no_serie: no_serie || null,
        potencia: potencia ? parseFloat(potencia) : null,
        latitud: parseFloat(latitud),
        longitud: parseFloat(longitud),
        capacidad_puertos: capacidad_puertos ? Number(capacidad_puertos) : null,
        puertos_usados: puertos_usados ? Number(puertos_usados) : null,
        archivo_kmz: archivo_kmz || null
      }
    });
    res.status(201).json({ mensaje: 'NAP creada exitosamente', nap: nuevaNap });
  } catch (error) {
    console.error("Error detallado al crear NAP:", error);
    res.status(500).json({ error: 'Error al crear la NAP', detalle: error.message });
  }
};

const actualizarNap = async (req, res) => {
  try {
    const { id } = req.params;
    const { poste_id, codigo_nap, localidad, no_serie, potencia, latitud, longitud, capacidad_puertos, puertos_usados, estado } = req.body;
    const napActualizada = await prisma.nAP.update({
      where: { id_nap: Number(id) },
      data: {
        poste_id: poste_id ? Number(poste_id) : undefined,
        codigo_nap,
        localidad: localidad ? localidad.replace('-', '_') : undefined,
        no_serie,
        potencia: potencia ? parseFloat(potencia) : null,
        latitud: latitud ? parseFloat(latitud) : undefined,
        longitud: longitud ? parseFloat(longitud) : undefined,
        capacidad_puertos: capacidad_puertos ? Number(capacidad_puertos) : undefined,
        puertos_usados: puertos_usados ? Number(puertos_usados) : undefined,
        estado
      }
    });
    res.json({ mensaje: 'NAP actualizada exitosamente', nap: napActualizada });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la NAP', detalle: error.message });
  }
};

const eliminarNap = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.nAP.delete({ where: { id_nap: Number(id) } });
    res.json({ mensaje: 'NAP eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la NAP', detalle: error.message });
  }
};

// ==================== CLIENTES ====================
const obtenerClientes = async (req, res) => {
  try {
    const clientes = await prisma.clientes.findMany({ include: { nap: true } });
    const normalizados = clientes.map(c => ({
      ...c,
      id: c.id_cliente,
      tipo: 'Clientes',
      codigo: c.cliente_ref || c.nombre_completo,
      napAsociada: c.nap ? c.nap.codigo_nap : '',
      puertoAsignado: c.puerto_asignado
    }));
    res.json(normalizados);
  } catch (error) {
    console.error("--- ERROR EN CLIENTES ---", error);
    res.status(500).json({ error: 'Error al obtener los clientes', detalle: error.message });
  }
};

const crearCliente = async (req, res) => {
  try {
    const { nombre_completo, cliente_ref, contacto, localidad, estatus, estado, latitud, longitud, fecha_instalacion, distancia_nap, id_nap, puerto_asignado } = req.body;

    if (id_nap && puerto_asignado !== undefined && puerto_asignado !== null && puerto_asignado !== '') {
      const napIdNum = Number(id_nap);
      const puertoNum = Number(puerto_asignado);

      const puertoOcupado = await prisma.clientes.findFirst({
        where: {
          id_nap: napIdNum,
          puerto_asignado: puertoNum,
          estatus: true
        }
      });

      if (puertoOcupado) {
        return res.status(400).json({
          mensaje: `El puerto ${puertoNum} de esta caja NAP ya se encuentra ocupado por el cliente "${puertoOcupado.nombre_completo}".`
        });
      }
    }

 const limpiarLocalidad = (valLocalidad) => {
  if (!valLocalidad) return null;
  const formateada = valLocalidad.trim().toUpperCase().replace(/-/g, '_');
  const valoresValidos = ["MX_B1", "MX_B2", "MX_B3", "MX_B4", "CM", "BI", "BH", "BM", "ICJ", "YDJ"];
  return valoresValidos.includes(formateada) ? formateada : null;
};

const nuevoCliente = await prisma.clientes.create({
  data: {
    nombre_completo: req.body.nombre_completo,
    cliente_ref: req.body.cliente_ref,
    contacto: req.body.contacto,
    estatus: true,
    estado: req.body.estado || "ACTIVO",
    latitud: req.body.latitud ? parseFloat(req.body.latitud) : null,
    longitud: req.body.longitud ? parseFloat(req.body.longitud) : null,
    fecha_instalacion: req.body.fecha_instalacion ? new Date(req.body.fecha_instalacion) : null,
    distancia_nap: req.body.distancia_nap ? parseFloat(req.body.distancia_nap) : null,
    id_nap: req.body.id_nap ? parseInt(req.body.id_nap) : null,
    puerto_asignado: req.body.puerto_asignado ? parseInt(req.body.puerto_asignado) : null,
    localidad: limpiarLocalidad(req.body.localidad),
  },
  include: {
    nap: true,
    reportes: true
  }
});

    return res.status(201).json({
      mensaje: 'Cliente registrado exitosamente',
      cliente: nuevoCliente
    });

  } catch (error) {
    console.error('--- ERROR AL CREAR CLIENTE ---', error);
    return res.status(500).json({
      mensaje: 'Error interno al registrar el cliente',
      error: error.message
    });
  }
};

const actualizarCliente = async (req, res) => {
  const { id } = req.params;
  const { estado, estatus, cliente_ref, nombre_completo, contacto, localidad, id_nap, puerto_asignado, fecha_instalacion, latitud, longitud } = req.body;

  try {
    const clienteActualizado = await prisma.clientes.update({
      where: { id_cliente: Number(id) },
      data: {
        cliente_ref,
        nombre_completo,
        contacto,
        localidad: localidad ? localidad.replace('-', '_') : undefined,
        estado: estado ? estado : (estatus ? 'ACTIVO' : 'CANCELADO'),
        estatus: estado === 'ACTIVO' || estatus === true,
        id_nap: id_nap ? Number(id_nap) : null,
        puerto_asignado: puerto_asignado ? Number(puerto_asignado) : null,
        fecha_instalacion: fecha_instalacion ? new Date(fecha_instalacion) : undefined,
        latitud: latitud !== undefined ? latitud : undefined,
        longitud: longitud !== undefined ? longitud : undefined
      }
    });
    return res.json(clienteActualizado);
  } catch (error) {
    console.error("Error al actualizar cliente:", error);
    return res.status(500).json({ error: "No se pudo actualizar el cliente", detalle: error.message });
  }
};

const eliminarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.clientes.delete({ where: { id_cliente: Number(id) } });
    res.json({ mensaje: 'Cliente eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el cliente', detalle: error.message });
  }
};

// ==================== ONUS (EQUIPOS) ====================
const obtenerOnus = async (req, res) => {
  try {
    const onus = await prisma.oNUS.findMany({ include: { cliente: true } });
    const normalizados = onus.map(o => ({
      ...o,
      id: o.id_onus,
      tipo: 'ONU',
      codigo: o.codigo,
      no_serie: o.no_serie,
      nombre_completo: o.cliente ? o.cliente.nombre_completo : 'Sin cliente asociado',
      id_cliente: o.id_cliente
    }));
    res.json(normalizados);
  } catch (error) {
    console.error("--- ERROR EN ONUS ---", error);
    res.status(500).json({ error: 'Error al obtener las ONUs', detalle: error.message });
  }
};

const crearOnu = async (req, res) => {
  try {
    const { codigo, no_serie, id_cliente } = req.body;
    const nuevaOnu = await prisma.oNUS.create({
      data: {
        codigo,
        no_serie,
        id_cliente: id_cliente ? Number(id_cliente) : null
      }
    });
    res.status(201).json({ mensaje: 'ONU creada exitosamente', onu: nuevaOnu });
  } catch (error) {
    console.error("Error al crear ONU:", error);
    res.status(500).json({ error: 'Error al crear la ONU', detalle: error.message });
  }
};

const actualizarOnu = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo, no_serie, id_cliente } = req.body;
    
    const onuActualizada = await prisma.oNUS.update({
      where: { id_onus: Number(id) },
      data: {
        codigo,
        no_serie,
        id_cliente: id_cliente ? Number(id_cliente) : null
      }
    });
    
    res.json({ mensaje: 'ONU actualizada exitosamente', onu: onuActualizada });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la ONU', detalle: error.message });
  }
};

const eliminarOnu = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.oNUS.delete({ where: { id_onus: Number(id) } });
    res.json({ mensaje: 'ONU eliminada exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la ONU', detalle: error.message });
  }
};

// ==================== BÚSQUEDA UNIFICADA ====================
const buscarDispositivo = async (req, res) => {
  try {
    const { codigo } = req.query;

    if (!codigo || codigo.trim() === "") {
      return res.status(400).json({ error: "Debes enviar un código para buscar" });
    }

    const [postes, naps, clientes] = await Promise.all([
      prisma.postes.findMany({
        where: { codigo: { contains: codigo, mode: "insensitive" } }
      }),
      prisma.nAP.findMany({
        where: { codigo_nap: { contains: codigo, mode: "insensitive" } }
      }),
      prisma.clientes.findMany({
        where: { 
          OR: [
            { cliente_ref: { contains: codigo, mode: "insensitive" } },
            { nombre_completo: { contains: codigo, mode: "insensitive" } }
          ]
        }
      })
    ]);

    const resultados = [
      ...postes.map((p) => ({ tipo: "POSTE", id: p.poste_id, codigo: p.codigo, latitud: p.latitud, longitud: p.longitud })),
      ...naps.map((n) => ({ tipo: "NAP", id: n.id_nap, codigo: n.codigo_nap, latitud: n.latitud, longitud: n.longitud })),
      ...clientes.map((c) => ({ tipo: "CLIENTE", id: c.id_cliente, codigo: c.cliente_ref || c.nombre_completo, latitud: c.latitud, longitud: c.longitud }))
    ];

    res.json(resultados);
  } catch (error) {
    res.status(500).json({ error: "Error al buscar equipo", detalle: error.message });
  }
};

// ==================== DISPOSITIVOS PARA EL MAPA ====================
const obtenerDispositivosMapa = async (req, res) => {
  try {
    const [postes, naps, clientes] = await Promise.all([
      prisma.postes.findMany(),
      prisma.nAP.findMany(),
      prisma.clientes.findMany({ include: { nap: true } })
    ]);

    const dispositivosUnificados = [
      ...postes.map(p => {
        const napsDelPoste = naps.filter(n => Number(n.poste_id) === Number(p.poste_id));
        const napAsociadaStr = napsDelPoste.length > 0 
          ? napsDelPoste.map(n => n.codigo_nap).join(', ') 
          : 'Sin NAP asociada';

        return {
          id: p.poste_id,
          tipo: 'POSTE',
          codigo: p.codigo,
          localidad: p.localidad || '',
          barrio: p.barrio || '',
          siglas: p.siglas || '',
          latitud: parseFloat(p.latitud),
          longitud: parseFloat(p.longitud),
          fecha_instalacion: p.fecha_instalacion,
          estado: p.estado || 'Activo', // 👈 INCLUIDO AQUÍ
          nap_asociada: napAsociadaStr,
          caja_nap: napAsociadaStr,
          nombre_nap: napAsociadaStr
        };
      }),
      ...naps.map(n => ({
        id: n.id_nap,
        tipo: 'NAP',
        codigo: n.codigo_nap,
        localidad: n.localidad || '',
        barrio: n.barrio || '',
        siglas: n.siglas || '',
        no_serie: n.no_serie,
        potencia: n.potencia ? parseFloat(n.potencia) : null,
        latitud: parseFloat(n.latitud),
        longitud: parseFloat(n.longitud),
        capacidad_puertos: n.capacidad_puertos,
        puertos_usados: n.puertos_usados,
        estado: n.estado || 'Activo', // 👈 INCLUIDO AQUÍ (Esto faltaba para la NAP-11)
        poste_asociado: n.poste ? n.poste.codigo : 'Sin poste asociado'
      })),
      ...clientes.map(c => {
        const nombreNapVal = c.nap ? c.nap.codigo_nap : 'Sin NAP asociada';
        const puertoVal = c.puerto_asignado !== null && c.puerto_asignado !== undefined ? c.puerto_asignado : null;

        return {
          id: c.id_cliente,
          tipo: 'CLIENTE',
          codigo: c.cliente_ref || c.nombre_completo,
          localidad: c.localidad || '',
          barrio: c.barrio || '',
          siglas: c.siglas || '',
          nombre_completo: c.nombre_completo,
          cliente_ref: c.cliente_ref,
          latitud: parseFloat(c.latitud),
          longitud: parseFloat(c.longitud),
          distancia_nap: c.distancia_nap ? parseFloat(c.distancia_nap) : null,
          estado: c.estado || 'Activo', // 👈 INCLUIDO AQUÍ
          nombre_nap: nombreNapVal,
          caja_nap: nombreNapVal,
          nap_asociada: nombreNapVal,        
          puerto: puertoVal,
          puerto_ocupado: puertoVal,
          puertoNap: puertoVal
        };
      })
    ];

    res.json(dispositivosUnificados);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los dispositivos del mapa', detalle: error.message });
  }
};

// ==================== REPORTES ====================
const obtenerReportes = async (req, res) => {
  try {
    const reportes = await prisma.reportes.findMany({
      include: {
        cliente: {
          include: {
            nap: {
              include: {
                poste: true
              }
            }
          }
        },
        nap: {
          include: {
            poste: true,
            // si tienes una relación directa o inversa de puertos/naps
          }
        },
        poste: {
          include: {
            naps: true // Si un poste tiene cajas NAP asociadas
          }
        }
      },
      orderBy: { fecha_reporte: 'desc' }
    });
    res.json(reportes);
  } catch (error) {
    console.error("Error al obtener reportes:", error);
    res.status(500).json({ error: 'Error al obtener los reportes', detalle: error.message });
  }
};

const crearReporte = async (req, res) => {
  try {
    const { 
      tipo_elemento, 
      id_elemento, 
      falla_presentada, 
      prioridad, 
      descripcion, 
      tecnico_asignado 
    } = req.body;
    
    if (!descripcion) {
      return res.status(400).json({ error: 'La descripción del reporte es obligatoria' });
    }

    let id_cliente = null;
    let id_onus = null;
    let id_nap = null;
    let id_poste = null;

    const idNum = id_elemento ? Number(id_elemento) : null;
    const tipoLower = tipo_elemento ? tipo_elemento.toLowerCase() : '';

    if (tipoLower === 'cliente' || tipoLower === 'modem / cliente') {
      id_cliente = idNum;
    } else if (tipoLower === 'onu') {
      id_onus = idNum;
    } else if (tipoLower === 'nap') {
      id_nap = idNum;
    } else if (tipoLower === 'poste') {
      id_poste = idNum;
    }

    const nuevoReporte = await prisma.reportes.create({
      data: {
        tipo_elemento: tipo_elemento || 'General',
        id_cliente,
        id_onus,
        id_nap,
        id_poste,
        falla_presentada: falla_presentada || 'Sin especificar',
        prioridad: prioridad || 'Normal',
        descripcion,
        tecnico_asignado: tecnico_asignado || null,
        estatus: true
      },
      include: {
        cliente: true,
        onu: true,
        nap: true,
        poste: true
      }
    });
    
    res.status(201).json({ mensaje: 'Reporte creado exitosamente', reporte: nuevoReporte });
  } catch (error) {
    console.error("Error al crear reporte:", error);
    res.status(500).json({ error: 'Error al crear el reporte', detalle: error.message });
  }
};

const actualizarEstatusReporte = async (req, res) => {
  try {
    const { id } = req.params;
    const { estatus, comentarios_solucion, evidencia_foto, falla_presentada, prioridad, descripcion, tecnico_asignado } = req.body;
    
    const fecha_resolucion = estatus === false ? new Date() : null;

    const reporteActualizado = await prisma.reportes.update({
      where: { id_reporte: Number(id) },
      data: {
        ...(estatus !== undefined && { estatus }),
        ...(comentarios_solucion !== undefined && { comentarios_solucion: comentarios_solucion || null }),
        ...(evidencia_foto !== undefined && { evidencia_foto: evidencia_foto || null }),
        ...(falla_presentada !== undefined && { falla_presentada }),
        ...(prioridad !== undefined && { prioridad }),
        ...(descripcion !== undefined && { descripcion }),
        ...(tecnico_asignado !== undefined && { tecnico_asignado: tecnico_asignado || null }),
        fecha_resolucion
      },
      include: {
        cliente: true,
        onu: true,
        nap: true,
        poste: true
      }
    });

    res.json({ mensaje: 'Reporte actualizado exitosamente', reporte: reporteActualizado });
  } catch (error) {
    console.error("Error al actualizar reporte:", error);
    res.status(500).json({ error: 'Error al actualizar el reporte', detalle: error.message });
  }
};
const eliminarReporte = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.reportes.delete({ where: { id_reporte: Number(id) } });
    res.json({ mensaje: 'Reporte eliminado exitosamente' });
  } catch (error) {
    console.error("Error al eliminar el reporte:", error);
    res.status(500).json({ error: 'Error al eliminar el reporte', detalle: error.message });
  }
};

const obtenerTareasUrgentesHoy = async (req, res) => {
  try {
    const hoyInicio = new Date();
    hoyInicio.setHours(0, 0, 0, 0);

    const hoyFin = new Date();
    hoyFin.setHours(23, 59, 59, 999);

    const tareasUrgentes = await prisma.reportes.findMany({
      where: {
        estatus: true, // Tareas activas/pendientes
        prioridad: { in: ['Urgente', 'URGENTE', 'Alta', 'ALTA'] },
        fecha_reporte: {
          gte: hoyInicio,
          lte: hoyFin
        }
      },
      include: {
        cliente: true,
        nap: true,
        poste: true
      }
    });

    res.json(tareasUrgentes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tareas urgentes', detalle: error.message });
  }
};



module.exports = {
  obtenerPostes,
  crearPoste,
  actualizarPoste,
  eliminarPoste,
  obtenerNaps,
  crearNap,
  actualizarNap,
  eliminarNap,
  obtenerClientes,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  obtenerOnus,
  crearOnu,
  actualizarOnu,
  eliminarOnu,
  buscarDispositivo,
  obtenerDispositivosMapa,
  actualizarEstatusReporte,
  crearReporte,
  obtenerReportes,
  eliminarReporte,
  obtenerTareasUrgentesHoy
};
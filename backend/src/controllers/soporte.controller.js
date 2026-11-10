
const prisma = require("../config/db");

// ==================== CLIENTES ====================
const obtenerClientes = async (req, res) => {
  try {
    const clientes = await prisma.clientes.findMany({ include: { reportes: true } });
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los clientes', detalle: error.message });
  }
};

const crearCliente = async (req, res) => {
  try {
    const { nombre_completo, apellido_paterno, apellido_materno, contacto, estatus } = req.body;
    const nuevoCliente = await prisma.clientes.create({
      data: {
        nombre_completo,
        apellido_paterno,
        apellido_materno,
        contacto,
        estatus: estatus !== undefined ? estatus : true
      }
    });
    res.status(201).json({ mensaje: 'Cliente registrado exitosamente', cliente: nuevoCliente });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar el cliente', detalle: error.message });
  }
};

// ==================== REPORTES ====================
const obtenerReportes = async (req, res) => {
  try {
    const reportes = await prisma.reportes.findMany({ 
      include: { 
        cliente: true, 
        onu: true 
      } 
    });
    res.json(reportes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los reportes', detalle: error.message });
  }
};

const crearReporte = async (req, res) => {
  try {
    const { id_onus, id_cliente, falla_presentada, descripcion } = req.body;
    const nuevoReporte = await prisma.reportes.create({
      data: {
        id_onus: Number(id_onus),
        id_cliente: Number(id_cliente),
        falla_presentada,
        descripcion,
        estatus: true
      }
    });
    res.status(201).json({ mensaje: 'Reporte de falla creado exitosamente', reporte: nuevoReporte });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear el reporte', detalle: error.message });
  }
};

const resolverReporte = async (req, res) => {
  try {
    const { id } = req.params;
    const reporteActualizado = await prisma.reportes.update({
      where: { id_reporte: Number(id) },
      data: {
        estatus: false,
        fecha_resolucion: new Date()
      }
    });
    res.json({ mensaje: 'Reporte marcado como resuelto', reporte: reporteActualizado });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el reporte', detalle: error.message });
  }
};

module.exports = {
  obtenerClientes,
  crearCliente,
  obtenerReportes,
  crearReporte,
  resolverReporte
};
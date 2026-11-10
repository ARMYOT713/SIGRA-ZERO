const prisma = require('../config/db');

const obtenerResumen = async (req, res) => {
  try {
    const [totalPostes, totalNAPs, totalONUs, totalClientes, reportesActivos] = await Promise.all([
      prisma.postes.count(),
      prisma.nAP.count(),
      prisma.oNUS.count(),
      prisma.clientes.count({ where: { estatus: true } }),
      prisma.reportes.count({ where: { estatus: true } })
    ]);

    return res.status(200).json({
      totalPostes,
      totalNAPs,
      totalONUs,
      totalClientes,
      reportesActivos
    });
  } catch (error) {
    console.error("Error al obtener resumen:", error);
    return res.status(500).json({ message: "Error interno al obtener métricas" });
  }
};

module.exports = { obtenerResumen };
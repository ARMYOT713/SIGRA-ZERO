const prisma = require('../config/db');
const { calcularDistanciaHaversine } = require('../utils/haversine');

const crearOnu = async (req, res) => {
  try {
    const { codigo, id_nap, nombre_completo, cliente_ref, no_serie, potencia, latitud, longitud, fecha_instalacion } = req.body;

    let distanciaCalculada = null;

    // Si la ONU está vinculada a una NAP, calculamos la distancia geométrica automáticamente
    if (id_nap) {
      const napAsociada = await prisma.nAP.findUnique({
        where: { id_nap: Number(id_nap) }
      });

      if (napAsociada && latitud && longitud) {
        distanciaCalculada = calcularDistanciaHaversine(
          Number(napAsociada.latitud),
          Number(napAsociada.longitud),
          Number(latitud),
          Number(longitud)
        );
      }
    }

    const nuevaOnu = await prisma.oNUS.create({
      data: {
        codigo,
        id_nap: id_nap ? Number(id_nap) : null,
        nombre_completo,
        cliente_ref,
        no_serie,
        potencia: potencia ? Number(potencia) : null,
        latitud: Number(latitud),
        longitud: Number(longitud),
        fecha_instalacion: new Date(fecha_instalacion),
        distancia_nap: distanciaCalculada
      }
    });

    res.status(201).json({ mensaje: 'ONU creada exitosamente', onu: nuevaOnu });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear la ONU', detalle: error.message });
  }
};

module.exports = { crearOnu };
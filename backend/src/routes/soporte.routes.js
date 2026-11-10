const { Router } = require('express');
const { 
  obtenerClientes, crearCliente, 
  obtenerReportes, crearReporte, resolverReporte 
} = require('../controllers/soporte.controller');
const { verificarToken, autorizarRoles } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verificarToken);

// Rutas de Clientes
router.get('/clientes', obtenerClientes);
router.post('/clientes', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), crearCliente);

// Rutas de Reportes
router.get('/reportes', obtenerReportes);
router.post('/reportes', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), crearReporte);
router.patch('/reportes/:id/resolver', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), resolverReporte);

module.exports = router;
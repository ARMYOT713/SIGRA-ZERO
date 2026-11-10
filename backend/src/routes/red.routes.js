const { Router } = require('express');
const { verificarToken, autorizarRoles } = require('../middlewares/auth.middleware');
const redController = require('../controllers/red.controller');

const router = Router();

router.use(verificarToken);

// ==================== MAPA Y BÚSQUEDA ====================
router.get('/mapa-dispositivos', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.obtenerDispositivosMapa);
router.get('/buscar', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.buscarDispositivo);

// ==================== POSTES ====================
router.get('/postes', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.obtenerPostes);
router.post('/postes', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.crearPoste);
router.put('/postes/:id', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.actualizarPoste);
router.delete('/postes/:id', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.eliminarPoste);

// ==================== NAPS ====================
router.get('/naps', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.obtenerNaps);
router.post('/naps', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.crearNap);
router.put('/naps/:id', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.actualizarNap);
router.delete('/naps/:id', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.eliminarNap);

// ==================== CLIENTES ====================
router.get('/clientes', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.obtenerClientes);
router.post('/clientes', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.crearCliente);
router.put('/clientes/:id', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.actualizarCliente);
router.delete('/clientes/:id', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.eliminarCliente);

// ==================== ONUS ====================
router.get('/onus', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.obtenerOnus);
router.post('/onus', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.crearOnu);
router.put('/onus/:id', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.actualizarOnu);
router.delete('/onus/:id', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.eliminarOnu);

// ==================== REPORTES (NUEVOS) ====================
router.get('/reportes', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.obtenerReportes);
router.post('/reportes', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.crearReporte);
router.patch('/reportes/:id/estatus', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.actualizarEstatusReporte);
router.delete('/reportes/:id', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.eliminarReporte);
router.put('/reportes/:id', autorizarRoles('ADMINISTRADOR', 'SOPORTE_TECNICO'), redController.actualizarEstatusReporte);

module.exports = router;
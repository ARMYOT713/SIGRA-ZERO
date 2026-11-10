const { Router } = require('express');
const { obtenerResumen } = require('../controllers/resumen.controller.js');

const router = Router();
router.get('/', obtenerResumen);

module.exports = router;
const { Router } = require('express');
const authRoutes = require('./auth.routes');
const redRoutes = require('./red.routes');
const soporteRoutes = require('./soporte.routes');
const resumenRoutes = require('./resumenRoutes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/red', redRoutes);
router.use('/soporte', soporteRoutes);
router.use('/resumen', resumenRoutes);

module.exports = router;


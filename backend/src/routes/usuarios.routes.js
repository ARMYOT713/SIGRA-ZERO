const { Router } = require('express');
const { verificarToken, autorizarRoles } = require('../middlewares/auth.middleware');
const { 
  obtenerUsuarios, 
  crearUsuario, 
  actualizarUsuario,
  eliminarUsuario 
} = require('../controllers/usuarios.controller');

const router = Router();

router.get('/', verificarToken, autorizarRoles('ADMINISTRADOR'), obtenerUsuarios);
router.post('/', verificarToken, autorizarRoles('ADMINISTRADOR'), crearUsuario);
router.delete('/:id', verificarToken, autorizarRoles('ADMINISTRADOR'), eliminarUsuario);
router.put('/:id', verificarToken, autorizarRoles('ADMINISTRADOR'), actualizarUsuario);

module.exports = router;
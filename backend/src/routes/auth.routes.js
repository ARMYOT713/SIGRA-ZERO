const express = require("express");
const router = express.Router();
const { login, registrar, forgotPassword, resetPassword } = require("../controllers/auth.controller");
const { verificarToken, autorizarRoles } = require("../middlewares/auth.middleware");

router.post("/login", login);
router.post("/registrar", verificarToken, autorizarRoles("ADMINISTRADOR"), registrar);
router.post("/forgot-password", forgotPassword);

// Nueva ruta para aplicar el cambio de contraseña:
router.post("/reset-password", resetPassword);

module.exports = router;
const express = require("express");
const router = express.Router();
const {
  setupStatus,
  setupAdmin,
  login,
  registrar,
  forgotPassword,
  verifyResetToken,
  resetPassword
} = require("../controllers/auth.controller");
const { verificarToken, autorizarRoles } = require("../middlewares/auth.middleware");

// Rutas para inicialización del primer Administrador cuando la BD está en blanco
router.get("/setup-status", setupStatus);
router.post("/setup-admin", setupAdmin);

// Rutas de autenticación y recuperación
router.post("/login", login);
router.post("/registrar", verificarToken, autorizarRoles("ADMINISTRADOR"), registrar);
router.post("/forgot-password", forgotPassword);
router.get("/verify-reset-token", verifyResetToken);
router.post("/reset-password", resetPassword);

module.exports = router;
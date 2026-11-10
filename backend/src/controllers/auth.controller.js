const prisma = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const { sendEmail } = require('../services/email.service');

// POST /api/auth/login
async function login(req, res) {
  try {
    const { id_usuario, password } = req.body;

    if (!id_usuario || !password) {
      return res.status(400).json({ error: "id_usuario y password son requeridos" });
    }

    const usuario = await prisma.usuarios.findUnique({
      where: { id_usuario: Number(id_usuario) },
    });

    if (!usuario) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = jwt.sign(
      { id: usuario.id_usuario, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre_completo: usuario.nombre_completo,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
}

// POST /api/auth/registrar (solo ADMINISTRADOR puede crear usuarios)
async function registrar(req, res) {
  try {
    const { nombre_completo, password, rol } = req.body;

    if (!nombre_completo || !password) {
      return res.status(400).json({ error: "nombre_completo y password son requeridos" });
    }

    const passwordHasheada = await bcrypt.hash(password, 10);

    const nuevoUsuario = await prisma.usuarios.create({
      data: {
        nombre_completo,
        password: passwordHasheada,
        rol: rol || "SOPORTE_TECNICO",
      },
    });

    res.status(201).json({
      id_usuario: nuevoUsuario.id_usuario,
      nombre_completo: nuevoUsuario.nombre_completo,
      rol: nuevoUsuario.rol,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
  try {
    const correo = req.body.correo || req.body.email;

    if (!correo) {
      return res.status(400).json({ error: "El correo electrónico es requerido" });
    }

    const usuario = await prisma.usuarios.findUnique({
      where: { correo },
    });

    if (!usuario) {
      return res.json({ message: "Si el correo existe en el sistema, se enviarán las instrucciones de recuperación." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.usuarios.update({
      where: { id_usuario: usuario.id_usuario },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: tokenExpires,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <h2 style="color: #0f172a; text-align: center;">Solicitud de Recuperación de Acceso</h2>
        <p>Hola, <strong>${usuario.nombre_completo}</strong>:</p>
        <p>Has solicitado restablecer tu contraseña en <strong>SIGRA</strong>. Haz clic en el siguiente botón para continuar:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Restablecer Contraseña</a>
        </div>
        <p style="font-size: 13px; color: #64748b;">Este enlace es seguro y expirará en exactamente 15 minutos.</p>
        <p style="font-size: 13px; color: #64748b;">Si tú no solicitaste este cambio, puedes ignorar este mensaje de forma segura.</p>
      </div>
    `;

    await sendEmail({
      to: correo,
      subject: 'Recuperación de Contraseña - SIGRA',
      html: htmlContent,
    });

    res.json({ message: "Si el correo existe en el sistema, se enviarán las instrucciones de recuperación." });
  } catch (error) {
    console.error("Error crítico en forgotPassword:", error);
    res.status(500).json({ error: "Error interno al procesar la solicitud de recuperación" });
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res) {
  try {
    const { token, nuevaPassword } = req.body;

    if (!token || !nuevaPassword) {
      return res.status(400).json({ error: "El token y la nueva contraseña son requeridos" });
    }

    const usuario = await prisma.usuarios.findFirst({
      where: { resetPasswordToken: token },
    });

    if (!usuario || !usuario.resetPasswordExpires) {
      return res.status(400).json({ error: "El enlace de recuperación es inválido o ha expirado." });
    }

    if (new Date() > new Date(usuario.resetPasswordExpires)) {
      return res.status(400).json({ error: "El enlace de recuperación ha expirado. Por favor solicita uno nuevo." });
    }

    const passwordHasheada = await bcrypt.hash(nuevaPassword, 10);

    await prisma.usuarios.update({
      where: { id_usuario: usuario.id_usuario },
      data: {
        password: passwordHasheada,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    // Generamos el Token JWT de sesión de forma automática para evitar que tenga que loguearse de nuevo
    const newToken = jwt.sign(
      { id: usuario.id_usuario, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ 
      message: "¡Contraseña actualizada exitosamente!",
      token: newToken,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre_completo: usuario.nombre_completo,
        rol: usuario.rol,
      }
    });
  } catch (error) {
    console.error("Error en resetPassword:", error);
    res.status(500).json({ error: "Error interno al restablecer la contraseña" });
  }
}

module.exports = {
  login,
  registrar,
  forgotPassword,
  resetPassword,
};
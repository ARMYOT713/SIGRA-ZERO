const prisma = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendEmail } = require("../services/email.service");

// GET /api/auth/setup-status (Verifica si la BD tiene 0 usuarios para mostrar el registro inicial)
async function setupStatus(req, res) {
  try {
    const totalUsuarios = await prisma.usuarios.count();
    res.json({
      requiereSetup: totalUsuarios === 0,
      totalUsuarios
    });
  } catch (error) {
    console.error("Error en setupStatus:", error);
    res.status(500).json({ error: "Error al verificar estado inicial del sistema" });
  }
}

// POST /api/auth/setup-admin (Solo funciona cuando hay 0 usuarios en la BD)
async function setupAdmin(req, res) {
  try {
    const totalUsuarios = await prisma.usuarios.count();
    if (totalUsuarios > 0) {
      return res.status(403).json({
        error: "El sistema ya cuenta con usuarios registrados. Usa el panel de Administrador."
      });
    }

    const { id_usuario, nombre_completo, correo, telefono, password } = req.body;

    if (!nombre_completo || !password) {
      return res.status(400).json({ error: "Nombre completo y contraseña son obligatorios." });
    }

    const idInicial = id_usuario && !isNaN(Number(id_usuario)) && Number(id_usuario) > 0
      ? Number(id_usuario)
      : 1;

    const passwordHasheada = await bcrypt.hash(password, 10);

    const adminCreado = await prisma.usuarios.create({
      data: {
        id_usuario: idInicial,
        nombre_completo: nombre_completo.trim(),
        correo: correo && correo.trim() !== "" ? correo.trim().toLowerCase() : null,
        telefono: telefono && telefono.trim() !== "" ? telefono.trim() : null,
        password: passwordHasheada,
        rol: "ADMINISTRADOR"
      }
    });

    res.status(201).json({
      mensaje: "Administrador principal creado con éxito.",
      usuario: {
        id_usuario: adminCreado.id_usuario,
        nombre_completo: adminCreado.nombre_completo,
        correo: adminCreado.correo,
        rol: adminCreado.rol
      }
    });
  } catch (error) {
    console.error("Error en setupAdmin:", error);
    res.status(500).json({ error: "No se pudo registrar el Administrador inicial." });
  }
}

// POST /api/auth/login (Acepta ID de usuario o Correo Electrónico)
async function login(req, res) {
  try {
    const { id_usuario, password } = req.body;

    if (!id_usuario || !password) {
      return res.status(400).json({ error: "ID de usuario o correo y contraseña son requeridos" });
    }

    const identificadorLimpio = String(id_usuario).trim();
    const esCorreo = identificadorLimpio.includes("@");

    let usuario;

    if (esCorreo) {
      usuario = await prisma.usuarios.findFirst({
        where: {
          correo: {
            equals: identificadorLimpio,
            mode: "insensitive",
          },
        },
      });
    } else {
      const idNumerico = Number(identificadorLimpio);
      if (isNaN(idNumerico)) {
        return res.status(401).json({ error: "ID de usuario o correo electrónico inválidos" });
      }
      usuario = await prisma.usuarios.findUnique({
        where: { id_usuario: idNumerico },
      });
    }

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
        correo: usuario.correo,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
}

// POST /api/auth/registrar (solo ADMINISTRADOR puede crear usuarios)
async function registrar(req, res) {
  try {
    const { id_usuario, nombre_completo, correo, password, rol, telefono } = req.body;

    if (!nombre_completo || !password) {
      return res.status(400).json({ error: "nombre_completo y password son requeridos" });
    }

    const passwordHasheada = await bcrypt.hash(password, 10);

    const nuevoUsuario = await prisma.usuarios.create({
      data: {
        ...(id_usuario ? { id_usuario: Number(id_usuario) } : {}),
        nombre_completo: nombre_completo.trim(),
        correo: correo && correo.trim() !== "" ? correo.trim().toLowerCase() : null,
        telefono: telefono && telefono.trim() !== "" ? telefono.trim() : null,
        password: passwordHasheada,
        rol: rol || "SOPORTE_TECNICO",
      },
    });

    res.status(201).json({
      id_usuario: nuevoUsuario.id_usuario,
      nombre_completo: nuevoUsuario.nombre_completo,
      correo: nuevoUsuario.correo,
      rol: nuevoUsuario.rol,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
}

// POST /api/auth/forgot-password (Soporta Correo o ID y respaldo automático si Render bloquea SMTP)
async function forgotPassword(req, res) {
  try {
    const identificadorRaw = req.body.correo || req.body.email || req.body.id_usuario;

    if (!identificadorRaw) {
      return res.status(400).json({ error: "Ingresa tu correo electrónico o tu ID de usuario." });
    }

    const identificador = String(identificadorRaw).trim();
    const esCorreo = identificador.includes("@");

    let usuario = null;
    if (esCorreo) {
      usuario = await prisma.usuarios.findFirst({
        where: {
          correo: {
            equals: identificador.toLowerCase(),
            mode: "insensitive",
          },
        },
      });
    } else if (!isNaN(Number(identificador))) {
      usuario = await prisma.usuarios.findUnique({
        where: { id_usuario: Number(identificador) },
      });
    }

    if (!usuario) {
      return res.status(404).json({
        error: "No se encontró ningún usuario registrado con ese correo o ID."
      });
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

    const frontendUrl = process.env.FRONTEND_URL || "https://sigra-zero.vercel.app";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-top: 4px solid #16a34a; border-radius: 8px;">
        <h2 style="color: #0f172a; text-align: center; margin-top: 0;">Recuperación de Contraseña - SIGRA</h2>
        <p>Hola, <strong>${usuario.nombre_completo}</strong> (ID: <strong>${usuario.id_usuario}</strong>):</p>
        <p>Se ha generado una solicitud para restablecer tu contraseña en <strong>SIGRA</strong>. Haz clic en el siguiente botón para crear una nueva contraseña:</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetLink}" style="background-color: #16a34a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Restablecer Contraseña</a>
        </div>
        <p style="font-size: 13px; color: #64748b;">Este enlace es válido durante 15 minutos.</p>
      </div>
    `;

    let correoEnviado = false;
    if (usuario.correo) {
      try {
        await sendEmail({
          to: usuario.correo,
          subject: "Recuperación de Contraseña - SIGRA",
          html: htmlContent,
        });
        correoEnviado = true;
      } catch (smtpError) {
        console.warn("Aviso: SMTP bloqueado o no disponible en Render, activando enlace directo de respaldo:", smtpError.message);
      }
    }

    res.json({
      correoEnviado,
      token: resetToken,
      resetUrl: resetLink,
      message: correoEnviado
        ? "Enlace enviado a tu correo electrónico."
        : "Token de seguridad verificado. Haz clic abajo para restablecer tu contraseña."
    });
  } catch (error) {
    console.error("Error en forgotPassword:", error);
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
      return res.status(400).json({ error: "El enlace de recuperación ha expirado. Solicita uno nuevo." });
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

    const newToken = jwt.sign(
      { id: usuario.id_usuario, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ 
      message: "Contraseña actualizada con éxito.",
      token: newToken,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre_completo: usuario.nombre_completo,
        correo: usuario.correo,
        rol: usuario.rol,
      }
    });
  } catch (error) {
    console.error("Error en resetPassword:", error);
    res.status(500).json({ error: "Error interno al restablecer la contraseña" });
  }
}

module.exports = {
  setupStatus,
  setupAdmin,
  login,
  registrar,
  forgotPassword,
  resetPassword,
};
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

// POST /api/auth/forgot-password (Envío 100% por correo mediante API HTTPS de Brevo)
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

    if (!usuario || !usuario.correo) {
      return res.status(404).json({
        error: "No se encontró ningún usuario con correo electrónico registrado para esa cuenta."
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
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; max-width: 580px; margin: 0 auto; padding: 32px 28px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 22px;">
          <img src="${frontendUrl}/logo.png" alt="Winfored Logo" style="height: 36px; vertical-align: middle;" />
          <span style="display: inline-block; width: 1px; height: 26px; background-color: #cbd5e1; margin: 0 14px; vertical-align: middle;"></span>
          <span style="font-size: 24px; font-weight: 600; letter-spacing: 2px; color: #0f172a; vertical-align: middle;">SIGRA</span>
        </div>

        <h2 style="color: #0f172a; text-align: center; font-size: 20px; margin: 0 0 20px 0;">Solicitud de Recuperación de Acceso</h2>

        <p style="font-size: 14px; color: #334155; margin: 0 0 14px 0;">Hola, <strong>${usuario.nombre_completo}</strong>:</p>

        <p style="font-size: 14px; color: #334155; line-height: 1.5; margin: 0 0 26px 0;">
          Has solicitado restablecer tu contraseña en <strong>SIGRA</strong>. Haz clic en el siguiente botón para continuar:
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetLink}" style="background-color: #dc2626; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block;">Restablecer Contraseña</a>
        </div>

        <p style="font-size: 13px; color: #64748b; margin: 24px 0 10px 0;">
          Este enlace es seguro y expirará en exactamente 15 minutos.
        </p>

        <p style="font-size: 13px; color: #64748b; margin: 0;">
          Si tú no solicitaste este cambio, puedes ignorar este mensaje de forma segura.
        </p>
      </div>
    `;

    // Envío directo con Brevo
    await sendEmail({
      to: usuario.correo,
      subject: "Recuperación de Contraseña - SIGRA",
      html: htmlContent,
    });

    res.json({
      correoEnviado: true,
      message: "Enlace enviado a tu correo electrónico."
    });
  } catch (error) {
    console.error("Error en forgotPassword:", error);
    res.status(500).json({
      error: error.message || "Error interno al enviar el correo de recuperación."
    });
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
// POST /api/auth/forgot-password (Envío 100% por correo mediante API HTTPS de Brevo)
async function forgotPassword(req, res) {
  try {
    const identificadorRaw = req.body.correo || req.body.email || req.body.id_usuario;

    if (!identificadorRaw) {
      return res.status(400).json({ error: "Ingresa tu correo electrónico." });
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
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-top: 4px solid #dc2626; border-radius: 8px;">
        <h2 style="color: #0f172a; text-align: center; margin-top: 0;">Recuperación de Contraseña - SIGRA</h2>
        <p>Hola somos Soporte SIGRA, <strong>${usuario.nombre_completo}</strong>:</p>
        <p>Has solicitado restablecer tu contraseña en <strong>SIGRA</strong>. Haz clic en el siguiente botón para crear una nueva contraseña:</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetLink}" style="background-color: #dc2626; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Restablecer Contraseña</a>
        </div>
        <p style="font-size: 13px; color: #64748b;">Este enlace es personal y expirará en 15 minutos.</p>
      </div>
    `;

    await sendEmail({
      to: usuario.correo,
      subject: "Recuperación de Contraseña - SOPORTE SIGRA",
      html: htmlContent,
    });

    res.json({
      correoEnviado: true,
      message: "Se ha enviado el enlace de recuperación a tu correo electrónico."
    });
  } catch (error) {
    console.error("Error al enviar correo en forgotPassword:", error);
    res.status(500).json({
      error: error.message || "Error al enviar el correo de recuperación."
    });
  }
}
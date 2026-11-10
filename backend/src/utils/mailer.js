const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // O el proveedor SMTP que elijas
  auth: {
    user: process.env.EMAIL_USER, // Tu correo
    pass: process.env.EMAIL_PASS, // Tu contraseña de aplicación (App Password)
  },
});

const sendResetEmail = async (toEmail, resetLink) => {
  const mailOptions = {
    from: `"Soporte SIGRA" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Recuperación de contraseña - SIGRA',
    html: `
      <h2>Solicitud de restablecimiento de contraseña</h2>
      <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para continuar:</p>
      <a href="${resetLink}" style="background: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a>
      <p>Este enlace expirará en 15 minutos.</p>
      <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

module.exports = { sendResetEmail };
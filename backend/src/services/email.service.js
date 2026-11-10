const nodemailer = require('nodemailer');

// Configuramos el transporte leyendo las variables del entorno del sistema
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true para 465, false para otros puertos
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Servicio genérico y reutilizable para enviar correos en la plataforma
 * @param {Object} options - { to, subject, html }
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Soporte SIGRA'}" <${process.env.SMTP_FROM_EMAIL}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Correo enviado exitosamente:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error al enviar el correo a través del servicio:', error);
    throw new Error('No se pudo enviar el correo electrónico.');
  }
};

module.exports = { sendEmail };
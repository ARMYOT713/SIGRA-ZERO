async function sendEmail({ to, subject, html }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;

  if (!BREVO_API_KEY || !SENDER_EMAIL) {
    throw new Error("Falta configurar BREVO_API_KEY o BREVO_SENDER_EMAIL en Render.");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: {
        name: "SIGRA - WinfoRed",
        email: SENDER_EMAIL,
      },
      to: [{ email: to }],
      subject: subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Error al enviar el correo con Brevo.");
  }

  return await response.json();
}

// Exporta tanto por defecto como con propiedad nombrada { sendEmail }
sendEmail.sendEmail = sendEmail;
module.exports = sendEmail;
async function sendEmail({ to, subject, html }) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;

  if (!BREVO_API_KEY) {
    throw new Error("Falta configurar la variable de entorno BREVO_API_KEY en el servidor de Render.");
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: { 
        name: "SIGRA - Red Winfored", 
        email: "no-reply@sigrawinfored.com" 
      },
      to: [{ email: to }],
      subject: subject,
      htmlContent: html
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Error al enviar el correo mediante la API de Brevo.');
  }

  return await response.json();
}

module.exports = { sendEmail };
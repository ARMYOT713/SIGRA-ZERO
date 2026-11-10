const express = require('express');
const router = express.Router();
const crypto = require('crypto'); // Viene integrado en Node.js, no requiere npm install
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { sendResetEmail } = require('../utils/mailer');

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    // 1. Verificar si existe el usuario
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Por seguridad, si no existe el correo, respondemos lo mismo para no darle pistas a un atacante
    if (!user) {
      return res.json({ message: 'Si el correo existe, se enviará un enlace de recuperación.' });
    }

    // 2. Generar token aleatorio (cadena hex de 64 caracteres)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // 3. Crear fecha de expiración (Hora actual + 15 minutos)
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000);

    // 4. Guardar token y expiración en la base de datos con Prisma
    await prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: tokenExpires,
      },
    });

    // 5. Construir enlace de recuperación y enviar correo
    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;
    await sendResetEmail(email, resetLink);

    res.json({ message: 'Si el correo existe, se enviará un enlace de recuperación.' });

  } catch (error) {
    console.error('Error en forgot-password:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
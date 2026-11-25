const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const routes = require('./routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const app = express();

// Permite que rate-limit identifique la IP real detrás del proxy de Render
app.set('trust proxy', 1);

// 1. Cabeceras de seguridad HTTP (oculta X-Powered-By, agrega nosniff y CSP completo)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
    },
  })
);

// 2. CORS restringido únicamente a los orígenes autorizados de SIGRA
const origenesPermitidos = [
  'https://sigra-zero.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origenesPermitidos.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  })
);

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 3. Protección contra fuerza bruta en el inicio de sesión (máx. 5 intentos fallidos cada 15 min)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos fallidos de inicio de sesión. Intenta nuevamente en 15 minutos.',
  },
});

app.use('/api/auth/login', loginLimiter);

// Montar todas las rutas centrales bajo /api
app.use('/api', routes);
app.use('/api/usuarios', usuariosRoutes);

app.get('/', (req, res) => {
  res.json({ mensaje: 'BACKEND LISTO' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
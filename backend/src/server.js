const express = require('express');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const routes = require('./routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const app = express();

app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Montar todas las rutas centrales bajo /api (incluye /api/resumen desde routes/index.js)
app.use('/api', routes);
app.use('/api/usuarios', usuariosRoutes);

app.get('/', (req, res) => {
  res.json({ mensaje: 'BACKEND LISTO' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
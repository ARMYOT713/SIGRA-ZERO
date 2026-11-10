const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const routes = require('./routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const app = express();

const resumenRoutes = require('./routes/resumenRoutes.js');

app.use(cors());
app.use(express.json());

// Montar todas las rutas centrales bajo /api
app.use('/api', routes);
app.use('/api/resumen', resumenRoutes);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/usuarios', usuariosRoutes); 

app.get('/', (req, res) => {
  res.json({ mensaje: 'BACKEND LISTO' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
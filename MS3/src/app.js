const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const mesasRoutes = require('./routes/mesas.routes');
const reservasRoutes = require('./routes/reservas.routes');
const analiticaRoutes = require('./routes/analitica.routes');
const swaggerSpec = require('./swagger');
const { databaseStatus } = require('./config/database');
const { getBaseUrl } = require('./services/ms1.service');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({
    servicio: 'MS3 - Reservas y Mesas',
    estado: 'activo',
    version: '1.0.0',
    documentacion: '/docs',
    dependencia_ms1: getBaseUrl()
  });
});

app.get('/health', (req, res) => {
  const db = databaseStatus();
  const healthy = db === 'connected';

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    database: db,
    ms1_url: getBaseUrl()
  });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/mesas', mesasRoutes);
app.use('/reservas', reservasRoutes);
app.use('/analitica', analiticaRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

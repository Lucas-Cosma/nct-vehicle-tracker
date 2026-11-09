// Express app. server.js starts it; the tests use it directly.
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { config } = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/', (req, res) => {
    res.json({ name: 'CheckMate API', health: '/api/health' });
  });

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

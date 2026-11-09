const { config } = require('../config/env');
const { getConnectionState } = require('../config/db');

function getHealth(req, res) {
  const database = getConnectionState();
  const healthy = database === 'connected';

  const body = {
    status: healthy ? 'ok' : 'degraded',
    database,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
  // extra info outside production
  if (!config.isProduction) {
    body.environment = config.nodeEnv;
    body.dryRun = config.dryRun;
    body.reminderDaysBefore = config.reminderDaysBefore;
  }

  res.status(healthy ? 200 : 503).json(body);
}

module.exports = { getHealth };

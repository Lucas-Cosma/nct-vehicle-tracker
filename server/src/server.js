// Entry point: connect to MongoDB, start the API and the cron jobs.
const { config } = require('./config/env');
const { connectDB, disconnectDB, describeConnectionError } = require('./config/db');
const { createApp } = require('./app');
const { startReminderJobs } = require('./jobs/reminderJob');
const { IS_DEV_AUTH } = require('./middleware/auth');
const logger = require('./utils/logger');

async function start() {
  if (config.isProduction && IS_DEV_AUTH) {
    logger.error(
      'Refusing to start: NODE_ENV=production but the development-only auth middleware ' +
        '(src/middleware/auth.js) is still in use. Replace it with the real authentication middleware first.'
    );
    process.exit(1);
  }

  try {
    await connectDB();
  } catch (err) {
    logger.error(`Could not connect to MongoDB.\n${describeConnectionError(err)}`);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`CheckMate API listening on http://localhost:${config.port} (${config.nodeEnv})`);
    if (config.dryRun) logger.info('DRY_RUN is ON: reminders are logged, not actually sent');
  });

  let jobs = { stop() {} };
  try {
    jobs = startReminderJobs();
  } catch (err) {
    logger.error(`Reminder jobs not started: ${err.message}`);
  }

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down...`);
    jobs.stop();
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    // Force exit if something hangs.
    setTimeout(() => process.exit(1), 10000).unref();
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled promise rejection:', err);
});

start();

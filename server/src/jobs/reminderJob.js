// Cron jobs (Europe/Dublin time):
//   REMINDER_CRON - daily deadline check, default 09:00
//   RETRY_CRON    - retry failed sends, default every 30 min
const cron = require('node-cron');
const { config } = require('../config/env');
const { runReminderCycle, processDueNotifications } = require('../services/reminders/reminderService');
const logger = require('../utils/logger');

function startReminderJobs({ cfg = config } = {}) {
  if (!cfg.cronEnabled) {
    logger.info('Scheduled reminder jobs are disabled (CRON_ENABLED=false)');
    return { stop() {} };
  }

  for (const [name, expression] of [
    ['REMINDER_CRON', cfg.reminderCron],
    ['RETRY_CRON', cfg.retryCron],
  ]) {
    if (!cron.validate(expression)) {
      throw new Error(`${name} "${expression}" is not a valid cron expression`);
    }
  }

  // don't start a run while the last one is still going
  let running = false;
  const guarded = (label, task) => async () => {
    if (running) {
      logger.warn(`${label} skipped: previous run still in progress`);
      return;
    }
    running = true;
    try {
      const result = await task();
      logger.info(`${label} finished: ${JSON.stringify(result)}`);
    } catch (err) {
      logger.error(`${label} failed:`, err);
    } finally {
      running = false;
    }
  };

  const daily = cron.schedule(cfg.reminderCron, guarded('Daily reminder check', () => runReminderCycle()), {
    timezone: cfg.timezone,
  });
  const retry = cron.schedule(cfg.retryCron, guarded('Delivery retry', () => processDueNotifications()), {
    timezone: cfg.timezone,
  });

  logger.info(
    `Reminder jobs scheduled (${cfg.timezone}): check "${cfg.reminderCron}", retries "${cfg.retryCron}", ` +
      `reminder days [${cfg.reminderDaysBefore.join(', ')}], ` +
      `overdue alerts ${!cfg.overdueAlerts ? 'OFF' : cfg.overdueRepeatDays ? `every ${cfg.overdueRepeatDays} days` : 'once'}, ` +
      `dry-run ${cfg.dryRun ? 'ON' : 'OFF'}`
  );

  return {
    stop() {
      daily.stop();
      retry.stop();
    },
  };
}

module.exports = { startReminderJobs };

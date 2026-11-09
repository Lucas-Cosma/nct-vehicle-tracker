// App settings, read from environment variables (.env in development).
const path = require('path');

// Skip .env during tests so real credentials are never used.
const runningUnderJest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
if (!runningUnderJest) {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
}

const DEFAULT_REMINDER_DAYS = '30,14,7,1,0';

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === null || String(value).trim() === '') return defaultValue;
  const normalised = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalised)) return true;
  if (['false', '0', 'no', 'off'].includes(normalised)) return false;
  throw new Error(`Expected "true" or "false" but got "${value}"`);
}

function parsePositiveInt(value, defaultValue, name) {
  if (value === undefined || String(value).trim() === '') return defaultValue;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`${name} must be a positive whole number, got "${value}"`);
  }
  return number;
}

function parseNonNegativeInt(value, defaultValue, name) {
  if (value === undefined || String(value).trim() === '') return defaultValue;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${name} must be 0 or a positive whole number, got "${value}"`);
  }
  return number;
}

// "30,14,7,1,0" -> [30, 14, 7, 1, 0], duplicates removed, largest first. 0 = on the day itself.
function parseReminderDays(raw = DEFAULT_REMINDER_DAYS) {
  const parts = String(raw)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new Error('REMINDER_DAYS_BEFORE must contain at least one number, e.g. 30,14,7,1,0');
  }

  const days = parts.map((part) => {
    const number = Number(part);
    if (!/^\d+$/.test(part) || number > 365) {
      throw new Error(
        `REMINDER_DAYS_BEFORE contains an invalid value "${part}". ` +
          'Use whole numbers between 0 and 365, e.g. 30,14,7,1,0'
      );
    }
    return number;
  });

  return [...new Set(days)].sort((a, b) => b - a);
}

function parseList(raw, fallback) {
  const list = String(raw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length ? list : fallback;
}

function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const isTest = nodeEnv === 'test';
  const allowRealNotificationsInTests = env.ALLOW_REAL_NOTIFICATIONS_IN_TESTS === 'true';

  // dry run is on by default, and always on in tests unless ALLOW_REAL_NOTIFICATIONS_IN_TESTS=true
  let dryRun = parseBoolean(env.DRY_RUN, true);
  if (isTest && !allowRealNotificationsInTests) dryRun = true;

  return Object.freeze({
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isTest,
    port: parsePositiveInt(env.PORT, 4000, 'PORT'),
    corsOrigins: parseList(env.CORS_ORIGIN, ['http://localhost:5173', 'http://localhost:3000']),

    mongodbUri: env.MONGODB_URI || '',
    mongodbDbName: env.MONGODB_DB_NAME || 'checkmate',

    adminApiKey: env.ADMIN_API_KEY || '',

    timezone: 'Europe/Dublin',
    reminderDaysBefore: parseReminderDays(env.REMINDER_DAYS_BEFORE || DEFAULT_REMINDER_DAYS),
    overdueAlerts: parseBoolean(env.OVERDUE_ALERTS, true),
    overdueRepeatDays: parseNonNegativeInt(env.OVERDUE_REPEAT_DAYS, 7, 'OVERDUE_REPEAT_DAYS'),
    nctRetestReminders: parseBoolean(env.NCT_RETEST_REMINDERS, true),
    nctRetestRepeatDays: parseNonNegativeInt(env.NCT_RETEST_REPEAT_DAYS, 7, 'NCT_RETEST_REPEAT_DAYS'),
    nctRetestWindowDays: parsePositiveInt(env.NCT_RETEST_WINDOW_DAYS, 30, 'NCT_RETEST_WINDOW_DAYS'),
    reminderCron: env.REMINDER_CRON || '0 9 * * *',
    retryCron: env.RETRY_CRON || '*/30 * * * *',
    cronEnabled: parseBoolean(env.CRON_ENABLED, true),
    maxDeliveryAttempts: parsePositiveInt(env.MAX_DELIVERY_ATTEMPTS, 3, 'MAX_DELIVERY_ATTEMPTS'),
    retryBaseMinutes: parsePositiveInt(env.RETRY_BASE_MINUTES, 15, 'RETRY_BASE_MINUTES'),

    dryRun,
    email: Object.freeze({
      resendApiKey: env.RESEND_API_KEY || '',
      from: env.EMAIL_FROM || '',
    }),
    sms: Object.freeze({
      accountSid: env.TWILIO_ACCOUNT_SID || '',
      authToken: env.TWILIO_AUTH_TOKEN || '',
      from: env.TWILIO_FROM_NUMBER || '',
    }),
  });
}

const config = loadConfig();

module.exports = { config, loadConfig, parseReminderDays, parseBoolean };

// Providers look like { name, dryRun, send({ to, subject?, text, idempotencyKey? }) -> { id, dryRun } }
// send() throws on failure. The tests use fake providers with the same shape.
const { config } = require('../../config/env');
const { createEmailProvider } = require('./emailService');
const { createSmsProvider } = require('./smsService');

function createNotificationProviders(cfg = config) {
  return { email: createEmailProvider(cfg), sms: createSmsProvider(cfg) };
}

module.exports = { createNotificationProviders };

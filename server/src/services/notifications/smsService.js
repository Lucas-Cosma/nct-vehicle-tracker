// SMS via Twilio. Falls back to dry run if DRY_RUN=true or the Twilio settings aren't set.
const { config } = require('../../config/env');
const logger = require('../../utils/logger');
const { createDryRunProvider } = require('./dryRunProvider');

function createSmsProvider(cfg = config) {
  const { accountSid, authToken, from } = cfg.sms;

  if (cfg.dryRun) return createDryRunProvider('sms');
  if (!accountSid || !authToken || !from) {
    logger.warn('DRY_RUN=false but Twilio credentials are missing - SMS will be simulated only');
    return createDryRunProvider('sms');
  }

  // only load the SDK when actually sending
  const twilio = require('twilio');
  const client = twilio(accountSid, authToken);

  return {
    name: 'twilio',
    dryRun: false,
    async send({ to, text }) {
      const message = await client.messages.create({ from, to, body: text });
      return { id: message.sid, dryRun: false };
    },
  };
}

module.exports = { createSmsProvider };

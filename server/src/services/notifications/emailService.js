// Email via Resend. Falls back to dry run if DRY_RUN=true or RESEND_API_KEY/EMAIL_FROM aren't set.
const { config } = require('../../config/env');
const logger = require('../../utils/logger');
const { createDryRunProvider } = require('./dryRunProvider');

function createEmailProvider(cfg = config) {
  const { resendApiKey, from } = cfg.email;

  if (cfg.dryRun) return createDryRunProvider('email');
  if (!resendApiKey || !from) {
    logger.warn('DRY_RUN=false but RESEND_API_KEY or EMAIL_FROM is missing - emails will be simulated only');
    return createDryRunProvider('email');
  }

  // only load the SDK when actually sending
  const { Resend } = require('resend');
  const client = new Resend(resendApiKey);

  return {
    name: 'resend',
    dryRun: false,
    async send({ to, subject, text, idempotencyKey }) {
      // idempotency key stops Resend sending the same reminder twice (e.g. retry after a crash)
      // Resend returns { data, error } instead of throwing
      const { data, error } = await client.emails.send(
        { from, to, subject, text },
        idempotencyKey ? { idempotencyKey } : undefined
      );
      if (error) {
        throw new Error(`Resend error: ${error.message || error.name || 'unknown error'}`);
      }
      return { id: data && data.id ? data.id : null, dryRun: false };
    },
  };
}

module.exports = { createEmailProvider };

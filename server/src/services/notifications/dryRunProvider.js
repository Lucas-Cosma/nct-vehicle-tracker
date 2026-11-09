// Used when DRY_RUN=true or credentials are missing. Logs the message instead of sending it.
const crypto = require('crypto');
const logger = require('../../utils/logger');
const { maskRecipient } = require('../../utils/privacy');

function createDryRunProvider(channel) {
  return {
    name: `dry-run-${channel}`,
    dryRun: true,
    async send({ to, subject, text }) {
      logger.info(`[DRY RUN] ${channel} to ${maskRecipient(to)}: ${subject || text}`);
      return { id: `dry-run-${crypto.randomUUID()}`, dryRun: true };
    },
  };
}

module.exports = { createDryRunProvider };

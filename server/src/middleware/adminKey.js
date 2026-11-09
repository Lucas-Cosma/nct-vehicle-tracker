// Admin endpoints need an X-Admin-Key header matching ADMIN_API_KEY
const crypto = require('crypto');
const { config } = require('../config/env');
const AppError = require('../utils/AppError');

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function requireAdminKey(req, res, next) {
  if (!config.adminApiKey) {
    return next(new AppError(503, 'Admin endpoints are disabled because ADMIN_API_KEY is not set'));
  }

  const provided = req.get('x-admin-key') || '';
  // constant-time compare
  if (!crypto.timingSafeEqual(sha256(provided), sha256(config.adminApiKey))) {
    return next(new AppError(401, 'A valid X-Admin-Key header is required'));
  }
  return next();
}

module.exports = { requireAdminKey };

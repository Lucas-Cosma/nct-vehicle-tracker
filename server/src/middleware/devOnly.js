// Dev-only routes return 404 in production
const { config } = require('../config/env');
const AppError = require('../utils/AppError');

function devOnly(req, res, next) {
  if (config.isProduction) {
    return next(new AppError(404, 'Route not found'));
  }
  return next();
}

module.exports = { devOnly };

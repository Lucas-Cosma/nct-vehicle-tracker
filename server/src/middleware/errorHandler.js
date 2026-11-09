// Turns errors into { error: { message, details? } }.
// Unexpected errors are logged and the client only gets "Internal server error".
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

function notFound(req, res, next) {
  next(new AppError(404, 'Route not found'));
}

function duplicateKeyMessage(err) {
  const keys = Object.keys(err.keyPattern || {});
  if (keys.includes('email')) return 'That email address is already in use';
  return 'Duplicate value';
}

// Express needs all 4 args to treat this as an error handler
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  let status = 500;
  let message = 'Internal server error';
  let details;

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body is too large';
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    message = duplicateKeyMessage(err);
  }

  if (status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} failed:`, err);
  }

  const body = { error: { message } };
  if (details) body.error.details = details;
  return res.status(status).json(body);
}

module.exports = { errorHandler, notFound };

// Error with an HTTP status code. errorHandler sends the message to the client.
class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    if (details) this.details = details;
  }
}

module.exports = AppError;

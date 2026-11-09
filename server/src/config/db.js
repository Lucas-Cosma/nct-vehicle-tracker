// MongoDB connection. MONGODB_URI contains the password, so don't log it.
const mongoose = require('mongoose');
const { config } = require('./env');
const logger = require('../utils/logger');

let listenersAttached = false;

const READY_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

function missingUriMessage() {
  return [
    'MONGODB_URI is not set, so the server cannot connect to MongoDB Atlas.',
    'To configure it yourself:',
    '  1. Copy .env.example to .env in the project root (.env is git-ignored).',
    '  2. In MongoDB Atlas open your "checkmate" cluster > Connect > Drivers and copy the connection string.',
    '  3. Paste it as MONGODB_URI in .env and replace <db_password> with the password of the database user "Cezary".',
    '     URL-encode special characters in the password (e.g. @ -> %40, # -> %23).',
  ].join('\n');
}

// adds a hint for the usual Atlas connection problems
function describeConnectionError(err) {
  const message = err && err.message ? err.message : String(err);
  let hint = '';

  if (/bad auth|authentication failed/i.test(message)) {
    hint =
      'Authentication failed. Check the username and password in MONGODB_URI ' +
      '(URL-encode special characters) and that the user exists under Atlas > Database Access.';
  } else if (/ENOTFOUND|querySrv|EREFUSED|ESERVFAIL/i.test(message)) {
    hint =
      'Could not resolve the cluster hostname. Check it is checkmate.ngnlern.mongodb.net and that your internet/DNS works.';
  } else if (/timed out|ETIMEDOUT|ECONNREFUSED|whitelist|not authorized/i.test(message)) {
    hint = 'Could not reach the cluster. In Atlas > Network Access, add your current IP address and try again.';
  }

  return hint ? `${message}\nHint: ${hint}` : message;
}

function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  mongoose.connection.on('error', (err) => logger.error('MongoDB error:', describeConnectionError(err)));
}

async function connectDB(uri = config.mongodbUri, { dbName = config.mongodbDbName } = {}) {
  if (!uri) {
    throw new Error(missingUriMessage());
  }
  if (/<db_password>|<password>/i.test(uri)) {
    throw new Error(
      'MONGODB_URI still contains the <db_password> placeholder. ' +
        'Open .env and replace it with the real password for the database user (never put it in code).'
    );
  }

  attachListeners();
  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 10000,
  });

  logger.info(`Connected to MongoDB database "${dbName}"`);
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

function getConnectionState() {
  return READY_STATES[mongoose.connection.readyState] || 'unknown';
}

module.exports = { connectDB, disconnectDB, getConnectionState, describeConnectionError };

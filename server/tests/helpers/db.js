// In-memory MongoDB for tests (never touches Atlas)
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { connectDB, disconnectDB } = require('../../src/config/db');
const User = require('../../src/models/User');
const Vehicle = require('../../src/models/Vehicle');
const Notification = require('../../src/models/Notification');

let mongod;

async function startTestDb() {
  mongod = await MongoMemoryServer.create();
  await connectDB(mongod.getUri(), { dbName: 'checkmate-test' });
  // build the unique indexes before the tests run
  await Promise.all([User.syncIndexes(), Vehicle.syncIndexes(), Notification.syncIndexes()]);
}

async function clearTestDb() {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

async function stopTestDb() {
  await disconnectDB();
  if (mongod) await mongod.stop();
}

module.exports = { startTestDb, clearTestDb, stopTestDb };

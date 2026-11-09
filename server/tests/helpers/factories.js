const User = require('../../src/models/User');
const Vehicle = require('../../src/models/Vehicle');
const { parseDateOnly } = require('../../src/utils/dates');

let counter = 0;

function createUser(overrides = {}) {
  counter += 1;
  return User.create({
    email: `user${counter}@example.com`,
    phone: '+353871234567',
    emailNotifications: true,
    smsNotifications: false,
    ...overrides,
  });
}

// dates can be given as "YYYY-MM-DD" strings
function createVehicle(owner, overrides = {}) {
  counter += 1;
  const data = {
    owner: owner._id,
    registration: `191-D-${10000 + counter}`,
    make: 'Toyota',
    model: 'Corolla',
    ...overrides,
  };
  for (const field of ['nctExpiry', 'motorTaxExpiry', 'insuranceExpiry', 'nextServiceDate', 'nctLastTestDate']) {
    if (typeof data[field] === 'string') data[field] = parseDateOnly(data[field]);
  }
  return Vehicle.create(data);
}

// Fake provider that records messages. failTimes = fail the first N calls, alwaysFail = fail every call
function createFakeProvider({ failTimes = 0, alwaysFail = false } = {}) {
  const provider = {
    name: 'fake',
    dryRun: false,
    calls: 0,
    sent: [],
    async send(message) {
      provider.calls += 1;
      if (alwaysFail || provider.calls <= failTimes) {
        throw new Error('Simulated provider outage');
      }
      provider.sent.push(message);
      return { id: `fake-${provider.calls}`, dryRun: false };
    },
  };
  return provider;
}

function createFakeProviders(options = {}) {
  return { email: createFakeProvider(options.email), sms: createFakeProvider(options.sms) };
}

module.exports = { createUser, createVehicle, createFakeProvider, createFakeProviders };

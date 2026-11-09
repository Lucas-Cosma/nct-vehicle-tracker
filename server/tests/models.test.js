const mongoose = require('mongoose');
const { startTestDb, clearTestDb, stopTestDb } = require('./helpers/db');
const { createUser, createVehicle } = require('./helpers/factories');
const User = require('../src/models/User');
const Vehicle = require('../src/models/Vehicle');
const Notification = require('../src/models/Notification');
const { parseDateOnly } = require('../src/utils/dates');

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

describe('User model', () => {
  test('applies notification defaults', async () => {
    const user = await User.create({ email: 'Someone@Example.com' });
    expect(user.email).toBe('someone@example.com');
    expect(user.emailNotifications).toBe(true);
    expect(user.smsNotifications).toBe(false);
    expect(user.phone).toBeNull();
  });

  test('requires a valid email', async () => {
    await expect(User.create({})).rejects.toThrow(mongoose.Error.ValidationError);
    await expect(User.create({ email: 'not-an-email' })).rejects.toThrow(/Email address is not valid/);
  });

  test('requires E.164 phone numbers', async () => {
    await expect(User.create({ email: 'a@b.ie', phone: '087 123 4567' })).rejects.toThrow(/international format/);
  });

  test('email addresses are unique', async () => {
    await User.create({ email: 'dup@example.com' });
    await expect(User.create({ email: 'dup@example.com' })).rejects.toMatchObject({ code: 11000 });
  });
});

describe('Vehicle model', () => {
  test('requires an owner and a registration', async () => {
    const error = await Vehicle.create({}).catch((err) => err);
    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(Object.keys(error.errors).sort()).toEqual(['owner', 'registration']);
  });

  test('rejects deadline dates that include a time of day', async () => {
    const user = await createUser();
    const error = await createVehicle(user, { nctExpiry: new Date('2026-11-08T15:30:00Z') }).catch((err) => err);
    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error.errors.nctExpiry.message).toMatch(/without a time/);
  });

  test('stores dates as midnight UTC and returns them as YYYY-MM-DD', async () => {
    const user = await createUser();
    const vehicle = await createVehicle(user, { nctExpiry: '2026-11-08' });
    expect(vehicle.nctExpiry.toISOString()).toBe('2026-11-08T00:00:00.000Z');
    const json = vehicle.toJSON();
    expect(json.nctExpiry).toBe('2026-11-08');
    expect(json.motorTaxExpiry).toBeNull();
    expect(json).toHaveProperty('createdAt');
    expect(json).toHaveProperty('updatedAt');
  });

  test('NCT result must be passed, failed or empty', async () => {
    const user = await createUser();
    const vehicle = await createVehicle(user, { nctLastTestDate: '2026-10-29', nctLastResult: 'failed' });
    expect(vehicle.toJSON()).toMatchObject({ nctLastTestDate: '2026-10-29', nctLastResult: 'failed' });
    await expect(createVehicle(user, { nctLastResult: 'maybe' })).rejects.toThrow(mongoose.Error.ValidationError);
  });
});

describe('Notification model', () => {
  test('the unique index blocks a duplicate reminder', async () => {
    const user = await createUser();
    const vehicle = await createVehicle(user);
    const key = {
      user: user._id,
      vehicle: vehicle._id,
      deadlineType: 'nct',
      dueDate: parseDateOnly('2026-11-08'),
      offsetDays: 7,
      channel: 'email',
    };
    await Notification.create(key);
    await expect(Notification.create(key)).rejects.toMatchObject({ code: 11000 });
    // A different channel is a different reminder.
    await expect(Notification.create({ ...key, channel: 'sms' })).resolves.toBeDefined();
  });

  test('rejects unknown channel and deadline type', async () => {
    const error = await Notification.create({
      user: new mongoose.Types.ObjectId(),
      vehicle: new mongoose.Types.ObjectId(),
      deadlineType: 'parking',
      dueDate: new Date(),
      offsetDays: 7,
      channel: 'pigeon',
    }).catch((err) => err);
    expect(Object.keys(error.errors)).toEqual(expect.arrayContaining(['deadlineType', 'channel']));
  });
});

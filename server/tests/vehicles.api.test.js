
const request = require('supertest');
const { createApp } = require('../src/app');
const { startTestDb, clearTestDb, stopTestDb } = require('./helpers/db');
const { createUser } = require('./helpers/factories');

const app = createApp();
const URL = '/api/vehicles';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

// Adds a vehicle to the logged-in user's account.
test('creates a vehicle successfully', async () => {
  const user = await createUser();

  const res = await request(app)
    .post(URL)
    .set('X-Dev-User-Id', user.id)
    .send({
      nickname: 'Family Car',
      make: 'Toyota',
      model: 'Corolla',
      registration: '241-D-12345',
      nctExpiry: '2027-06-30',
      motorTaxExpiry: '2027-08-31',
      insuranceExpiry: '2027-09-30',
      insuranceProvider: 'AXA',
    });

  expect(res.status).toBe(201);
  expect(res.body.vehicle).toMatchObject({
    nickname: 'Family Car',
    make: 'Toyota',
    model: 'Corolla',
    registration: '241-D-12345',
    owner: user.id,
  });
});

// Checks that a user can retrieve their own vehicles.
test('gets vehicles belonging to the logged-in user', async () => {
  const user = await createUser();

  await request(app)
    .post(URL)
    .set('X-Dev-User-Id', user.id)
    .send({
      make: 'Honda',
      model: 'Civic',
      registration: '251-D-12345',
    });

  const res = await request(app)
    .get(URL)
    .set('X-Dev-User-Id', user.id);

  expect(res.status).toBe(200);
  expect(res.body.vehicles).toHaveLength(1);
  expect(res.body.vehicles[0].make).toBe('Honda');
});

// Checks that users cannot retrieve another user's vehicles.
test('does not return vehicles belonging to another user', async () => {
  const user1 = await createUser();
  const user2 = await createUser();

  await request(app)
    .post(URL)
    .set('X-Dev-User-Id', user1.id)
    .send({
      make: 'Ford',
      model: 'Focus',
      registration: '251-D-54321',
    });

  const res = await request(app)
    .get(URL)
    .set('X-Dev-User-Id', user2.id);

  expect(res.status).toBe(200);
  expect(res.body.vehicles).toHaveLength(0);
});

// Checks that invalid vehicle information is rejected.
test('rejects a vehicle without a registration number', async () => {
  const user = await createUser();

  const res = await request(app)
    .post(URL)
    .set('X-Dev-User-Id', user.id)
    .send({
      make: 'Toyota',
      model: 'Corolla',
    });

  expect(res.status).toBe(400);
  expect(res.body.error.message).toMatch(/Validation failed/);
});

// Checks that unauthenticated users cannot access vehicles.
test('rejects requests without authentication', async () => {
  const res = await request(app).get(URL);

  expect(res.status).toBe(401);
});

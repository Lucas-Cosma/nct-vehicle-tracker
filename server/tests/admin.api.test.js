const request = require('supertest');
const { createApp } = require('../src/app');
const { startTestDb, clearTestDb, stopTestDb } = require('./helpers/db');
const { createUser, createVehicle } = require('./helpers/factories');

const app = createApp();
const ADMIN_KEY = process.env.ADMIN_API_KEY;

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

describe('health check', () => {
  test('reports ok when the database is connected', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'connected', dryRun: true });
  });

  test('unknown routes return a JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Route not found');
  });
});

describe('development admin endpoints', () => {
  test('require the admin key', async () => {
    expect((await request(app).post('/api/dev/reminders/run')).status).toBe(401);
    expect((await request(app).post('/api/dev/reminders/run').set('X-Admin-Key', 'wrong')).status).toBe(401);
  });

  test('creates the sample car with an upcoming, due-today and overdue date', async () => {
    const first = await request(app).post('/api/dev/sample-car').set('X-Admin-Key', ADMIN_KEY);
    expect(first.status).toBe(201);
    expect(first.body.vehicle).toMatchObject({ registration: '191-D-12345', make: 'Toyota', model: 'Corolla' });
    expect(first.body.user).toMatchObject({ email: 'sample@checkmate.test', smsNotifications: true });

    // calling it again resets the same car instead of making a second one
    const second = await request(app).post('/api/dev/sample-car').set('X-Admin-Key', ADMIN_KEY);
    expect(second.status).toBe(200);
    expect(second.body.vehicle.id).toBe(first.body.vehicle.id);

    // NCT retest (failed 2 days ago), tax (today), insurance (3 days overdue), service (30 days) x email + SMS
    const run = await request(app).post('/api/dev/reminders/run').set('X-Admin-Key', ADMIN_KEY);
    expect(run.body.result.queued.remindersQueued).toBe(8);
    expect(run.body.result.delivery.sent).toBe(8);

    // the sample user can be used with X-Dev-User-Id
    const prefs = await request(app).get('/api/users/me/preferences').set('X-Dev-User-Id', first.body.user.id);
    expect(prefs.status).toBe(200);
  });

  test('run the reminder check manually (dry-run) with a simulated date', async () => {
    const user = await createUser();
    await createVehicle(user, { nctExpiry: '2026-11-08' });

    const res = await request(app)
      .post('/api/dev/reminders/run')
      .set('X-Admin-Key', ADMIN_KEY)
      .send({ date: '2026-11-01' });

    expect(res.status).toBe(200);
    expect(res.body.result.queued).toMatchObject({ date: '2026-11-01', remindersQueued: 1 });
    expect(res.body.result.delivery).toMatchObject({ sent: 1 });

    const list = await request(app).get('/api/dev/notifications?status=sent').set('X-Admin-Key', ADMIN_KEY);
    expect(list.status).toBe(200);
    expect(list.body.notifications).toHaveLength(1);
    expect(list.body.notifications[0].dryRun).toBe(true);
  });

  test('rejects an invalid simulated date', async () => {
    const res = await request(app)
      .post('/api/dev/reminders/run')
      .set('X-Admin-Key', ADMIN_KEY)
      .send({ date: '2026-02-30' });
    expect(res.status).toBe(400);
  });
});

describe('production mode', () => {
  function loadProductionApp() {
    process.env.NODE_ENV = 'production';
    let prodApp;
    try {
      // fresh copy of the app so the config is re-read
      jest.isolateModules(() => {
        prodApp = require('../src/app').createApp();
      });
    } finally {
      process.env.NODE_ENV = 'test';
    }
    return prodApp;
  }

  test('development endpoints are hidden (404) even with the right admin key', async () => {
    const prodApp = loadProductionApp();
    const res = await request(prodApp).post('/api/dev/reminders/run').set('X-Admin-Key', ADMIN_KEY);
    expect(res.status).toBe(404);
  });

  test('the development auth middleware refuses to authenticate anyone', async () => {
    const prodApp = loadProductionApp();
    const res = await request(prodApp)
      .get('/api/users/me/preferences')
      .set('X-Dev-User-Id', '64b7f0c2a1b2c3d4e5f60718');
    expect(res.status).toBe(500);
    expect(res.body.error.message).toMatch(/not configured for production/);
  });
});

test('admin endpoints are disabled when ADMIN_API_KEY is not set', async () => {
  const saved = process.env.ADMIN_API_KEY;
  delete process.env.ADMIN_API_KEY;
  let noKeyApp;
  try {
    jest.isolateModules(() => {
      noKeyApp = require('../src/app').createApp();
    });
  } finally {
    process.env.ADMIN_API_KEY = saved;
  }
  const res = await request(noKeyApp).post('/api/dev/reminders/run').set('X-Admin-Key', '');
  expect(res.status).toBe(503);
});

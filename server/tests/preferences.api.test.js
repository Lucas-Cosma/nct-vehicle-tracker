const request = require('supertest');
const { createApp } = require('../src/app');
const { startTestDb, clearTestDb, stopTestDb } = require('./helpers/db');
const { createUser } = require('./helpers/factories');

const app = createApp();
const URL = '/api/users/me/preferences';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

test('gets the current preferences', async () => {
  const user = await createUser({ email: 'pref@example.com', phone: null });
  const res = await request(app).get(URL).set('X-Dev-User-Id', user.id);
  expect(res.status).toBe(200);
  expect(res.body.preferences).toEqual({
    email: 'pref@example.com',
    phone: null,
    emailNotifications: true,
    smsNotifications: false,
  });
});

test('switches to SMS only', async () => {
  const user = await createUser();
  const res = await request(app)
    .patch(URL)
    .set('X-Dev-User-Id', user.id)
    .send({ emailNotifications: false, smsNotifications: true, phone: '+353 87 765 4321' });
  expect(res.status).toBe(200);
  expect(res.body.preferences).toMatchObject({
    phone: '+353877654321',
    emailNotifications: false,
    smsNotifications: true,
  });
  expect(res.body.warnings).toEqual([]);
});

test('warns when SMS is on but there is no phone number', async () => {
  const user = await createUser({ phone: null });
  const res = await request(app).patch(URL).set('X-Dev-User-Id', user.id).send({ smsNotifications: true });
  expect(res.status).toBe(200);
  expect(res.body.warnings[0]).toMatch(/no phone number/);
});

test('removing the phone number is allowed', async () => {
  const user = await createUser();
  const res = await request(app).patch(URL).set('X-Dev-User-Id', user.id).send({ phone: null });
  expect(res.status).toBe(200);
  expect(res.body.preferences.phone).toBeNull();
});

test.each([
  [{ phone: '0871234567' }, 'phone'],
  [{ email: 'nope' }, 'email'],
  [{ smsNotifications: 'yes' }, 'smsNotifications'],
  [{ role: 'admin' }, 'role'],
])('rejects invalid input %p', async (body, field) => {
  const user = await createUser();
  const res = await request(app).patch(URL).set('X-Dev-User-Id', user.id).send(body);
  expect(res.status).toBe(400);
  expect(res.body.error.details.map((d) => d.field)).toContain(field);
});

test('changing to an email that is already used gives 409', async () => {
  await createUser({ email: 'taken@example.com' });
  const user = await createUser();
  const res = await request(app).patch(URL).set('X-Dev-User-Id', user.id).send({ email: 'taken@example.com' });
  expect(res.status).toBe(409);
});

describe('dev authentication', () => {
  test('rejects requests without X-Dev-User-Id', async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/X-Dev-User-Id/);
  });

  test('rejects an id that does not belong to any user', async () => {
    const res = await request(app).get(URL).set('X-Dev-User-Id', '64b7f0c2a1b2c3d4e5f60718');
    expect(res.status).toBe(401);
  });

  test('rejects a malformed user id', async () => {
    const res = await request(app).get(URL).set('X-Dev-User-Id', 'not-an-id');
    expect(res.status).toBe(401);
  });
});

test('malformed JSON gives 400', async () => {
  const user = await createUser();
  const res = await request(app)
    .patch(URL)
    .set('X-Dev-User-Id', user.id)
    .set('Content-Type', 'application/json')
    .send('{"phone": ');
  expect(res.status).toBe(400);
  expect(res.body.error.message).toMatch(/not valid JSON/);
});

// Reminder tests. Each TCxx test matches a row in docs/notification-test-cases.md.
// Uses a fixed "now" and fake providers, so nothing is really sent.
const { startTestDb, clearTestDb, stopTestDb } = require('./helpers/db');
const { createUser, createVehicle, createFakeProviders } = require('./helpers/factories');
const Notification = require('../src/models/Notification');
const Vehicle = require('../src/models/Vehicle');
const User = require('../src/models/User');
const { parseDateOnly } = require('../src/utils/dates');
const {
  queueDueReminders,
  processDueNotifications,
  runReminderCycle,
} = require('../src/services/reminders/reminderService');

const OFFSETS = [30, 14, 7, 1, 0];
const NOW = new Date('2026-11-01T10:00:00Z'); // 1 Nov 2026, 10:00 in Dublin
const minutesLater = (minutes, from = NOW) => new Date(from.getTime() + minutes * 60 * 1000);
const onDate = (dateString) => new Date(`${dateString}T10:00:00Z`);

function run(now, providers, extra = {}) {
  return runReminderCycle({ now, providers, offsets: OFFSETS, overdueAlerts: true, overdueRepeatDays: 7, ...extra });
}

// one user (email only by default) with one car
async function carWith(dates, userOverrides = {}) {
  const user = await createUser(userOverrides);
  const vehicle = await createVehicle(user, { registration: '191-D-12345', ...dates });
  return { user, vehicle };
}

async function offsetsSent() {
  const records = await Notification.find({ status: 'sent' }).sort({ createdAt: 1 }).lean();
  return records.map((r) => r.offsetDays);
}

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

describe('upcoming deadlines', () => {
  test('TC01 deadline 31 days away: no reminder yet', async () => {
    await carWith({ nctExpiry: '2026-12-02' });
    const providers = createFakeProviders();
    await run(NOW, providers);
    expect(providers.email.calls).toBe(0);
    expect(await Notification.countDocuments()).toBe(0);
  });

  test('TC02 deadline 30 days away: 30-day reminder', async () => {
    await carWith({ nctExpiry: '2026-12-01' });
    const providers = createFakeProviders();
    await run(NOW, providers);
    expect(providers.email.sent[0].subject).toBe('CheckMate reminder: NCT for 191-D-12345 expires in 30 days');
    expect(await offsetsSent()).toEqual([30]);
  });

  test('TC03 car added with 10 days left: only the 14-day reminder, no late 30-day one', async () => {
    await carWith({ nctExpiry: '2026-11-11' });
    const providers = createFakeProviders();
    await run(NOW, providers);
    expect(providers.email.sent).toHaveLength(1);
    expect(providers.email.sent[0].subject).toMatch(/expires in 10 days/);
    expect(await offsetsSent()).toEqual([14]);
  });

  test('TC04 deadline 7 days away: 7-day reminder', async () => {
    await carWith({ nctExpiry: '2026-11-08' });
    const providers = createFakeProviders();
    await run(NOW, providers);
    expect(providers.email.sent[0].subject).toMatch(/expires in 7 days/);
    expect(await offsetsSent()).toEqual([7]);
  });

  test('TC05 deadline tomorrow: 1-day reminder', async () => {
    await carWith({ nctExpiry: '2026-11-02' });
    const providers = createFakeProviders();
    await run(NOW, providers);
    expect(providers.email.sent[0].subject).toMatch(/expires tomorrow/);
    expect(await offsetsSent()).toEqual([1]);
  });

  test('TC06 check runs twice on the same day: only one reminder', async () => {
    await carWith({ nctExpiry: '2026-11-08' });
    const providers = createFakeProviders();
    await run(NOW, providers);
    const second = await run(minutesLater(60), providers);
    expect(second.queued).toMatchObject({ remindersQueued: 0, alreadyQueued: 1 });
    expect(providers.email.sent).toHaveLength(1);
    expect(await Notification.countDocuments()).toBe(1);
  });

  test('TC07 next day is still in the same 7-day window: no new reminder', async () => {
    await carWith({ nctExpiry: '2026-11-08' });
    const providers = createFakeProviders();
    await run(NOW, providers);
    await run(onDate('2026-11-02'), providers);
    expect(providers.email.sent).toHaveLength(1);
  });
});

describe('due today', () => {
  test('TC08 NCT expires today: due-today reminder', async () => {
    await carWith({ nctExpiry: '2026-11-01' });
    const providers = createFakeProviders();
    await run(NOW, providers);
    expect(providers.email.sent[0].subject).toBe('CheckMate reminder: NCT for 191-D-12345 expires today');
    expect(await offsetsSent()).toEqual([0]);
  });

  test('TC09 service due today uses "is due" wording', async () => {
    await carWith({ nextServiceDate: '2026-11-01' });
    const providers = createFakeProviders();
    await run(NOW, providers);
    expect(providers.email.sent[0].subject).toBe('CheckMate reminder: Service for 191-D-12345 is due today');
  });

  test('TC10 1-day reminder yesterday, then a separate due-today reminder', async () => {
    await carWith({ nctExpiry: '2026-11-02' });
    const providers = createFakeProviders();
    await run(NOW, providers);
    await run(onDate('2026-11-02'), providers);
    expect(providers.email.sent.map((m) => m.subject)).toEqual([
      'CheckMate reminder: NCT for 191-D-12345 expires tomorrow',
      'CheckMate reminder: NCT for 191-D-12345 expires today',
    ]);
  });
});

describe('overdue deadlines', () => {
  test('TC11 expired yesterday: overdue alert', async () => {
    await carWith({ nctExpiry: '2026-10-31' });
    const providers = createFakeProviders();
    await run(NOW, providers);

    const message = providers.email.sent[0];
    expect(message.subject).toBe('CheckMate overdue: NCT for 191-D-12345 expired yesterday');
    expect(message.text).toMatch(/Please book your NCT as soon as possible/);
    const record = await Notification.findOne().lean();
    expect(record).toMatchObject({ kind: 'overdue', offsetDays: -1, status: 'sent' });
  });

  test('TC12 expired 3 days ago: one overdue alert', async () => {
    await carWith({ insuranceExpiry: '2026-10-29' });
    const providers = createFakeProviders();
    await run(NOW, providers);
    expect(providers.email.sent).toHaveLength(1);
    expect(providers.email.sent[0].subject).toBe('CheckMate overdue: Insurance for 191-D-12345 expired 3 days ago');
  });

  test('TC13 still overdue a few days later: no repeat within the week', async () => {
    await carWith({ nctExpiry: '2026-10-29' });
    const providers = createFakeProviders();
    await run(NOW, providers);
    await run(onDate('2026-11-04'), providers);
    await run(onDate('2026-11-05'), providers); // 7 days overdue, same week
    expect(providers.email.sent).toHaveLength(1);
  });

  test('TC14 still overdue a week later: second overdue alert', async () => {
    await carWith({ nctExpiry: '2026-10-29' });
    const providers = createFakeProviders();
    await run(NOW, providers);
    await run(onDate('2026-11-06'), providers); // 8 days overdue
    expect(providers.email.sent).toHaveLength(2);
    expect(providers.email.sent[1].subject).toMatch(/expired 8 days ago/);
    expect(await offsetsSent()).toEqual([-1, -8]);
  });

  test('TC15 date renewed: overdue alerts stop and reminders follow the new date', async () => {
    const { vehicle } = await carWith({ nctExpiry: '2026-10-29' });
    const providers = createFakeProviders();
    await run(NOW, providers);

    await Vehicle.updateOne({ _id: vehicle._id }, { nctExpiry: parseDateOnly('2027-10-29') });
    await run(onDate('2026-11-06'), providers);
    expect(providers.email.sent).toHaveLength(1);

    await run(onDate('2027-09-29'), providers); // 30 days before the new date
    expect(providers.email.sent).toHaveLength(2);
    expect(providers.email.sent[1].subject).toMatch(/expires in 30 days/);
  });

  test('TC16 overdue alerts turned off: nothing for past dates', async () => {
    await carWith({ nctExpiry: '2026-10-29' });
    const providers = createFakeProviders();
    await run(NOW, providers, { overdueAlerts: false });
    expect(providers.email.calls).toBe(0);
    expect(await Notification.countDocuments()).toBe(0);
  });

  test('TC17 OVERDUE_REPEAT_DAYS=0: only one overdue alert ever', async () => {
    await carWith({ nctExpiry: '2026-10-29' });
    const providers = createFakeProviders();
    for (const day of ['2026-11-01', '2026-11-06', '2026-11-30']) {
      await run(onDate(day), providers, { overdueRepeatDays: 0 });
    }
    expect(providers.email.sent).toHaveLength(1);
  });
});

describe('failed NCT', () => {
  const failed = (testDate, extra = {}) => ({ nctLastTestDate: testDate, nctLastResult: 'failed', ...extra });

  test('TC28 NCT failed today: retest reminder straight away', async () => {
    await carWith(failed('2026-11-01'));
    const providers = createFakeProviders();
    await run(NOW, providers);

    const message = providers.email.sent[0];
    expect(message.subject).toBe('CheckMate: 191-D-12345 failed its NCT - book your retest');
    expect(message.text).toMatch(/failed its NCT on 1 Nov 2026/);
    expect(message.text).toMatch(/Book your retest by 1 Dec 2026 \(30 days left\)/);
    expect(await Notification.findOne().lean()).toMatchObject({ kind: 'nctRetest', offsetDays: 0 });
  });

  test('TC29 still not retested: reminded again once a week', async () => {
    await carWith(failed('2026-10-29'));
    const providers = createFakeProviders();
    await run(NOW, providers); // 3 days after the test
    await run(onDate('2026-11-04'), providers); // 6 days - same week
    await run(onDate('2026-11-05'), providers); // 7 days - next reminder

    expect(providers.email.sent).toHaveLength(2);
    expect(providers.email.sent[1].text).toMatch(/Book your retest by 28 Nov 2026 \(23 days left\)/);
  });

  test('TC30 marked as passed: retest reminders stop', async () => {
    const { vehicle } = await carWith(failed('2026-10-29', { nctExpiry: '2027-11-05' }));
    const providers = createFakeProviders();
    await run(NOW, providers);

    await Vehicle.updateOne({ _id: vehicle._id }, { nctLastResult: 'passed' });
    await run(onDate('2026-11-05'), providers);
    await run(onDate('2026-11-12'), providers);

    expect(providers.email.sent).toHaveLength(1);
  });

  test('TC31 failed NCT replaces the normal NCT expiry reminder', async () => {
    await carWith(failed('2026-10-29', { nctExpiry: '2026-11-08' }));
    const providers = createFakeProviders();
    await run(NOW, providers);

    expect(providers.email.sent).toHaveLength(1);
    expect(providers.email.sent[0].subject).toMatch(/failed its NCT/);
  });

  test('TC32 retest period over: told to book a new test', async () => {
    await carWith(failed('2026-09-20'));
    const providers = createFakeProviders();
    await run(NOW, providers);

    expect(providers.email.sent[0].text).toMatch(
      /The 30-day retest period ended on 20 Oct 2026\. Please book a new NCT test\./
    );
  });

  test('TC33 failed again on the retest: reminders start over from the new test date', async () => {
    const { vehicle } = await carWith(failed('2026-10-29'));
    const providers = createFakeProviders();
    await run(NOW, providers);

    await Vehicle.updateOne({ _id: vehicle._id }, { nctLastTestDate: parseDateOnly('2026-11-03') });
    await run(onDate('2026-11-03'), providers);

    expect(providers.email.sent).toHaveLength(2);
    expect(providers.email.sent[1].text).toMatch(/Book your retest by 3 Dec 2026 \(30 days left\)/);
  });

  test('TC34 retest reminders turned off: normal NCT reminders are used', async () => {
    await carWith(failed('2026-10-29', { nctExpiry: '2026-11-08' }));
    const providers = createFakeProviders();
    await run(NOW, providers, { nctRetestReminders: false });

    expect(providers.email.sent).toHaveLength(1);
    expect(providers.email.sent[0].subject).toBe('CheckMate reminder: NCT for 191-D-12345 expires in 7 days');
  });

  test('a retest reminder that failed to send is cancelled once the NCT is passed', async () => {
    const { vehicle } = await carWith(failed('2026-10-29'));
    await run(NOW, createFakeProviders({ email: { alwaysFail: true } }));

    await Vehicle.updateOne({ _id: vehicle._id }, { nctLastResult: 'passed' });
    const providers = createFakeProviders();
    const delivery = await processDueNotifications({ now: minutesLater(20), providers });

    expect(delivery.cancelled).toBe(1);
    expect(providers.email.calls).toBe(0);
  });
});

describe('notification preferences', () => {
  test('TC18 email only: one email, no SMS', async () => {
    await carWith({ nctExpiry: '2026-11-08' }, { emailNotifications: true, smsNotifications: false });
    const providers = createFakeProviders();
    await run(NOW, providers);
    expect(providers.email.sent).toHaveLength(1);
    expect(providers.sms.sent).toHaveLength(0);
  });

  test('TC19 SMS only: one SMS, no email', async () => {
    await carWith({ nctExpiry: '2026-11-08' }, { emailNotifications: false, smsNotifications: true });
    const providers = createFakeProviders();
    await run(NOW, providers);
    expect(providers.email.sent).toHaveLength(0);
    expect(providers.sms.sent).toHaveLength(1);
    expect(providers.sms.sent[0]).toEqual({
      to: '+353871234567',
      text: 'CheckMate: NCT for 191-D-12345 expires in 7 days (8 Nov 2026).',
    });
  });

  test('TC20 email and SMS: one of each', async () => {
    await carWith({ nctExpiry: '2026-11-08' }, { emailNotifications: true, smsNotifications: true });
    const providers = createFakeProviders();
    await run(NOW, providers);
    expect(providers.email.sent).toHaveLength(1);
    expect(providers.sms.sent).toHaveLength(1);
  });

  test('TC21 SMS turned on but no phone number: email only, SMS skipped', async () => {
    await carWith({ nctExpiry: '2026-11-08' }, { phone: null, emailNotifications: true, smsNotifications: true });
    const providers = createFakeProviders();
    const result = await run(NOW, providers);
    expect(result.queued.skippedMissingContact).toBe(1);
    expect(providers.email.sent).toHaveLength(1);
    expect(providers.sms.calls).toBe(0);
  });

  test('TC22 all notifications off: nothing sent', async () => {
    await carWith({ nctExpiry: '2026-11-08' }, { emailNotifications: false, smsNotifications: false });
    const providers = createFakeProviders();
    await run(NOW, providers);
    expect(providers.email.calls + providers.sms.calls).toBe(0);
    expect(await Notification.countDocuments()).toBe(0);
  });
});

describe('delivery', () => {
  test('TC23 sending fails once: retried after 15 minutes and sent', async () => {
    await carWith({ nctExpiry: '2026-11-08' });
    const providers = createFakeProviders({ email: { failTimes: 1 } });

    const first = await run(NOW, providers);
    expect(first.delivery.retryScheduled).toBe(1);
    let record = await Notification.findOne().lean();
    expect(record).toMatchObject({ status: 'failed', attempts: 1, lastError: 'Simulated provider outage' });
    expect(record.nextAttemptAt.toISOString()).toBe(minutesLater(15).toISOString());

    expect((await processDueNotifications({ now: minutesLater(5), providers })).processed).toBe(0);
    expect((await processDueNotifications({ now: minutesLater(16), providers })).sent).toBe(1);

    record = await Notification.findOne().lean();
    expect(record).toMatchObject({ status: 'sent', attempts: 2, lastError: null });
    expect(providers.email.sent).toHaveLength(1);
  });

  test('TC24 sending keeps failing: gives up after 3 attempts', async () => {
    await carWith({ nctExpiry: '2026-11-08' });
    const providers = createFakeProviders({ email: { alwaysFail: true } });

    await run(NOW, providers, { maxAttempts: 3 });
    await processDueNotifications({ now: minutesLater(16), providers, maxAttempts: 3 });
    const last = await processDueNotifications({ now: minutesLater(50), providers, maxAttempts: 3 });
    expect(last.failed).toBe(1);
    expect(await Notification.findOne().lean()).toMatchObject({ status: 'failed', attempts: 3, nextAttemptAt: null });

    await run(onDate('2026-11-02'), providers, { maxAttempts: 3 });
    expect(providers.email.calls).toBe(3);
    expect(await Notification.countDocuments()).toBe(1);
  });

  test('TC25 due-today reminder never got through: cancelled next day, overdue alert sent instead', async () => {
    await carWith({ nctExpiry: '2026-11-01' });
    await run(NOW, createFakeProviders({ email: { alwaysFail: true } }));

    const providers = createFakeProviders();
    const result = await run(onDate('2026-11-02'), providers);

    expect(result.delivery).toMatchObject({ cancelled: 1, sent: 1 });
    expect(providers.email.sent).toHaveLength(1);
    expect(providers.email.sent[0].subject).toMatch(/expired yesterday/);
  });

  test('TC26 five checks at the same time: each notification sent exactly once', async () => {
    const users = await Promise.all([
      createUser({ emailNotifications: true, smsNotifications: true }),
      createUser({ emailNotifications: true, smsNotifications: false }),
      createUser({ emailNotifications: false, smsNotifications: true }),
    ]);
    for (const user of users) {
      await createVehicle(user, { nctExpiry: '2026-11-08', insuranceExpiry: '2026-10-29' });
    }
    const providers = createFakeProviders();

    const results = await Promise.all(Array.from({ length: 5 }, () => run(NOW, providers)));

    // 4 channels in total x 2 deadlines = 8 notifications
    const queued = results.reduce((sum, r) => sum + r.queued.remindersQueued, 0);
    const sent = results.reduce((sum, r) => sum + r.delivery.sent, 0);
    expect(queued).toBe(8);
    expect(sent).toBe(8);
    expect(await Notification.countDocuments()).toBe(8);
    expect(providers.email.sent.length + providers.sms.sent.length).toBe(8);
  });

  test('TC27 "today" is the Irish date, not the UTC date', async () => {
    // 23:30 UTC on 31 July is 00:30 on 1 August in Dublin (summer time)
    await carWith({ nctExpiry: '2026-08-01' });
    const providers = createFakeProviders();
    const result = await run(new Date('2026-07-31T23:30:00Z'), providers);
    expect(result.queued.date).toBe('2026-08-01');
    expect(providers.email.sent[0].subject).toMatch(/expires today/);
  });
});

describe('other checks', () => {
  test('a car with no dates gets nothing', async () => {
    const user = await createUser();
    await createVehicle(user);
    const result = await run(NOW, createFakeProviders());
    expect(result.queued.remindersQueued).toBe(0);
  });

  test('a car saved without make/model still gets a readable message', async () => {
    await carWith({ nctExpiry: '2026-11-08', make: undefined, model: undefined });
    const providers = createFakeProviders();
    await run(NOW, providers);
    expect(providers.email.sent[0].text).toMatch(/The NCT for your vehicle 191-D-12345 expires in 7 days/);
  });

  test('each deadline on a car gets its own notification', async () => {
    await carWith({
      nctExpiry: '2026-11-08',
      motorTaxExpiry: '2026-11-01',
      insuranceExpiry: '2026-10-29',
      nextServiceDate: '2026-11-15',
    });
    const providers = createFakeProviders();
    await run(NOW, providers);

    const records = await Notification.find().lean();
    expect(records.map((n) => n.deadlineType).sort()).toEqual(['insurance', 'motorTax', 'nct', 'service']);
    expect(records.find((n) => n.deadlineType === 'insurance').kind).toBe('overdue');
  });

  test('moving a date sooner gives a reminder for the new date', async () => {
    const { vehicle } = await carWith({ nctExpiry: '2026-11-08' });
    const providers = createFakeProviders();
    await run(NOW, providers);
    await Vehicle.updateOne({ _id: vehicle._id }, { nctExpiry: parseDateOnly('2026-11-05') });
    await run(minutesLater(5), providers);
    expect(providers.email.sent).toHaveLength(2);
    expect(providers.email.sent[1].subject).toMatch(/in 4 days/);
  });

  test('a failed reminder for an old date is cancelled instead of retried', async () => {
    const { vehicle } = await carWith({ nctExpiry: '2026-11-08' });
    await run(NOW, createFakeProviders({ email: { alwaysFail: true } }));

    await Vehicle.updateOne({ _id: vehicle._id }, { nctExpiry: parseDateOnly('2027-11-08') });
    const providers = createFakeProviders();
    const delivery = await processDueNotifications({ now: minutesLater(20), providers });

    expect(delivery.cancelled).toBe(1);
    expect(providers.email.calls).toBe(0);
  });

  test('changing the date back brings the cancelled reminder back', async () => {
    const { vehicle } = await carWith({ nctExpiry: '2026-11-08' });
    await run(NOW, createFakeProviders({ email: { alwaysFail: true } }));
    await Vehicle.updateOne({ _id: vehicle._id }, { nctExpiry: parseDateOnly('2027-11-08') });
    await processDueNotifications({ now: minutesLater(20), providers: createFakeProviders() });

    await Vehicle.updateOne({ _id: vehicle._id }, { nctExpiry: parseDateOnly('2026-11-08') });
    const providers = createFakeProviders();
    const result = await run(minutesLater(30), providers);

    expect(result.queued.reactivated).toBe(1);
    expect(providers.email.sent).toHaveLength(1);
  });

  test('a deleted car cancels its pending notifications', async () => {
    const { vehicle } = await carWith({ nctExpiry: '2026-11-08' });
    await run(NOW, createFakeProviders({ email: { alwaysFail: true } }));
    await Vehicle.deleteOne({ _id: vehicle._id });
    const delivery = await processDueNotifications({ now: minutesLater(20), providers: createFakeProviders() });
    expect(delivery.cancelled).toBe(1);
  });

  test('turning SMS off after a reminder was queued skips it', async () => {
    const { user } = await carWith({ nctExpiry: '2026-11-08' }, { emailNotifications: false, smsNotifications: true });
    await run(NOW, createFakeProviders({ sms: { alwaysFail: true } }));

    await User.updateOne({ _id: user._id }, { smsNotifications: false });
    const providers = createFakeProviders();
    const delivery = await processDueNotifications({ now: minutesLater(20), providers });

    expect(delivery.skipped).toBe(1);
    expect(providers.sms.calls).toBe(0);
  });

  test('a send interrupted by a crash is picked up again once its lock expires', async () => {
    await carWith({ nctExpiry: '2026-11-08' });
    await queueDueReminders({ now: NOW, offsets: OFFSETS });
    await Notification.updateOne({}, { status: 'sending', attempts: 1, lockedUntil: minutesLater(10) });

    const providers = createFakeProviders();
    expect((await processDueNotifications({ now: minutesLater(5), providers })).processed).toBe(0);
    expect((await processDueNotifications({ now: minutesLater(11), providers })).sent).toBe(1);
  });

  test('parallel senders never send the same notification twice', async () => {
    const user = await createUser({ emailNotifications: true, smsNotifications: true });
    for (let i = 0; i < 10; i += 1) {
      await createVehicle(user, { nctExpiry: '2026-11-08' });
    }
    await queueDueReminders({ now: NOW, offsets: OFFSETS });
    const providers = createFakeProviders();

    await Promise.all(Array.from({ length: 4 }, () => processDueNotifications({ now: NOW, providers })));

    expect(providers.email.sent).toHaveLength(10);
    expect(providers.sms.sent).toHaveLength(10);
    expect(await Notification.countDocuments({ status: 'sent', attempts: 1 })).toBe(20);
  });

  test('dry run is used by default and records are marked as dry runs', async () => {
    await carWith({ nctExpiry: '2026-11-08' });
    const result = await runReminderCycle({ now: NOW, offsets: OFFSETS });
    expect(result.delivery.sent).toBe(1);
    const record = await Notification.findOne().lean();
    expect(record.dryRun).toBe(true);
    expect(record.providerMessageId).toMatch(/^dry-run-/);
  });
});

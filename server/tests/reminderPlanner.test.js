const {
  selectReminderOffset,
  retestOffset,
  planVehicleReminders,
  resolveChannels,
} = require('../src/services/reminders/reminderPlanner');
const { parseDateOnly } = require('../src/utils/dates');

const OFFSETS = [30, 14, 7, 1, 0];
const WEEKLY = { enabled: true, repeatDays: 7 };
const TODAY = parseDateOnly('2026-11-01');

describe('selectReminderOffset - upcoming', () => {
  test.each([
    [45, null],
    [31, null],
    [30, 30],
    [20, 30],
    [14, 14],
    [10, 14],
    [7, 7],
    [2, 7],
    [1, 1],
    [0, 0], // due today
  ])('%p days left -> %p', (daysLeft, expected) => {
    expect(selectReminderOffset(daysLeft, OFFSETS, WEEKLY)).toBe(expected);
  });

  test('without 0 in the offsets, due today falls in the 1-day window', () => {
    expect(selectReminderOffset(0, [30, 14, 7, 1], WEEKLY)).toBe(1);
  });
});

describe('selectReminderOffset - overdue', () => {
  test.each([
    [-1, -1],
    [-7, -1],
    [-8, -8],
    [-14, -8],
    [-15, -15],
    [-30, -29],
  ])('weekly: %p days left -> %p', (daysLeft, expected) => {
    expect(selectReminderOffset(daysLeft, OFFSETS, WEEKLY)).toBe(expected);
  });

  test('repeatDays 0 gives a single overdue window', () => {
    const once = { enabled: true, repeatDays: 0 };
    expect(selectReminderOffset(-1, OFFSETS, once)).toBe(-1);
    expect(selectReminderOffset(-60, OFFSETS, once)).toBe(-1);
  });

  test('disabled overdue alerts give nothing', () => {
    expect(selectReminderOffset(-3, OFFSETS, { enabled: false })).toBeNull();
    expect(selectReminderOffset(-3, OFFSETS)).toBeNull();
  });
});

describe('planVehicleReminders', () => {
  test('plans each deadline separately and ignores missing or far-away dates', () => {
    const vehicle = {
      nctExpiry: parseDateOnly('2026-11-08'), // 7 days
      motorTaxExpiry: parseDateOnly('2026-10-31'), // 1 day overdue
      insuranceExpiry: null,
      nextServiceDate: parseDateOnly('2027-03-01'), // too far away
    };
    const plans = planVehicleReminders(vehicle, TODAY, OFFSETS, WEEKLY);
    expect(plans).toHaveLength(2);
    expect(plans[0]).toMatchObject({ deadlineType: 'nct', daysUntilDue: 7, offsetDays: 7, kind: 'upcoming' });
    expect(plans[1]).toMatchObject({ deadlineType: 'motorTax', daysUntilDue: -1, offsetDays: -1, kind: 'overdue' });
  });
});

describe('failed NCT planning', () => {
  const RETEST = { enabled: true, repeatDays: 7 };

  test.each([
    [0, 0],
    [6, 0],
    [7, 7],
    [20, 14],
  ])('retestOffset: %p days since the test -> %p', (days, expected) => {
    expect(retestOffset(days, 7)).toBe(expected);
  });

  test('repeatDays 0 gives a single retest reminder', () => {
    expect(retestOffset(40, 0)).toBe(0);
  });

  test('a failed NCT gives a retest plan instead of the normal NCT plan', () => {
    const vehicle = {
      nctExpiry: parseDateOnly('2026-11-08'),
      nctLastTestDate: parseDateOnly('2026-10-29'),
      nctLastResult: 'failed',
    };
    const plans = planVehicleReminders(vehicle, TODAY, OFFSETS, WEEKLY, RETEST);
    expect(plans).toEqual([
      expect.objectContaining({ deadlineType: 'nctRetest', daysUntilDue: -3, offsetDays: 0, kind: 'nctRetest' }),
    ]);
  });

  test('a passed NCT or a test date in the future gives no retest plan', () => {
    const passed = { nctLastTestDate: parseDateOnly('2026-10-29'), nctLastResult: 'passed' };
    const future = { nctLastTestDate: parseDateOnly('2026-11-05'), nctLastResult: 'failed' };
    expect(planVehicleReminders(passed, TODAY, OFFSETS, WEEKLY, RETEST)).toEqual([]);
    expect(planVehicleReminders(future, TODAY, OFFSETS, WEEKLY, RETEST)).toEqual([]);
  });
});

describe('resolveChannels', () => {
  test('email only', () => {
    const result = resolveChannels({ email: 'a@b.ie', phone: '+353871234567', emailNotifications: true, smsNotifications: false });
    expect(result).toEqual({ channels: ['email'], skipped: [] });
  });

  test('SMS only', () => {
    const result = resolveChannels({ email: 'a@b.ie', phone: '+353871234567', emailNotifications: false, smsNotifications: true });
    expect(result).toEqual({ channels: ['sms'], skipped: [] });
  });

  test('email and SMS', () => {
    const result = resolveChannels({ email: 'a@b.ie', phone: '+353871234567', emailNotifications: true, smsNotifications: true });
    expect(result.channels).toEqual(['email', 'sms']);
  });

  test('SMS wanted but phone missing is skipped', () => {
    const result = resolveChannels({ email: 'a@b.ie', phone: null, emailNotifications: true, smsNotifications: true });
    expect(result.channels).toEqual(['email']);
    expect(result.skipped).toEqual([{ channel: 'sms', reason: 'missing phone number' }]);
  });

  test('everything turned off', () => {
    const result = resolveChannels({ email: 'a@b.ie', phone: null, emailNotifications: false, smsNotifications: false });
    expect(result).toEqual({ channels: [], skipped: [] });
  });

  test('missing user', () => {
    expect(resolveChannels(null)).toEqual({ channels: [], skipped: [] });
  });
});

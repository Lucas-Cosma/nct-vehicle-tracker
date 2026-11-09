const { loadConfig, parseReminderDays } = require('../src/config/env');

describe('REMINDER_DAYS_BEFORE parsing', () => {
  test('parses, de-duplicates and sorts descending', () => {
    expect(parseReminderDays('30,14,7,1,0')).toEqual([30, 14, 7, 1, 0]);
    expect(parseReminderDays(' 7, 30 ,7,14 ')).toEqual([30, 14, 7]);
  });

  test.each(['abc', '-1', '7.5', '', ',,', '400'])('rejects invalid value %p', (value) => {
    expect(() => parseReminderDays(value)).toThrow(/REMINDER_DAYS_BEFORE/);
  });
});

describe('overdue settings', () => {
  test('overdue alerts are on and weekly by default', () => {
    const config = loadConfig({ NODE_ENV: 'development' });
    expect(config.overdueAlerts).toBe(true);
    expect(config.overdueRepeatDays).toBe(7);
    expect(config.reminderDaysBefore).toEqual([30, 14, 7, 1, 0]);
  });

  test('OVERDUE_REPEAT_DAYS=0 is allowed (one alert only), negatives are not', () => {
    expect(loadConfig({ OVERDUE_REPEAT_DAYS: '0' }).overdueRepeatDays).toBe(0);
    expect(() => loadConfig({ OVERDUE_REPEAT_DAYS: '-7' })).toThrow(/OVERDUE_REPEAT_DAYS/);
  });
});

describe('dry-run safety', () => {
  test('DRY_RUN defaults to true', () => {
    expect(loadConfig({ NODE_ENV: 'development' }).dryRun).toBe(true);
  });

  test('DRY_RUN=false is ignored during tests', () => {
    expect(loadConfig({ NODE_ENV: 'test', DRY_RUN: 'false' }).dryRun).toBe(true);
  });

  test('DRY_RUN=false is respected outside tests', () => {
    expect(loadConfig({ NODE_ENV: 'development', DRY_RUN: 'false' }).dryRun).toBe(false);
  });

  test('invalid boolean values are rejected', () => {
    expect(() => loadConfig({ DRY_RUN: 'maybe' })).toThrow();
  });
});

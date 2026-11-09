const {
  parseDateOnly,
  isDateOnly,
  formatDateOnly,
  todayStringInTimeZone,
  daysBetween,
  formatHumanDate,
} = require('../src/utils/dates');

describe('parseDateOnly', () => {
  test('parses a valid YYYY-MM-DD date as midnight UTC', () => {
    const date = parseDateOnly('2026-11-08');
    expect(date.toISOString()).toBe('2026-11-08T00:00:00.000Z');
    expect(isDateOnly(date)).toBe(true);
    expect(formatDateOnly(date)).toBe('2026-11-08');
  });

  test('accepts 29 February in a leap year', () => {
    expect(parseDateOnly('2028-02-29')).not.toBeNull();
  });

  test.each([
    ['2026-02-30'], // no such day
    ['2027-02-29'], // not a leap year
    ['2026-13-01'], // no 13th month
    ['2026-04-31'],
    ['2026-1-5'], // missing zero padding
    ['08/11/2026'],
    ['tomorrow'],
    [''],
    ['2026-11-08T10:00:00Z'], // includes a time
  ])('rejects invalid date %p', (value) => {
    expect(parseDateOnly(value)).toBeNull();
  });

  test('rejects non-strings', () => {
    expect(parseDateOnly(20261108)).toBeNull();
    expect(parseDateOnly(null)).toBeNull();
    expect(parseDateOnly(new Date())).toBeNull();
  });
});

describe('Europe/Dublin "today"', () => {
  test('in summer (IST, UTC+1) 23:30 UTC is already the next day in Dublin', () => {
    expect(todayStringInTimeZone(new Date('2026-06-30T23:30:00Z'))).toBe('2026-07-01');
  });

  test('in winter (GMT, UTC+0) 23:30 UTC is the same day in Dublin', () => {
    expect(todayStringInTimeZone(new Date('2026-12-31T23:30:00Z'))).toBe('2026-12-31');
  });

  test('day counting across the October clock change is exact', () => {
    // Clocks go back on 25 Oct 2026; the difference must still be whole days.
    expect(daysBetween(parseDateOnly('2026-10-20'), parseDateOnly('2026-10-30'))).toBe(10);
    expect(daysBetween(parseDateOnly('2026-03-25'), parseDateOnly('2026-04-01'))).toBe(7);
  });

  test('days until a past date is negative', () => {
    expect(daysBetween(parseDateOnly('2026-11-01'), parseDateOnly('2026-10-31'))).toBe(-1);
  });
});

test('formatHumanDate', () => {
  expect(formatHumanDate(parseDateOnly('2026-11-08'))).toBe('8 Nov 2026');
});

// Date helpers.
// Deadlines are date-only, stored as midnight UTC ("2026-11-08" -> 2026-11-08T00:00:00Z).
// "Today" comes from the Europe/Dublin calendar and is converted the same way,
// so day differences are always whole numbers, even across clock changes.
const DEFAULT_TIMEZONE = 'Europe/Dublin';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// "2026-11-08" -> Date at midnight UTC, or null if invalid (e.g. "2026-02-30")
function parseDateOnly(value) {
  if (typeof value !== 'string') return null;
  const match = DATE_ONLY_PATTERN.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  // JS turns 31 April into 1 May, so check the parts still match
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
}

// valid Date at exactly midnight UTC
function isDateOnly(value) {
  return (
    value instanceof Date &&
    !Number.isNaN(value.getTime()) &&
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0
  );
}

// Date -> "2026-11-08"
function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

// today's date in the given timezone as "YYYY-MM-DD"
function todayStringInTimeZone(now = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// same, but as a midnight-UTC Date
function todayDateInTimeZone(now = new Date(), timeZone = DEFAULT_TIMEZONE) {
  return parseDateOnly(todayStringInTimeZone(now, timeZone));
}

// whole days between two date-only values (negative if toDate is earlier)
function daysBetween(fromDate, toDate) {
  return Math.round((toDate.getTime() - fromDate.getTime()) / MS_PER_DAY);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

// Date -> "8 Nov 2026"
function formatHumanDate(date) {
  return new Intl.DateTimeFormat('en-IE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

module.exports = {
  DEFAULT_TIMEZONE,
  parseDateOnly,
  isDateOnly,
  formatDateOnly,
  todayStringInTimeZone,
  todayDateInTimeZone,
  daysBetween,
  addDays,
  formatHumanDate,
};

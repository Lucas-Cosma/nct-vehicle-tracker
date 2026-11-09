// Date logic for reminders. No database access or sending in here.
const { DEADLINES } = require('../../config/deadlines');
const { daysBetween } = require('../../utils/dates');

// Which reminder window a deadline is in.
//
// Before the date, with offsets [30, 14, 7, 1, 0]:
//   45 days left -> null, 20 -> 30, 10 -> 14, 1 -> 1, 0 (today) -> 0
// Uses <= rather than === so a reminder still goes out if the exact day was missed.
//
// After the date (overdue) the window is negative. With repeatDays 7:
//   1-7 days overdue -> -1, 8-14 -> -8, 15-21 -> -15 ... so one alert per week.
// repeatDays 0 means only one overdue alert.
function selectReminderOffset(daysUntilDue, offsets, overdue = { enabled: false }) {
  if (!Number.isInteger(daysUntilDue)) return null;
  if (daysUntilDue < 0) return overdueOffset(-daysUntilDue, overdue);
  const matching = offsets.filter((offset) => daysUntilDue <= offset);
  return matching.length ? Math.min(...matching) : null;
}

function overdueOffset(daysOverdue, { enabled, repeatDays = 0 }) {
  if (!enabled) return null;
  if (!repeatDays) return -1;
  return -(1 + Math.floor((daysOverdue - 1) / repeatDays) * repeatDays);
}

// Days since a failed NCT -> reminder window. With repeatDays 7: days 0-6 -> 0, 7-13 -> 7 ...
// repeatDays 0 means only one reminder.
function retestOffset(daysSinceTest, repeatDays) {
  return repeatDays ? Math.floor(daysSinceTest / repeatDays) * repeatDays : 0;
}

function isValidDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

// reminders due today for one vehicle
function planVehicleReminders(vehicle, today, offsets, overdue, retest = { enabled: false }) {
  const plans = [];
  // a failed NCT gets retest reminders instead of the normal NCT ones
  const nctFailed = Boolean(retest.enabled) && vehicle.nctLastResult === 'failed' && isValidDate(vehicle.nctLastTestDate);

  for (const deadline of DEADLINES) {
    if (nctFailed && deadline.type === 'nct') continue;
    const dueDate = vehicle[deadline.field];
    if (!isValidDate(dueDate)) continue;

    const daysUntilDue = daysBetween(today, dueDate);
    const offsetDays = selectReminderOffset(daysUntilDue, offsets, overdue);
    if (offsetDays === null) continue;

    plans.push({
      deadlineType: deadline.type,
      field: deadline.field,
      dueDate,
      daysUntilDue,
      offsetDays,
      kind: offsetDays < 0 ? 'overdue' : 'upcoming',
    });
  }

  if (nctFailed) {
    const daysSinceTest = daysBetween(vehicle.nctLastTestDate, today);
    if (daysSinceTest >= 0) {
      plans.push({
        deadlineType: 'nctRetest',
        field: 'nctLastTestDate',
        dueDate: vehicle.nctLastTestDate,
        daysUntilDue: -daysSinceTest,
        offsetDays: retestOffset(daysSinceTest, retest.repeatDays),
        kind: 'nctRetest',
      });
    }
  }
  return plans;
}

// reason a channel can't be used for this user, or null if it can
function getChannelProblem(user, channel) {
  if (!user) return 'user not found';
  if (channel === 'email') {
    if (!user.emailNotifications) return 'email notifications are turned off';
    if (!user.email) return 'missing email address';
    return null;
  }
  if (channel === 'sms') {
    if (!user.smsNotifications) return 'SMS notifications are turned off';
    if (!user.phone) return 'missing phone number';
    return null;
  }
  return `unknown channel "${channel}"`;
}

// channels to use for a user; skipped = turned on but missing the contact details
function resolveChannels(user) {
  const channels = [];
  const skipped = [];
  if (!user) return { channels, skipped };

  for (const [channel, wanted] of [
    ['email', user.emailNotifications],
    ['sms', user.smsNotifications],
  ]) {
    if (!wanted) continue;
    const problem = getChannelProblem(user, channel);
    if (problem) skipped.push({ channel, reason: problem });
    else channels.push(channel);
  }
  return { channels, skipped };
}

module.exports = { selectReminderOffset, retestOffset, planVehicleReminders, resolveChannels, getChannelProblem };

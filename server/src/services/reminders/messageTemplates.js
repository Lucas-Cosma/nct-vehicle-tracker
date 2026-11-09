const { DEADLINES_BY_TYPE } = require('../../config/deadlines');
const { formatHumanDate, addDays } = require('../../utils/dates');

function describeTiming(daysUntilDue) {
  if (daysUntilDue === 0) return 'today';
  if (daysUntilDue === 1) return 'tomorrow';
  if (daysUntilDue === -1) return 'yesterday';
  if (daysUntilDue < 0) return `${-daysUntilDue} days ago`;
  return `in ${daysUntilDue} days`;
}

// "191-D-12345 (Toyota Corolla)", or just the registration if make/model aren't saved
function describeCar(vehicle) {
  const name = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
  return name ? `${vehicle.registration} (${name})` : vehicle.registration;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

// dueDate is the date of the failed test
function buildRetestMessage({ dueDate, daysUntilDue, vehicle, retestWindowDays = 30 }) {
  const daysSinceTest = -daysUntilDue;
  const daysLeft = retestWindowDays - daysSinceTest;
  const testText = formatHumanDate(dueDate);
  const deadlineText = formatHumanDate(addDays(dueDate, retestWindowDays));
  const car = describeCar(vehicle);

  let advice;
  if (daysLeft > 0) {
    advice = `Book your retest by ${deadlineText} (${plural(daysLeft, 'day')} left).`;
  } else if (daysLeft === 0) {
    advice = `Today (${deadlineText}) is the last day of the ${retestWindowDays}-day retest period.`;
  } else {
    advice = `The ${retestWindowDays}-day retest period ended on ${deadlineText}. Please book a new NCT test.`;
  }

  const subject = `CheckMate: ${vehicle.registration} failed its NCT - book your retest`;
  const text = [
    'Hi,',
    '',
    `Your vehicle ${car} failed its NCT on ${testText}.`,
    advice,
    '',
    'Once it passes, mark the NCT as passed in the CheckMate app to stop these reminders.',
    '',
    'CheckMate',
  ].join('\n');
  const sms = `CheckMate: ${vehicle.registration} failed its NCT on ${testText}. ${advice}`;

  return { subject, text, sms };
}

function buildReminderMessage({ deadlineType, dueDate, daysUntilDue, vehicle, retestWindowDays }) {
  if (deadlineType === 'nctRetest') {
    return buildRetestMessage({ dueDate, daysUntilDue, vehicle, retestWindowDays });
  }

  const deadline = DEADLINES_BY_TYPE[deadlineType];
  const overdue = daysUntilDue < 0;
  const when = describeTiming(daysUntilDue);
  const verb = overdue ? deadline.pastVerb : deadline.verb;
  const dateText = formatHumanDate(dueDate);
  const car = describeCar(vehicle);
  const headline = `${deadline.label} for ${vehicle.registration} ${verb} ${when}`;

  const subject = overdue ? `CheckMate overdue: ${headline}` : `CheckMate reminder: ${headline}`;
  const text = [
    'Hi,',
    '',
    `The ${deadline.phrase} for your vehicle ${car} ${verb} ${when}, on ${dateText}.`,
    ...(overdue ? ['', deadline.action] : []),
    '',
    'You can update this date or your notification settings in the CheckMate app.',
    '',
    'CheckMate',
  ].join('\n');
  const sms = `CheckMate: ${headline} (${dateText}).${overdue ? ` ${deadline.action}` : ''}`;

  return { subject, text, sms };
}

module.exports = { buildReminderMessage, describeTiming };

// Reminders run in two steps:
//   1. queueDueReminders - checks vehicle dates and creates Notification records
//      (unique index, so running it twice is safe)
//   2. processDueNotifications - claims records one at a time, re-checks them and sends
// `now` and `providers` can be passed in, which the tests use.
const Vehicle = require('../../models/Vehicle');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const { config } = require('../../config/env');
const { DEADLINES, DEADLINES_BY_TYPE } = require('../../config/deadlines');
const { todayDateInTimeZone, daysBetween, addDays, formatDateOnly } = require('../../utils/dates');
const { planVehicleReminders, resolveChannels, getChannelProblem } = require('./reminderPlanner');
const { buildReminderMessage } = require('./messageTemplates');
const { createNotificationProviders } = require('../notifications');
const logger = require('../../utils/logger');
const { maskRecipient } = require('../../utils/privacy');

const LOCK_MINUTES = 10;
const MAX_ERROR_LENGTH = 500;
const MS_PER_MINUTE = 60 * 1000;

// creates the Notification if it doesn't exist; returns which summary counter to bump
async function queueReminder({ vehicle, plan, channel, now }) {
  const key = {
    vehicle: vehicle._id,
    deadlineType: plan.deadlineType,
    dueDate: plan.dueDate,
    offsetDays: plan.offsetDays,
    channel,
  };

  try {
    const result = await Notification.updateOne(
      key,
      {
        $setOnInsert: {
          user: vehicle.owner._id,
          kind: plan.kind,
          status: 'pending',
          attempts: 0,
          nextAttemptAt: now,
        },
      },
      { upsert: true }
    );
    if (result.upsertedCount === 1) return 'remindersQueued';
  } catch (err) {
    // another run inserted it at the same time
    if (err.code === 11000) return 'alreadyQueued';
    throw err;
  }

  // already existed - bring it back if it was cancelled or skipped (e.g. date changed back)
  const revived = await Notification.updateOne(
    { ...key, status: { $in: ['cancelled', 'skipped'] } },
    { $set: { status: 'pending', attempts: 0, nextAttemptAt: now, lockedUntil: null, lastError: null } }
  );
  return revived.modifiedCount === 1 ? 'reactivated' : 'alreadyQueued';
}

async function queueDueReminders({
  now = new Date(),
  offsets = config.reminderDaysBefore,
  overdueAlerts = config.overdueAlerts,
  overdueRepeatDays = config.overdueRepeatDays,
  nctRetestReminders = config.nctRetestReminders,
  nctRetestRepeatDays = config.nctRetestRepeatDays,
  timeZone = config.timezone,
} = {}) {
  const today = todayDateInTimeZone(now, timeZone);
  const overdue = { enabled: overdueAlerts, repeatDays: overdueRepeatDays };
  const retest = { enabled: nctRetestReminders, repeatDays: nctRetestRepeatDays };
  const summary = {
    date: formatDateOnly(today),
    vehiclesChecked: 0,
    remindersQueued: 0,
    alreadyQueued: 0,
    reactivated: 0,
    skippedMissingContact: 0,
  };

  // only vehicles with a deadline up to the largest offset away (and from today on
  // if overdue alerts are off)
  const latest = addDays(today, Math.max(...offsets));
  const range = overdueAlerts ? { $lte: latest } : { $gte: today, $lte: latest };
  const conditions = DEADLINES.map((d) => ({ [d.field]: range }));
  if (nctRetestReminders) conditions.push({ nctLastResult: 'failed' });
  const filter = { $or: conditions };

  const cursor = Vehicle.find(filter)
    .populate('owner', 'email phone emailNotifications smsNotifications')
    .lean()
    .cursor();

  for await (const vehicle of cursor) {
    summary.vehiclesChecked += 1;
    const plans = planVehicleReminders(vehicle, today, offsets, overdue, retest);
    if (plans.length === 0) continue;

    const { channels, skipped } = resolveChannels(vehicle.owner);
    for (const skip of skipped) {
      summary.skippedMissingContact += plans.length;
      logger.info(`Skipping ${skip.channel} reminders for vehicle ${vehicle._id}: ${skip.reason}`);
    }

    for (const plan of plans) {
      for (const channel of channels) {
        const outcome = await queueReminder({ vehicle, plan, channel, now });
        summary[outcome] += 1;
      }
    }
  }

  return summary;
}

// atomically claim one notification so no other run can send it
function claimNextNotification({ now, maxAttempts }) {
  return Notification.findOneAndUpdate(
    {
      attempts: { $lt: maxAttempts },
      nextAttemptAt: { $lte: now },
      $or: [
        { status: { $in: ['pending', 'failed'] } },
        // stuck after a crash, lock expired
        { status: 'sending', lockedUntil: { $lte: now } },
      ],
    },
    {
      $set: { status: 'sending', lockedUntil: new Date(now.getTime() + LOCK_MINUTES * MS_PER_MINUTE), lastAttemptAt: now },
      $inc: { attempts: 1 },
    },
    { sort: { nextAttemptAt: 1, _id: 1 }, new: true }
  ).lean();
}

async function finish(notification, status, reason) {
  await Notification.updateOne(
    { _id: notification._id },
    { $set: { status, lastError: reason, lockedUntil: null, nextAttemptAt: null } }
  );
  logger.info(`Notification ${notification._id} ${status}: ${reason}`);
  return status === 'cancelled' ? 'cancelled' : 'skipped';
}

async function deliverNotification(
  notification,
  { now, providers, maxAttempts, retryBaseMinutes, timeZone, nctRetestReminders, nctRetestWindowDays }
) {
  const deadline = DEADLINES_BY_TYPE[notification.deadlineType];
  const [vehicle, user] = await Promise.all([
    Vehicle.findById(notification.vehicle).lean(),
    User.findById(notification.user).lean(),
  ]);

  // check again before sending - things may have changed since it was queued
  if (!vehicle || !user) {
    return finish(notification, 'cancelled', 'Vehicle or user no longer exists');
  }
  const currentDueDate = vehicle[deadline.field];
  if (!currentDueDate || currentDueDate.getTime() !== new Date(notification.dueDate).getTime()) {
    return finish(notification, 'cancelled', 'Deadline date was changed or removed');
  }
  const isRetest = notification.deadlineType === 'nctRetest';
  const nctFailed = vehicle.nctLastResult === 'failed';
  if (isRetest && !nctFailed) {
    return finish(notification, 'cancelled', 'NCT is no longer marked as failed');
  }
  if (notification.deadlineType === 'nct' && nctFailed && nctRetestReminders) {
    return finish(notification, 'cancelled', 'NCT failed - retest reminders are used instead');
  }
  const daysUntilDue = daysBetween(todayDateInTimeZone(now, timeZone), currentDueDate);
  // an upcoming reminder that didn't go out before the date is dropped - the overdue alert covers it
  if (!isRetest && notification.offsetDays >= 0 && daysUntilDue < 0) {
    return finish(notification, 'cancelled', 'Deadline has already passed');
  }
  const problem = getChannelProblem(user, notification.channel);
  if (problem) {
    return finish(notification, 'skipped', problem);
  }

  const recipient = notification.channel === 'email' ? user.email : user.phone;
  const message = buildReminderMessage({
    deadlineType: notification.deadlineType,
    dueDate: currentDueDate,
    daysUntilDue,
    vehicle,
    retestWindowDays: nctRetestWindowDays,
  });

  try {
    const provider = providers[notification.channel];
    const result =
      notification.channel === 'email'
        ? await provider.send({
            to: recipient,
            subject: message.subject,
            text: message.text,
            idempotencyKey: `checkmate-reminder-${notification._id}`,
          })
        : await provider.send({ to: recipient, text: message.sms });

    await Notification.updateOne(
      { _id: notification._id },
      {
        $set: {
          status: 'sent',
          sentAt: now,
          recipient,
          providerMessageId: (result && result.id) || null,
          dryRun: Boolean(result && result.dryRun),
          lastError: null,
          lockedUntil: null,
          nextAttemptAt: null,
        },
      }
    );
    return 'sent';
  } catch (err) {
    // back off 15, 30, 60... minutes
    const canRetry = notification.attempts < maxAttempts;
    const delayMinutes = retryBaseMinutes * 2 ** (notification.attempts - 1);
    const nextAttemptAt = canRetry ? new Date(now.getTime() + delayMinutes * MS_PER_MINUTE) : null;

    await Notification.updateOne(
      { _id: notification._id },
      {
        $set: {
          status: 'failed',
          recipient,
          lastError: String((err && err.message) || err).slice(0, MAX_ERROR_LENGTH),
          lockedUntil: null,
          nextAttemptAt,
        },
      }
    );
    logger.warn(
      `${notification.channel} to ${maskRecipient(recipient)} failed (attempt ${notification.attempts}/${maxAttempts})` +
        (canRetry ? `, retrying at ${nextAttemptAt.toISOString()}` : ', giving up')
    );
    return canRetry ? 'retryScheduled' : 'failed';
  }
}

async function processDueNotifications({
  now = new Date(),
  providers,
  maxAttempts = config.maxDeliveryAttempts,
  retryBaseMinutes = config.retryBaseMinutes,
  timeZone = config.timezone,
  nctRetestReminders = config.nctRetestReminders,
  nctRetestWindowDays = config.nctRetestWindowDays,
  limit = 500,
} = {}) {
  const activeProviders = providers || createNotificationProviders();
  const summary = { processed: 0, sent: 0, retryScheduled: 0, failed: 0, cancelled: 0, skipped: 0 };

  while (summary.processed < limit) {
    const notification = await claimNextNotification({ now, maxAttempts });
    if (!notification) break;

    summary.processed += 1;
    const outcome = await deliverNotification(notification, {
      now,
      providers: activeProviders,
      maxAttempts,
      retryBaseMinutes,
      timeZone,
      nctRetestReminders,
      nctRetestWindowDays,
    });
    summary[outcome] += 1;
  }

  return summary;
}

// daily job: queue today's reminders, then send everything due
async function runReminderCycle(options = {}) {
  const queued = await queueDueReminders(options);
  const delivery = await processDueNotifications(options);
  return { queued, delivery };
}

module.exports = { queueDueReminders, processDueNotifications, runReminderCycle };

// One record per reminder per channel. The unique index stops duplicates.
//
// Statuses:
//   pending -> sending -> sent, or failed (retried until maxAttempts)
//   cancelled - date changed/passed or vehicle deleted
//   skipped   - user turned the channel off or removed their contact details
const mongoose = require('mongoose');
const { DEADLINE_TYPES } = require('../config/deadlines');

const STATUSES = ['pending', 'sending', 'sent', 'failed', 'cancelled', 'skipped'];
const CHANNELS = ['email', 'sms'];

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    deadlineType: { type: String, enum: DEADLINE_TYPES, required: true },
    // part of the unique key, so a changed date gets its own reminders
    dueDate: { type: Date, required: true },
    // days before the due date (0 = on the day); negative = overdue alert.
    // For nctRetest it's the number of days since the failed test.
    offsetDays: { type: Number, required: true },
    kind: { type: String, enum: ['upcoming', 'overdue', 'nctRetest'], default: 'upcoming' },
    channel: { type: String, enum: CHANNELS, required: true },

    status: { type: String, enum: STATUSES, default: 'pending' },
    attempts: { type: Number, default: 0, min: 0 },
    nextAttemptAt: { type: Date, default: null },
    lockedUntil: { type: Date, default: null },
    lastAttemptAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    sentAt: { type: Date, default: null },
    recipient: { type: String, default: null },
    providerMessageId: { type: String, default: null },
    dryRun: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

notificationSchema.index(
  { vehicle: 1, deadlineType: 1, dueDate: 1, offsetDays: 1, channel: 1 },
  { unique: true, name: 'unique_reminder' }
);
notificationSchema.index({ status: 1, nextAttemptAt: 1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

module.exports = Notification;
module.exports.STATUSES = STATUSES;
module.exports.CHANNELS = CHANNELS;

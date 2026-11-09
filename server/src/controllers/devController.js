// Dev-only endpoints (need the admin key, disabled in production)
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const { config } = require('../config/env');
const { parseDateOnly, todayDateInTimeZone, addDays } = require('../utils/dates');
const { runReminderCycle } = require('../services/reminders/reminderService');

const NOON_MS = 12 * 60 * 60 * 1000;
const SAMPLE_EMAIL = 'sample@checkmate.test';
const SAMPLE_REGISTRATION = '191-D-12345';

// Sample car until the real "add a car" feature is done. Creates it (or resets it)
// with dates relative to today so every type of notification shows up:
// NCT failed 2 days ago, motor tax due today, insurance 3 days overdue, service in 30 days.
async function createSampleCar(req, res) {
  let user = await User.findOne({ email: SAMPLE_EMAIL });
  if (!user) {
    user = await User.create({
      email: SAMPLE_EMAIL,
      phone: '+353871234567',
      emailNotifications: true,
      smsNotifications: true,
    });
  }

  let vehicle = await Vehicle.findOne({ owner: user._id, registration: SAMPLE_REGISTRATION });
  const created = !vehicle;
  if (!vehicle) {
    vehicle = new Vehicle({ owner: user._id, registration: SAMPLE_REGISTRATION, make: 'Toyota', model: 'Corolla' });
  }

  const today = todayDateInTimeZone(new Date(), config.timezone);
  vehicle.set({
    nctExpiry: addDays(today, 7),
    nctLastTestDate: addDays(today, -2),
    nctLastResult: 'failed',
    motorTaxExpiry: today,
    insuranceExpiry: addDays(today, -3),
    nextServiceDate: addDays(today, 30),
  });
  await vehicle.save();

  res.status(created ? 201 : 200).json({ user, vehicle });
}

// run the reminder check now; optional { "date": "YYYY-MM-DD" } pretends it's that day
async function runReminders(req, res) {
  const body = req.body || {};
  let now = new Date();
  if (body.date !== undefined) {
    const date = parseDateOnly(body.date);
    if (!date) throw new AppError(400, 'date must be in YYYY-MM-DD format');
    now = new Date(date.getTime() + NOON_MS);
  }
  const result = await runReminderCycle({ now });
  res.json({ simulatedNow: now.toISOString(), result });
}

async function listNotifications(req, res) {
  const filter = {};
  if (req.query.status) {
    if (!Notification.STATUSES.includes(req.query.status)) {
      throw new AppError(400, `status must be one of: ${Notification.STATUSES.join(', ')}`);
    }
    filter.status = req.query.status;
  }
  const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ notifications });
}

module.exports = { createSampleCar, runReminders, listNotifications };

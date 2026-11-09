const User = require('../models/User');
const AppError = require('../utils/AppError');
const { validatePreferencesInput } = require('../utils/validators');

function toPreferences(user) {
  return {
    email: user.email,
    phone: user.phone || null,
    emailNotifications: user.emailNotifications,
    smsNotifications: user.smsNotifications,
  };
}

// warn if a channel is on but can't actually be used
function preferenceWarnings(user) {
  const warnings = [];
  if (user.smsNotifications && !user.phone) {
    warnings.push('SMS reminders are turned on but no phone number is saved, so SMS reminders will be skipped.');
  }
  if (!user.emailNotifications && !user.smsNotifications) {
    warnings.push('All reminders are turned off.');
  }
  return warnings;
}

async function getPreferences(req, res) {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError(404, 'User not found');
  res.json({ preferences: toPreferences(user), warnings: preferenceWarnings(user) });
}

async function updatePreferences(req, res) {
  const data = validatePreferencesInput(req.body);
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError(404, 'User not found');

  user.set(data);
  await user.save();
  res.json({ preferences: toPreferences(user), warnings: preferenceWarnings(user) });
}

module.exports = { getPreferences, updatePreferences };

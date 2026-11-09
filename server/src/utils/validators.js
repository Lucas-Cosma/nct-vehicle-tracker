// Request body validation. Returns the cleaned fields, or throws a 400 listing every error.
const AppError = require('./AppError');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// E.164 format, e.g. +353871234567 (Twilio needs this)
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

const PREFERENCE_FIELDS = ['email', 'phone', 'emailNotifications', 'smsNotifications'];

function isMissing(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function ensurePlainObject(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'Request body must be a JSON object');
  }
}

function validatePreferencesInput(body) {
  ensurePlainObject(body);
  const errors = [];
  const value = {};

  for (const key of Object.keys(body)) {
    if (!PREFERENCE_FIELDS.includes(key)) {
      errors.push({ field: key, message: `Unknown field "${key}"` });
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'email')) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
      errors.push({ field: 'email', message: 'email must be a valid email address' });
    } else {
      value.email = email;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'phone')) {
    if (body.phone === null || body.phone === '') {
      value.phone = null; // removes the phone number
    } else {
      const phone = typeof body.phone === 'string' ? body.phone.replace(/[\s()-]/g, '') : '';
      if (!E164_PATTERN.test(phone)) {
        errors.push({
          field: 'phone',
          message: 'phone must be in international format, e.g. +353871234567',
        });
      } else {
        value.phone = phone;
      }
    }
  }

  for (const field of ['emailNotifications', 'smsNotifications']) {
    if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
    if (typeof body[field] !== 'boolean') {
      errors.push({ field, message: `${field} must be true or false` });
    } else {
      value[field] = body[field];
    }
  }

  if (Object.keys(body).length === 0) {
    errors.push({ field: null, message: 'Provide at least one field to update' });
  }

  if (errors.length) throw new AppError(400, 'Validation failed', errors);
  return value;
}

module.exports = { EMAIL_PATTERN, E164_PATTERN, validatePreferencesInput };

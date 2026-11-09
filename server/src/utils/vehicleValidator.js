
const AppError = require('./AppError');

// These are the only fields a user is allowed to submit when adding a vehicle.
// The owner field is deliberately excluded because it comes from authentication.
const VEHICLE_FIELDS = [
  'nickname',
  'dateOfPurchase',
  'make',
  'model',
  'registration',
  'nctExpiry',
  'motorTaxExpiry',
  'insuranceExpiry',
  'nextServiceDate',
  'nctLastTestDate',
  'nctLastResult',
  'insuranceProvider',
];

// Checks the vehicle information sent in the request body.
// Returns cleaned data if valid, otherwise throws a 400 validation error.
function validateVehicleInput(body) {

  // Make sure the request body is a JSON object.
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'Request body must be a JSON object');
  }

  const errors = [];
  const value = {};

  // Reject any fields that are not part of the vehicle model.
  for (const key of Object.keys(body)) {
    if (!VEHICLE_FIELDS.includes(key)) {
      errors.push({ field: key, message: `Unknown field "${key}"` });
    }
  }

  // Make, model and registration are required when adding a vehicle.
  for (const field of ['make', 'model', 'registration']) {
    const input = body[field];

    // Check that each required field contains non-empty text.
    if (typeof input !== 'string' || !input.trim()) {
      errors.push({ field, message: `${field} is required` });
    } else {
      value[field] = input.trim();
    }
  }

  // Nickname and insurance provider are optional text fields.
  for (const field of ['nickname', 'insuranceProvider']) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'string') {
        errors.push({ field, message: `${field} must be text` });
      } else {
        value[field] = body[field].trim();
      }
    }
  }

  // List of date fields accepted by the vehicle model.
  const dateFields = [
    'dateOfPurchase',
    'nctExpiry',
    'motorTaxExpiry',
    'insuranceExpiry',
    'nextServiceDate',
    'nctLastTestDate',
  ];

  // Validate each supplied date and convert it into a Date object.
  for (const field of dateFields) {
    // Empty or missing dates are allowed because these fields are optional.
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      continue;
    }

    // Dates must use the YYYY-MM-DD format.
    if (
      typeof body[field] !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body[field])
    ) {
      errors.push({ field, message: `${field} must use YYYY-MM-DD format` });
      continue;
    }

    // Convert the date into UTC midnight to avoid timezone-related changes.
    const date = new Date(`${body[field]}T00:00:00.000Z`);

    // Check that the date actually exists (e.g. reject 2026-02-30).
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== body[field]) {
      errors.push({ field, message: `${field} must be a valid date` });
    } else {
      value[field] = date;
    }
  }

  // The last NCT result can only be passed, failed or null.
  if (body.nctLastResult !== undefined) {
    if (!['passed', 'failed', null].includes(body.nctLastResult)) {
      errors.push({
        field: 'nctLastResult',
        message: 'nctLastResult must be passed or failed',
      });
    } else {
      value.nctLastResult = body.nctLastResult;
    }
  }

  // If any validation errors were found, return them as a 400 error.
  if (errors.length) {
    throw new AppError(400, 'Validation failed', errors);
  }

  // Return the validated and cleaned vehicle information.
  return value;
}

// Export the function so the vehicle controller can use it.
module.exports = { validateVehicleInput };

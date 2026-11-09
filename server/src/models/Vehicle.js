// Temporary Vehicle model with only the fields the notifications read.
// TODO: replace with the car model from the add-a-car feature (Lukas). If its field
// names are different, update src/config/deadlines.js to match.
const mongoose = require('mongoose');
const { DEADLINE_FIELDS } = require('../config/deadlines');
const { isDateOnly, formatDateOnly } = require('../utils/dates');

// Deadline dates are optional and must be date-only values (midnight UTC).
function dateOnlyField() {
  return {
    type: Date,
    default: null,
    validate: {
      validator: (value) => value === null || value === undefined || isDateOnly(value),
      message: (props) => `${props.path} must be a date without a time (YYYY-MM-DD)`,
    },
  };
}

const vehicleSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
      index: true,
    },
    registration: { type: String, required: [true, 'Registration is required'], trim: true },
    // Additional vehicle details from the Add a Car feature.
    nickname: { type: String, trim: true, maxlength: 50, default: null },
    dateOfPurchase: { type: Date, default: null },
    insuranceProvider: { type: String, trim: true, maxlength: 100, default: null },
    // used in the message text, e.g. "191-D-12345 (Toyota Corolla)"
    make: { type: String, trim: true },
    model: { type: String, trim: true },
    nctExpiry: dateOnlyField(),
    motorTaxExpiry: dateOnlyField(),
    insuranceExpiry: dateOnlyField(),
    nextServiceDate: dateOnlyField(),
    // last NCT test - if it failed, retest reminders are sent instead of the normal NCT ones
    nctLastTestDate: dateOnlyField(),
    nctLastResult: { type: String, enum: ['passed', 'failed', null], default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        for (const field of [...DEADLINE_FIELDS, 'nctLastTestDate']) {
          ret[field] = ret[field] ? formatDateOnly(ret[field]) : null;
        }
        return ret;
      },
    },
  }
);

module.exports = mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);

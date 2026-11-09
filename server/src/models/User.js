// Temporary User model for development.
// TODO: move email, phone, emailNotifications and smsNotifications into the
// group's User model and delete this file (keep the model name "User").
const mongoose = require('mongoose');
const { EMAIL_PATTERN, E164_PATTERN } = require('../utils/validators');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [EMAIL_PATTERN, 'Email address is not valid'],
    },
    phone: {
      type: String,
      trim: true,
      default: null,
      validate: {
        validator: (value) => value === null || value === undefined || E164_PATTERN.test(value),
        message: 'Phone number must be in international format, e.g. +353871234567',
      },
    },
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
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

module.exports = mongoose.models.User || mongoose.model('User', userSchema);

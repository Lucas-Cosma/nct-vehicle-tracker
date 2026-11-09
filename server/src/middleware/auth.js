// DEVELOPMENT ONLY - replace before production.
//
// Takes the user from the X-Dev-User-Id header with no password or token,
// so anyone can act as anyone. Swap requireAuth for the group's real auth
// middleware. The rest of the code only needs it to set:
//
//   req.user = { id: '<user _id as a string>' }
//
// It rejects every request in production, and server.js won't start in
// production while IS_DEV_AUTH is true.
const mongoose = require('mongoose');
const { config } = require('../config/env');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const IS_DEV_AUTH = true; // set to false (or delete) once real auth is plugged in

async function devAuth(req, res, next) {
  if (config.isProduction) {
    throw new AppError(500, 'Authentication is not configured for production');
  }

  const userId = req.get('x-dev-user-id');
  if (!userId) {
    throw new AppError(401, 'Authentication required: send the X-Dev-User-Id header (development only)');
  }
  if (!mongoose.isValidObjectId(userId)) {
    throw new AppError(401, 'X-Dev-User-Id is not a valid user id');
  }

  const user = await User.exists({ _id: userId });
  if (!user) {
    throw new AppError(401, 'No user exists with that X-Dev-User-Id');
  }

  req.user = { id: String(user._id) };
  next();
}

module.exports = { requireAuth: devAuth, IS_DEV_AUTH };

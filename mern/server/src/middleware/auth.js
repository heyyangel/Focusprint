const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { canCreateTasks } = require('../utils/permissions');

function signToken(user) {
  return jwt.sign(
    { sub: String(user._id), name: user.name, role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

/** Verifies the bearer token and attaches the live user document to req.user. */
const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) throw ApiError.unauthorized('Missing authentication token.');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (err) {
    throw ApiError.unauthorized('Session expired. Please sign in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account is no longer active.');

  req.user = user;
  next();
});

/** Restricts a route to the listed roles. */
const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!roles.includes(String(req.user.role).trim())) return next(ApiError.forbidden());
  next();
};

/** Blocks task creation for the Delegatee / User roles. */
const requireTaskCreator = (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!canCreateTasks(req.user)) {
    return next(ApiError.forbidden('Only a Delegator, Admin or PC can create tasks.'));
  }
  next();
};

module.exports = { signToken, protect, requireRole, requireTaskCreator };

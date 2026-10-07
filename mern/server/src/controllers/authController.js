const crypto = require('crypto');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { navigationFor } = require('../utils/permissions');
const { sendMail } = require('../services/mailService');
const templates = require('../services/emailTemplates');

const OTP_TTL_MS = 15 * 60 * 1000; // 15 minutes, same as the Apps Script

const sessionPayload = (user, token) => ({
  token,
  user: {
    ...user.toPublic(),
    navigation: navigationFor(user),
  },
});

/** GET /api/auth/usernames — feeds the login datalist (port of getUsernames). */
exports.usernames = asyncHandler(async (_req, res) => {
  const users = await User.find({ isActive: true }, 'name').sort({ name: 1 }).lean();
  res.json({ success: true, data: users.map((u) => u.name) });
});

/** POST /api/auth/login — port of authenticateUserWithToken. */
exports.login = asyncHandler(async (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!username || !password) throw ApiError.badRequest('Please enter both username and password.');

  const user = await User.findOne({ name: username }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid username or password.');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated.');

  const ok = await user.verifyPassword(password);
  if (!ok) throw ApiError.unauthorized('Invalid username or password.');

  res.json({ success: true, ...sessionPayload(user, signToken(user)) });
});

/** GET /api/auth/me — port of validateSession. */
exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: { ...req.user.toPublic(), navigation: navigationFor(req.user) } });
});

/** POST /api/auth/forgot-password — port of initiatePasswordReset. */
exports.forgotPassword = asyncHandler(async (req, res) => {
  const username = String(req.body.username || '').trim();
  if (!username) throw ApiError.badRequest('Please enter your username.');

  const user = await User.findOne({ name: username }).select('+resetOtp +otpExpiry');
  if (!user) throw ApiError.notFound('Username not found.');
  if (!user.email) throw ApiError.badRequest('No email linked to this account.');

  const otp = String(crypto.randomInt(100000, 1000000));
  user.resetOtp = otp;
  user.otpExpiry = new Date(Date.now() + OTP_TTL_MS);
  await user.save();

  const mail = templates.passwordResetOtp({ name: user.name, otp });
  const result = await sendMail({ to: user.email, ...mail });
  if (!result.sent && result.reason !== 'not-configured') {
    user.resetOtp = '';
    user.otpExpiry = null;
    await user.save();
    throw new ApiError(502, 'Mail sending failed. Please contact your administrator.');
  }

  const masked = user.email.replace(/(.{2}).*(@)/, '$1***$2');
  res.json({ success: true, message: `OTP sent to ${masked}` });
});

/** POST /api/auth/reset-password — port of confirmPasswordReset. */
exports.resetPassword = asyncHandler(async (req, res) => {
  const username = String(req.body.username || '').trim();
  const otp = String(req.body.otp || '').trim();
  const newPassword = String(req.body.newPassword || '');

  if (!username || !otp || !newPassword) throw ApiError.badRequest('Please fill all fields.');
  if (newPassword.length < 6) throw ApiError.badRequest('Password must be at least 6 characters.');

  const user = await User.findOne({ name: username }).select('+password +resetOtp +otpExpiry');
  if (!user) throw ApiError.notFound('User not found.');
  if (!user.resetOtp) throw ApiError.badRequest('Reset not initiated.');
  if (user.resetOtp !== otp) throw ApiError.badRequest('Invalid OTP.');
  if (!user.otpExpiry || user.otpExpiry.getTime() < Date.now()) {
    throw ApiError.badRequest('OTP expired. Please request again.');
  }

  user.password = newPassword;
  user.resetOtp = '';
  user.otpExpiry = null;
  await user.save();

  res.json({ success: true, message: 'Password reset successfully. Please log in.' });
});

/** POST /api/auth/change-password — signed-in self service. */
exports.changePassword = asyncHandler(async (req, res) => {
  const current = String(req.body.currentPassword || '');
  const next = String(req.body.newPassword || '');
  if (next.length < 6) throw ApiError.badRequest('Password must be at least 6 characters.');

  const user = await User.findById(req.user._id).select('+password');
  const ok = await user.verifyPassword(current);
  if (!ok) throw ApiError.badRequest('Current password is incorrect.');

  user.password = next;
  await user.save();
  res.json({ success: true, message: 'Password updated.' });
});

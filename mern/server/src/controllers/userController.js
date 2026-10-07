const User = require('../models/User');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { navigationFor } = require('../utils/permissions');

/** GET /api/users — port of getUsersWithEmail (name + email + department). */
exports.list = asyncHandler(async (_req, res) => {
  const users = await User.find({ isActive: true }, 'name email department role delegators')
    .sort({ name: 1 })
    .lean();
  res.json({
    success: true,
    data: users.map((u) => ({
      name: u.name,
      email: u.email || '',
      department: u.department || '',
      role: u.role,
      delegators: u.delegators || [],
    })),
  });
});

/** GET /api/users/departments — port of getDepartments (unique, sorted). */
exports.departments = asyncHandler(async (_req, res) => {
  const values = await User.distinct('department', { isActive: true });
  const departments = values.map((d) => String(d || '').trim()).filter(Boolean).sort();
  res.json({ success: true, data: departments });
});

/**
 * GET /api/users/hierarchy — port of getDoerlistDelegation.
 * Flattens the "Team" column into one { delegator, delegatee, department } pair
 * per delegator, so the Add-Task form can narrow the delegatee list.
 */
exports.hierarchy = asyncHandler(async (_req, res) => {
  const users = await User.find({ isActive: true }, 'name department delegators').lean();
  const result = [];

  users.forEach((u) => {
    const delegatee = String(u.name || '').trim();
    if (!delegatee) return;
    const department = String(u.department || '').trim();
    const delegators = (u.delegators || []).map((d) => String(d).trim()).filter(Boolean);

    if (delegators.length) {
      delegators.forEach((delegator) => result.push({ delegator, delegatee, department }));
    } else {
      result.push({ delegator: '', delegatee, department });
    }
  });

  res.json({ success: true, data: result });
});

/** POST /api/users — admin-only user provisioning. */
exports.create = asyncHandler(async (req, res) => {
  const { name, password, role, email, mobile, department, delegators } = req.body;
  if (!name || !password) throw ApiError.badRequest('Name and password are required.');

  const exists = await User.findOne({ name: String(name).trim() });
  if (exists) throw ApiError.badRequest(`A user named "${name}" already exists.`);

  const user = await User.create({
    name: String(name).trim(),
    password,
    role: role || 'Delegatee',
    email: email || '',
    mobile: mobile || '',
    department: department || '',
    delegators: Array.isArray(delegators)
      ? delegators
      : String(delegators || '').split(',').map((d) => d.trim()).filter(Boolean),
  });

  res.status(201).json({ success: true, message: `User ${user.name} created.`, data: user.toPublic() });
});

/** PATCH /api/users/:id — admin-only profile / role updates. */
exports.update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found.');

  const fields = ['role', 'email', 'mobile', 'department', 'isActive'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) user[f] = req.body[f];
  });
  if (req.body.delegators !== undefined) {
    user.delegators = Array.isArray(req.body.delegators)
      ? req.body.delegators
      : String(req.body.delegators).split(',').map((d) => d.trim()).filter(Boolean);
  }
  if (req.body.password) user.password = req.body.password;

  await user.save();
  res.json({
    success: true,
    message: `User ${user.name} updated.`,
    data: { ...user.toPublic(), navigation: navigationFor(user) },
  });
});

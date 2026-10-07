const DelegationTask = require('../models/DelegationTask');
const Counter = require('../models/Counter');
const User = require('../models/User');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { parseDate, endOfDay } = require('../utils/dates');
const {
  canRemarkDelegation,
  canActOnDelegation,
  isPrivileged,
  sameName,
} = require('../utils/permissions');
const { sendMail } = require('../services/mailService');
const templates = require('../services/emailTemplates');

const YES_NO = (v) => (String(v).trim() === 'Yes' ? 'Yes' : 'No');

const serialize = (t) => ({
  id: t._id,
  taskId: t.taskId,
  timestamp: t.createdAt,
  delegator: t.delegator || '',
  delegatee: t.delegatee || '',
  parentTask: t.parentTask || '',
  department: t.department || '',
  taskTitle: t.taskTitle || '',
  task: t.task || '',
  priority: t.priority || '',
  score: t.score === null || t.score === undefined ? '' : t.score,
  dueDate: t.dueDate || null,
  status: t.status || 'Pending',
  proofRequired: t.proofRequired || 'No',
  approvalRequired: t.approvalRequired || 'No',
  documentRequired: t.documentRequired || 'No',
  revisedDate: t.revisedDate || null,
  countOfRevisions: t.countOfRevisions || 0,
  remarks: (t.remarks || []).map((r) => ({
    time: r.time,
    remark: r.remark || '',
    user: r.user || '',
    status: r.status || '',
  })),
  proofOfCompletion: t.proofOfCompletion || '',
  completionTime: t.completionTime || null,
  subMonitoring: t.subMonitoring || 'No',
});

async function emailByName(name) {
  if (!name) return '';
  const user = await User.findOne({ name: new RegExp(`^${String(name).trim()}$`, 'i') }, 'email').lean();
  return user ? String(user.email || '').trim() : '';
}

/** GET /api/delegation — port of getDelegationData (newest first). */
exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.delegator) filter.delegator = req.query.delegator;
  if (req.query.delegatee) filter.delegatee = req.query.delegatee;

  const tasks = await DelegationTask.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: tasks.map(serialize) });
});

/** POST /api/delegation — port of insertDelegationEntry. */
exports.create = asyncHandler(async (req, res) => {
  const p = req.body;
  const delegator = String(p.delegator || '').trim();
  const delegatee = String(p.delegatee || '').trim();
  const taskTitle = String(p.taskTitle || '').trim();
  const task = String(p.task || '').trim();
  const dueDate = parseDate(p.dueDate);

  if (!delegator || !delegatee || !taskTitle || !task || !dueDate) {
    throw ApiError.badRequest('Please fill all required fields (Delegator, Delegatee, Title, Description, Due Date).');
  }
  // A Delegator may only assign work in their own name; Admin/PC may assign for anyone.
  if (!isPrivileged(req.user) && !sameName(delegator, req.user.name)) {
    throw ApiError.forbidden('You can only create tasks with yourself as the delegator.');
  }

  const seq = await Counter.next('delegationTaskId');
  const created = await DelegationTask.create({
    taskId: `Task-${seq}`,
    delegator,
    delegatee,
    parentTask: String(p.parentTask || '').trim(),
    department: String(p.department || '').trim(),
    taskTitle,
    task,
    priority: ['High', 'Medium', 'Low'].includes(p.priority) ? p.priority : '',
    score: p.score === '' || p.score === null || p.score === undefined ? null : Number(p.score),
    dueDate,
    status: p.status || 'Pending',
    proofRequired: YES_NO(p.proofRequired),
    approvalRequired: YES_NO(p.approvalRequired),
    documentRequired: YES_NO(p.documentRequired),
    subMonitoring: String(p.subMonitoring || 'No').trim() || 'No',
    countOfRevisions: 0,
    remarks: [],
  });

  const to = await emailByName(delegatee);
  if (to) await sendMail({ to, ...templates.delegationAssigned(created) });

  res.status(201).json({
    success: true,
    message: `Task ${created.taskId} created successfully!`,
    data: serialize(created),
  });
});

/** PUT /api/delegation/:taskId — port of updateDelegationEntry. */
exports.update = asyncHandler(async (req, res) => {
  const task = await DelegationTask.findOne({ taskId: String(req.params.taskId).trim() });
  if (!task) throw ApiError.notFound(`Task ${req.params.taskId} not found.`);
  if (!canRemarkDelegation(req.user, task)) {
    throw ApiError.forbidden('Only the Boss or the task delegator can edit this task.');
  }

  const p = req.body;
  const assign = {
    delegator: (v) => String(v || '').trim(),
    delegatee: (v) => String(v || '').trim(),
    parentTask: (v) => String(v || '').trim(),
    department: (v) => String(v || '').trim(),
    taskTitle: (v) => String(v || '').trim(),
    task: (v) => String(v || '').trim(),
    priority: (v) => (['High', 'Medium', 'Low'].includes(v) ? v : ''),
    status: (v) => v || 'Pending',
    proofRequired: YES_NO,
    approvalRequired: YES_NO,
    documentRequired: YES_NO,
    subMonitoring: (v) => String(v || 'No').trim() || 'No',
  };
  Object.entries(assign).forEach(([field, coerce]) => {
    if (p[field] !== undefined) task[field] = coerce(p[field]);
  });
  if (p.score !== undefined) task.score = p.score === '' ? null : Number(p.score);
  if (p.dueDate !== undefined) task.dueDate = parseDate(p.dueDate);

  await task.save();
  res.json({
    success: true,
    message: `Task ${task.taskId} updated successfully!`,
    data: serialize(task),
  });
});

/** DELETE /api/delegation — port of deleteDelegationEntry (single or bulk). */
exports.remove = asyncHandler(async (req, res) => {
  const raw = req.body.taskIds !== undefined ? req.body.taskIds : req.params.taskId;
  const ids = (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map((id) => String(id).trim());
  if (!ids.length) throw ApiError.badRequest('No Task IDs provided for deletion.');

  const tasks = await DelegationTask.find({ taskId: { $in: ids } });
  if (!tasks.length) throw ApiError.notFound('No matching tasks found to delete.');

  const blocked = tasks.filter((t) => !canRemarkDelegation(req.user, t));
  if (blocked.length) {
    throw ApiError.forbidden(
      `Only the Boss or the task delegator can delete: ${blocked.map((t) => t.taskId).join(', ')}.`
    );
  }

  const result = await DelegationTask.deleteMany({ taskId: { $in: tasks.map((t) => t.taskId) } });
  const msg =
    result.deletedCount === 1
      ? 'Task deleted successfully.'
      : `${result.deletedCount} tasks deleted successfully.`;
  res.json({ success: true, message: msg });
});

/**
 * POST /api/delegation/bulk-status — port of updateBulkStatusAndRemark.
 * Body: { updates: [{ taskId, status, remark }] }
 * Marking a task "Completed" past its (revised) due date downgrades it to
 * "Completed With Delay"; flipping back to "Pending" clears the completion time.
 */
exports.bulkStatusRemark = asyncHandler(async (req, res) => {
  const updates = Array.isArray(req.body.updates) ? req.body.updates : [];
  if (!updates.length) throw ApiError.badRequest('No Task IDs provided.');

  const now = new Date();
  let updatedCount = 0;

  for (const upd of updates) {
    const taskId = String(upd.taskId || '').trim();
    if (!taskId) continue;

    const task = await DelegationTask.findOne({ taskId });
    if (!task) continue;
    if (!canRemarkDelegation(req.user, task)) {
      throw ApiError.forbidden(
        `Only the Boss or the Task Delegator can add remarks or update status for ${taskId}.`
      );
    }

    let finalStatus = upd.status || '';

    if (finalStatus === 'Completed') {
      if (!task.completionTime) task.completionTime = now;
      const limit = task.revisedDate || task.dueDate;
      finalStatus =
        limit && task.completionTime.getTime() > new Date(limit).getTime()
          ? 'Completed With Delay'
          : 'Completed';
    }

    task.remarks.push({
      time: now,
      remark: upd.remark || '',
      user: req.user.name,
      status: finalStatus || 'No Change',
    });

    if (finalStatus) {
      task.status = finalStatus;
      if (finalStatus === 'Pending') task.completionTime = null;
    }

    await task.save();
    updatedCount += 1;
  }

  const msg =
    updatedCount === 1 ? 'Task updated successfully!' : `${updatedCount} tasks updated successfully!`;
  res.json({ success: true, message: msg });
});

/**
 * POST /api/delegation/complete — port of completeDelegationTasks.
 * Approval-required tasks land in "Approval Waiting"; otherwise the completion
 * time is compared against the end of the (revised) due day to flag a delay.
 * Body: { updates: [{ taskId, documentLink, actualTimestamp, remark }] }
 */
exports.complete = asyncHandler(async (req, res) => {
  const updates = Array.isArray(req.body.updates) ? req.body.updates : [];
  if (!updates.length) throw ApiError.badRequest('No tasks supplied.');

  let count = 0;
  for (const upd of updates) {
    const task = await DelegationTask.findOne({ taskId: String(upd.taskId || '').trim() });
    if (!task) continue;
    if (!canActOnDelegation(req.user, task)) {
      throw ApiError.forbidden(`You cannot complete task ${task.taskId}.`);
    }
    if (task.proofRequired === 'Yes' && !upd.documentLink && !task.proofOfCompletion) {
      throw ApiError.badRequest(`Proof of completion is required for task ${task.taskId}.`);
    }

    const completedAt = parseDate(upd.actualTimestamp) || new Date();
    const limit = endOfDay(task.revisedDate || task.dueDate);
    const isDelayed = !!limit && completedAt > limit;

    let finalStatus = 'Completed';
    if (task.approvalRequired === 'Yes') finalStatus = 'Approval Waiting';
    else if (isDelayed) finalStatus = 'Completed With Delay';

    task.status = finalStatus;
    if (upd.documentLink) task.proofOfCompletion = upd.documentLink;
    task.completionTime = completedAt;
    task.remarks.push({
      time: completedAt,
      remark: upd.remark || 'Completed task',
      user: req.user.name,
      status: finalStatus,
    });

    await task.save();
    count += 1;
  }

  res.json({ success: true, message: `Successfully completed ${count} delegation task(s)!` });
});

/**
 * POST /api/delegation/revise — port of reviseDelegationTasks.
 * Body: { updates: [{ taskId, revisedDate, remark }] }
 */
exports.revise = asyncHandler(async (req, res) => {
  const updates = Array.isArray(req.body.updates) ? req.body.updates : [];
  if (!updates.length) throw ApiError.badRequest('No tasks supplied.');

  let count = 0;
  for (const upd of updates) {
    const task = await DelegationTask.findOne({ taskId: String(upd.taskId || '').trim() });
    if (!task) continue;
    if (!canActOnDelegation(req.user, task)) {
      throw ApiError.forbidden(`You cannot revise task ${task.taskId}.`);
    }

    const revised = parseDate(upd.revisedDate);
    if (!revised) throw ApiError.badRequest(`Invalid revised date for ${task.taskId}.`);

    task.revisedDate = revised;
    task.countOfRevisions = (task.countOfRevisions || 0) + 1;
    task.remarks.push({
      time: parseDate(upd.timestamp) || new Date(),
      remark: upd.remark || 'Revised due date',
      user: req.user.name,
      status: 'Revised Due Date',
    });

    await task.save();
    count += 1;
  }

  res.json({ success: true, message: `Successfully revised due date for ${count} task(s)!` });
});

exports.serialize = serialize;

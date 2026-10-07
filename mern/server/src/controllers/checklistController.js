const ChecklistTask = require('../models/ChecklistTask');
const Counter = require('../models/Counter');
const User = require('../models/User');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { parseDate, addDays, addMonths, localISODate } = require('../utils/dates');
const { canActOnChecklist, canVerifyChecklist } = require('../utils/permissions');
const { sendMail } = require('../services/mailService');
const templates = require('../services/emailTemplates');

/** Number of occurrences generated per frequency — matches collectBulkRows(). */
const RECURRENCE = {
  Daily: { count: 365, step: (start, i) => addDays(start, i) },
  Weekly: { count: 52, step: (start, i) => addDays(start, i * 7) },
  Monthly: { count: 12, step: (start, i) => addMonths(start, i) },
  Quarterly: { count: 4, step: (start, i) => addMonths(start, i * 3) },
};

const serialize = (t) => ({
  id: t._id,
  groupId: t.groupId,
  taskId: t.taskId,
  email: t.email || '',
  name: t.name,
  frequency: t.frequency || '',
  taskDescription: t.taskDescription || '',
  dueDate: t.dueDate || null,
  proofRequired: t.proofRequired || 'No',
  verifiedBy: t.verifiedBy || '',
  actual: t.actual || null,
  document: t.document || '',
  remark: t.remark || '',
  verified: !!t.verified,
  verifiedTimestamp: t.verifiedTimestamp || null,
  createdAt: t.createdAt,
});

/** GET /api/checklist — port of getChecklistData. */
exports.list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.name) filter.name = req.query.name;
  if (req.query.groupId) filter.groupId = req.query.groupId;

  const tasks = await ChecklistTask.find(filter).sort({ createdAt: -1, taskId: 1 }).lean();
  res.json({ success: true, data: tasks.map(serialize) });
});

/**
 * POST /api/checklist/bulk — port of bulkInsertChecklist.
 * Accepts one entry per bulk-form row; the recurrence expansion that used to
 * live in the browser (collectBulkRows) now happens here.
 *
 * Body: { rows: [{ name, email, taskDescription, frequency, dates: [ISO],
 *                  proofRequired, verifiedBy }] }
 */
exports.bulkCreate = asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  if (!rows.length) throw ApiError.badRequest('Add at least one complete task with due date(s).');

  const users = await User.find({}, 'name email').lean();
  const emailByName = new Map(
    users.map((u) => [String(u.name).trim().toLowerCase(), String(u.email || '').trim()])
  );

  // Expand each form row into its occurrences first, so ids can be reserved in one shot.
  const batchStamp = Date.now();
  const expanded = [];

  rows.forEach((row, rowIndex) => {
    const name = String(row.name || '').trim();
    const taskDescription = String(row.taskDescription || '').trim();
    const dates = (Array.isArray(row.dates) ? row.dates : [])
      .map(parseDate)
      .filter(Boolean)
      .sort((a, b) => a - b);

    if (!name || !taskDescription || !dates.length) return;

    const frequency = String(row.frequency || '').trim();
    const proofRequired = row.proofRequired === 'Yes' ? 'Yes' : 'No';
    const verifiedBy = String(row.verifiedBy || '').trim();
    const email =
      String(row.email || '').trim() || emailByName.get(name.toLowerCase()) || '';
    const groupId = `GRP-${batchStamp}-${rowIndex}-${name.replace(/\s+/g, '')}`;

    const rule = RECURRENCE[frequency];
    const dueDates = rule
      ? Array.from({ length: rule.count }, (_, i) => rule.step(dates[0], i))
      : dates; // Yearly / blank → exactly the dates picked on the calendar

    dueDates.forEach((dueDate) => {
      expanded.push({
        groupId,
        email,
        name,
        frequency: frequency || 'Once',
        taskDescription,
        dueDate,
        proofRequired,
        verifiedBy,
        createdBy: req.user.name,
      });
    });
  });

  if (!expanded.length) throw ApiError.badRequest('Add at least one complete task with due date(s).');

  const startSeq = await Counter.next('checklistTaskId', expanded.length);
  const docs = expanded.map((row, i) => ({ ...row, taskId: `Task-${startSeq + i}` }));

  const inserted = await ChecklistTask.insertMany(docs);

  // One assignment mail per person + description, not one per occurrence.
  const notified = new Set();
  await Promise.all(
    inserted.map(async (task) => {
      if (!task.email) return;
      const key = `${task.email}::${task.taskDescription}`;
      if (notified.has(key)) return;
      notified.add(key);

      const occurrences = inserted.filter((t) => t.groupId === task.groupId).length;
      const mail = templates.checklistAssigned({
        name: task.name,
        groupId: task.groupId,
        taskDescription: task.taskDescription,
        frequency: task.frequency,
        dueDate: task.dueDate,
        verifiedBy: task.verifiedBy,
        occurrences,
      });
      await sendMail({ to: task.email, ...mail });
    })
  );

  res.status(201).json({
    success: true,
    message: `${inserted.length} task(s) generated successfully!`,
    insertedCount: inserted.length,
  });
});

/** PUT /api/checklist/group/:groupId — port of updateChecklistEntryByGroupId. */
exports.updateGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const update = {};
  const map = {
    name: 'name',
    email: 'email',
    frequency: 'frequency',
    taskDescription: 'taskDescription',
    proofRequired: 'proofRequired',
    verifiedBy: 'verifiedBy',
  };
  Object.entries(map).forEach(([from, to]) => {
    if (req.body[from] !== undefined) update[to] = req.body[from];
  });
  if (req.body.dueDate !== undefined) update.dueDate = parseDate(req.body.dueDate);

  if (!Object.keys(update).length) throw ApiError.badRequest('Nothing to update.');

  const result = await ChecklistTask.updateMany({ groupId }, { $set: update });
  if (!result.matchedCount) throw ApiError.notFound('Entry not found.');

  res.json({ success: true, message: `Updated ${result.matchedCount} row(s).` });
});

/** DELETE /api/checklist/group/:groupId — port of deleteChecklistEntryByGroupId. */
exports.deleteGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const result = await ChecklistTask.deleteMany({ groupId });
  if (!result.deletedCount) throw ApiError.notFound('Entry not found.');
  res.json({ success: true, message: `Deleted ${result.deletedCount} row(s).` });
});

/** DELETE /api/checklist/:taskId — single-occurrence delete. */
exports.deleteOne = asyncHandler(async (req, res) => {
  const task = await ChecklistTask.findOneAndDelete({ taskId: req.params.taskId });
  if (!task) throw ApiError.notFound('Task not found.');
  res.json({ success: true, message: 'Task deleted.' });
});

/**
 * POST /api/checklist/complete — port of completeTasks.
 * Tasks that do not require proof auto-verify on completion.
 * Body: { updates: [{ taskId, documentLink, actualTimestamp, remark }] }
 */
exports.complete = asyncHandler(async (req, res) => {
  const updates = Array.isArray(req.body.updates) ? req.body.updates : [];
  if (!updates.length) throw ApiError.badRequest('No tasks supplied.');

  const now = new Date();
  let updated = 0;

  for (const upd of updates) {
    const task = await ChecklistTask.findOne({ taskId: String(upd.taskId).trim() });
    if (!task) continue;
    if (!canActOnChecklist(req.user, task)) {
      throw ApiError.forbidden(`You cannot complete task ${task.taskId}.`);
    }

    if (upd.documentLink) task.document = upd.documentLink;
    task.actual = parseDate(upd.actualTimestamp) || now;
    if (upd.remark) {
      task.remark = task.remark ? `${task.remark} | ${upd.remark}` : String(upd.remark);
    }

    // Auto-verification: no proof demanded → the task is verified immediately.
    if (task.proofRequired !== 'Yes') {
      task.verified = true;
      task.verifiedTimestamp = now;
      task.verifiedByUser = task.verifiedBy || req.user.name;
    }

    await task.save();
    updated += 1;
  }

  res.json({ success: true, message: `Updated ${updated} task(s).` });
});

/**
 * POST /api/checklist/verify — port of verifyTasks.
 * Body: { taskIds: [] }
 */
exports.verify = asyncHandler(async (req, res) => {
  const taskIds = (Array.isArray(req.body.taskIds) ? req.body.taskIds : [req.body.taskIds])
    .filter(Boolean)
    .map((id) => String(id).trim());
  if (!taskIds.length) throw ApiError.badRequest('No tasks supplied.');

  const now = new Date();
  let updated = 0;

  for (const taskId of taskIds) {
    const task = await ChecklistTask.findOne({ taskId });
    if (!task) continue;
    if (!canVerifyChecklist(req.user, task)) {
      throw ApiError.forbidden(
        `Only ${task.verifiedBy || 'the assigned verifier'} can verify task ${task.taskId}.`
      );
    }
    task.verified = true;
    task.verifiedTimestamp = now;
    task.verifiedByUser = req.user.name;
    await task.save();
    updated += 1;
  }

  res.json({ success: true, message: `Verified ${updated} task(s).` });
});

/**
 * POST /api/checklist/revise — port of reviseChecklistTasks.
 * Body: { updates: [{ taskId, revisedDate, remark }] }
 */
exports.revise = asyncHandler(async (req, res) => {
  const updates = Array.isArray(req.body.updates) ? req.body.updates : [];
  if (!updates.length) throw ApiError.badRequest('No tasks supplied.');

  let count = 0;
  for (const upd of updates) {
    const task = await ChecklistTask.findOne({ taskId: String(upd.taskId).trim() });
    if (!task) continue;
    if (!canActOnChecklist(req.user, task)) {
      throw ApiError.forbidden(`You cannot revise task ${task.taskId}.`);
    }

    const revised = parseDate(upd.revisedDate);
    if (!revised) throw ApiError.badRequest(`Invalid revised date for ${task.taskId}.`);

    task.dueDate = revised;
    // localISODate, not toISOString — the latter can shift the day across UTC.
    const note = `[Date Revised to ${localISODate(revised)}]: ${upd.remark || ''}`;
    task.remark = task.remark ? `${task.remark} | ${note}` : note;
    await task.save();
    count += 1;
  }

  res.json({ success: true, message: `Successfully revised due date for ${count} checklist task(s)!` });
});

/** GET /api/checklist/summary — per-person group / task counts for the sidebar. */
exports.summary = asyncHandler(async (req, res) => {
  const tasks = await ChecklistTask.find({}, 'name groupId').lean();
  const map = new Map();
  tasks.forEach((t) => {
    if (!t.name) return;
    if (!map.has(t.name)) map.set(t.name, { name: t.name, groups: new Set(), tasks: 0 });
    const entry = map.get(t.name);
    entry.groups.add(t.groupId);
    entry.tasks += 1;
  });
  res.json({
    success: true,
    data: [...map.values()].map((e) => ({ name: e.name, groups: e.groups.size, tasks: e.tasks })),
  });
});

exports.serialize = serialize;

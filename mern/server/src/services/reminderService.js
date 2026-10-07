const cron = require('node-cron');
const env = require('../config/env');
const DelegationTask = require('../models/DelegationTask');
const ChecklistTask = require('../models/ChecklistTask');
const User = require('../models/User');
const { sendMail } = require('./mailService');
const templates = require('./emailTemplates');
const { localISODate } = require('../utils/dates');

/** name → email lookup, same job getEmailByName() did against the Doer List. */
async function buildEmailIndex() {
  const users = await User.find({}, 'name email').lean();
  const index = new Map();
  users.forEach((u) => {
    if (u.name) index.set(String(u.name).trim().toLowerCase(), String(u.email || '').trim());
  });
  return index;
}

/**
 * One reminder per pending Delegation task per day.
 * Port of sendDailyPendingTaskReminders().
 */
async function sendDelegationReminders() {
  const todayKey = localISODate(new Date());
  const emails = await buildEmailIndex();
  const tasks = await DelegationTask.find({ status: 'Pending' });

  let sent = 0;
  for (const task of tasks) {
    if (task.lastReminderSent && localISODate(task.lastReminderSent) === todayKey) continue;
    if (!task.delegatee) continue;

    const email = emails.get(String(task.delegatee).trim().toLowerCase());
    if (!email) continue;

    const mail = templates.delegationReminder({
      delegateeName: task.delegatee,
      taskId: task.taskId,
      taskTitle: task.taskTitle,
      dueDate: task.revisedDate || task.dueDate,
    });
    const result = await sendMail({ to: email, ...mail });
    if (result.sent || result.reason === 'not-configured') {
      task.lastReminderSent = new Date();
      await task.save();
      sent += 1;
    }
  }
  console.log(`[reminders] delegation → ${sent} sent`);
  return sent;
}

/**
 * One reminder per checklist task whose "Actual" is still empty.
 * Port of sendDailyChecklistReminders().
 */
async function sendChecklistReminders() {
  const todayKey = localISODate(new Date());
  const emails = await buildEmailIndex();
  const tasks = await ChecklistTask.find({ $or: [{ actual: null }, { actual: { $exists: false } }] });

  let sent = 0;
  for (const task of tasks) {
    if (task.lastReminderSent && localISODate(task.lastReminderSent) === todayKey) continue;

    const email =
      String(task.email || '').trim() || emails.get(String(task.name).trim().toLowerCase());
    if (!email) continue;

    const mail = templates.checklistReminder({
      name: task.name,
      taskId: task.taskId,
      taskDescription: task.taskDescription,
      dueDate: task.dueDate,
    });
    const result = await sendMail({ to: email, ...mail });
    if (result.sent || result.reason === 'not-configured') {
      task.lastReminderSent = new Date();
      await task.save();
      sent += 1;
    }
  }
  console.log(`[reminders] checklist → ${sent} sent`);
  return sent;
}

/** Port of masterDailyReminders(). */
async function runDailyReminders() {
  const delegation = await sendDelegationReminders();
  const checklist = await sendChecklistReminders();
  return { delegation, checklist };
}

/** Replaces createDailyReminderTrigger() — a 09:00 IST time-based trigger. */
function scheduleReminders() {
  if (!env.enableReminders) {
    console.log('[reminders] disabled (ENABLE_REMINDERS=false)');
    return null;
  }
  const job = cron.schedule(
    env.reminderCron,
    () => {
      runDailyReminders().catch((err) => console.error('[reminders] failed:', err.message));
    },
    { timezone: env.timezone }
  );
  console.log(`[reminders] scheduled "${env.reminderCron}" (${env.timezone})`);
  return job;
}

module.exports = {
  sendDelegationReminders,
  sendChecklistReminders,
  runDailyReminders,
  scheduleReminders,
};

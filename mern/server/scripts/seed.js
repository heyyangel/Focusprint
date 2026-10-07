/**
 * Seeds the database from the original workbook's reference data.
 *
 *   node scripts/seed.js            # upsert users + holidays (safe to re-run)
 *   node scripts/seed.js --reset    # wipe users/holidays first
 *   node scripts/seed.js --demo     # also insert a handful of sample tasks
 *
 * Users come from scripts/doerList.json, extracted from the "Doer List" sheet.
 * Passwords are stored exactly as they appear there — plaintext, as in the sheet.
 */
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const { connectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Holiday = require('../src/models/Holiday');
const Counter = require('../src/models/Counter');
const DelegationTask = require('../src/models/DelegationTask');
const ChecklistTask = require('../src/models/ChecklistTask');
const { addDays } = require('../src/utils/dates');

const readJson = (name) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, name), 'utf8'));

async function seedUsers(reset) {
  const doers = readJson('doerList.json');
  if (reset) {
    await User.deleteMany({});
    console.log('[seed] users cleared');
  }

  let created = 0;
  let updated = 0;
  for (const doer of doers) {
    const name = String(doer.name).trim();
    const existing = await User.findOne({ name }).select('+password');
    if (existing) {
      // One-time repair for rows written while passwords were still hashed —
      // restores the plaintext value from the Doer List. A password the user
      // chose themselves is left alone.
      if (/^\$2[aby]\$/.test(existing.password || '')) existing.password = doer.password;
      existing.role = doer.role || existing.role;
      existing.email = doer.email || existing.email;
      existing.mobile = doer.mobile || existing.mobile;
      existing.department = doer.department || existing.department;
      existing.delegators = doer.delegators || existing.delegators;
      await existing.save();
      updated += 1;
    } else {
      await User.create({ ...doer, name });
      created += 1;
    }
  }
  console.log(`[seed] users → ${created} created, ${updated} updated`);
}

async function seedHolidays(reset) {
  const holidays = readJson('holidays.json');
  if (reset) await Holiday.deleteMany({});
  for (const h of holidays) {
    await Holiday.updateOne(
      { date: new Date(`${h.date}T00:00:00`) },
      { $set: { name: h.name } },
      { upsert: true }
    );
  }
  console.log(`[seed] holidays → ${holidays.length} upserted`);
}

async function seedDemoTasks() {
  const today = new Date();
  const delegator = await User.findOne({ role: 'Delegator', department: 'Admin' });
  const delegatee = await User.findOne({ role: 'Delegatee' });
  if (!delegator || !delegatee) {
    console.log('[seed] demo skipped — need at least one Delegator and one Delegatee');
    return;
  }

  const startD = await Counter.next('delegationTaskId', 2);
  await DelegationTask.insertMany([
    {
      taskId: `Task-${startD}`,
      delegator: delegator.name,
      delegatee: delegatee.name,
      department: delegatee.department,
      taskTitle: 'Monthly vendor reconciliation',
      task: 'Reconcile all vendor invoices for the month and share the summary sheet.',
      priority: 'High',
      score: 20,
      dueDate: addDays(today, 3),
      status: 'Pending',
      proofRequired: 'Yes',
      approvalRequired: 'No',
      subMonitoring: 'No',
    },
    {
      taskId: `Task-${startD + 1}`,
      delegator: delegator.name,
      delegatee: delegatee.name,
      department: delegatee.department,
      taskTitle: 'Update label artwork library',
      task: 'Archive superseded artwork and re-index the current season files.',
      priority: 'Medium',
      score: 10,
      dueDate: addDays(today, -2),
      status: 'Pending',
      proofRequired: 'No',
      approvalRequired: 'Yes',
      subMonitoring: 'No',
    },
  ]);

  const groupId = `GRP-${Date.now()}-0-${delegatee.name.replace(/\s+/g, '')}`;
  const startC = await Counter.next('checklistTaskId', 5);
  await ChecklistTask.insertMany(
    Array.from({ length: 5 }, (_, i) => ({
      groupId,
      taskId: `Task-${startC + i}`,
      email: delegatee.email,
      name: delegatee.name,
      frequency: 'Daily',
      taskDescription: 'Daily production output entry in the ERP',
      dueDate: addDays(today, i),
      proofRequired: i === 0 ? 'Yes' : 'No',
      verifiedBy: delegator.name,
      createdBy: delegator.name,
    }))
  );

  console.log('[seed] demo → 2 delegation + 5 checklist tasks');
}

(async function run() {
  const reset = process.argv.includes('--reset');
  const demo = process.argv.includes('--demo');

  await connectDB();
  await seedUsers(reset);
  await seedHolidays(reset);

  if (reset) {
    await DelegationTask.deleteMany({});
    await ChecklistTask.deleteMany({});
    await Counter.deleteMany({});
    console.log('[seed] tasks + counters cleared');
  }
  if (demo) await seedDemoTasks();

  await mongoose.disconnect();
  console.log('[seed] done');
})().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});

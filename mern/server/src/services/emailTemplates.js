const { formatDateOnly, formatDateTime } = require('../utils/dates');

const esc = (s) =>
  String(s === null || s === undefined ? '' : s).replace(
    /[&<>"']/g,
    (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );

const shell = (accentFrom, accentTo, chipColor, eyebrow, title, subtitle, body) => `
<div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f5f7; padding: 24px;">
  <div style="background: linear-gradient(135deg, ${accentFrom}, ${accentTo}); border-radius: 16px 16px 0 0; padding: 28px 32px;">
    <span style="display:inline-block; background:#ffffff; color:${chipColor}; font-weight:bold; font-size:14px; padding:6px 14px; border-radius: 999px;">${eyebrow}</span>
    <h1 style="color:#ffffff; font-size:22px; margin:14px 0 4px 0;">${title}</h1>
    <p style="color:#f8f4f0; font-size:13px; margin:0;">${subtitle}</p>
  </div>
  <div style="background:#ffffff; padding:28px 32px; border-radius: 0 0 16px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
    ${body}
    <p style="font-size:12px; color:#c4c4c4; text-align:center; margin-top:28px; border-top:1px solid #f0f0f0; padding-top:14px;">
      — Focus Prints ERP &nbsp;|&nbsp; This is an automated notification
    </p>
  </div>
</div>`;

const row = (label, value, valueStyle = '') =>
  `<tr>
     <td style="padding:6px 0; color:#9ca3af; width:130px; vertical-align:top;">${label}</td>
     <td style="padding:6px 0; ${valueStyle}">${value}</td>
   </tr>`;

/** Purple theme — new delegation task assigned (port of insertDelegationEntry). */
function delegationAssigned(task) {
  const priorityColors = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' };
  const priorityColor = priorityColors[task.priority] || '#6b7280';

  const body = `
    <p style="font-size:15px; color:#374151; margin:0 0 4px 0;">Hello <strong>${esc(task.delegatee)}</strong>,</p>
    <p style="font-size:14px; color:#6b7280; margin:0 0 20px 0;">A new task has been assigned to you by <strong>${esc(task.delegator)}</strong>.</p>
    <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:18px 20px; margin-bottom:20px;">
      <table width="100%" style="font-size:14px; color:#374151;" cellpadding="0" cellspacing="0">
        ${row('Task ID', `<span style="font-weight:bold; font-family:monospace; background:#ede9fe; color:#7c3aed; border-radius:6px; padding:2px 8px;">${esc(task.taskId)}</span>`)}
        ${row('Title', esc(task.taskTitle) || '—', 'font-weight:600;')}
        ${row('Description', esc(task.task) || '—', 'color:#4b5563;')}
        ${row('Due Date', formatDateTime(task.dueDate) || '—', 'font-weight:600; color:#dc2626;')}
        ${row('Priority', `<span style="background:${priorityColor}; color:#ffffff; font-size:12px; font-weight:bold; padding:3px 10px; border-radius:999px;">${esc(task.priority) || 'Normal'}</span>`)}
      </table>
    </div>
    <p style="font-size:13px; color:#9ca3af; margin:0 0 22px 0;">Please log in to Focus Prints ERP to view full task details and complete it before the due date.</p>`;

  return {
    subject: `New Task Assigned: ${task.taskId}`,
    text:
      `Hello ${task.delegatee},\n\nA new task has been assigned to you by ${task.delegator}.\n\n` +
      `Task ID: ${task.taskId}\nTask Title: ${task.taskTitle || ''}\nDescription: ${task.task || ''}\n` +
      `Due Date: ${formatDateTime(task.dueDate)}\nPriority: ${task.priority || ''}\n\n` +
      `Please log in to Focus Prints ERP to view more details.`,
    html: shell(
      '#8b5cf6',
      '#a855f7',
      '#8b5cf6',
      'FOCUS PRINTS ERP',
      'New Task Assigned',
      'You have a new task waiting for you',
      body
    ),
  };
}

/** Green theme — new recurring checklist series (port of bulkInsertChecklist). */
function checklistAssigned({ name, groupId, taskDescription, frequency, dueDate, verifiedBy, occurrences }) {
  const body = `
    <p style="font-size:15px; color:#374151; margin:0 0 4px 0;">Hello <strong>${esc(name)}</strong>,</p>
    <p style="font-size:14px; color:#6b7280; margin:0 0 20px 0;">Please review your new checklist task details below.</p>
    <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:18px 20px; margin-bottom:20px;">
      <table width="100%" style="font-size:14px; color:#374151;" cellpadding="0" cellspacing="0">
        ${row('Task Series ID', `<span style="font-weight:bold; font-family:monospace; background:#d1fae5; color:#059669; border-radius:6px; padding:2px 8px;">${esc(groupId)}</span>`)}
        ${row('Description', esc(taskDescription) || '—', 'font-weight:600;')}
        ${row('Frequency', esc(frequency) || 'Once', 'color:#4b5563; font-weight:bold;')}
        ${row('Start Date', formatDateOnly(dueDate) || '—', 'font-weight:600; color:#dc2626;')}
        ${row('Occurrences', String(occurrences || 1), 'font-weight:600;')}
        ${row('Verified By', esc(verifiedBy) || 'Admin', 'font-weight:600; color:#4f46e5;')}
      </table>
    </div>
    <p style="font-size:13px; color:#9ca3af; margin:0 0 22px 0;">This task will recur according to the frequency. Please log in to Focus Prints ERP to update the actual completion status and upload proof.</p>`;

  return {
    subject: 'New Recurring Checklist Task Assigned',
    text:
      `Hello ${name},\n\nA new Recurring Checklist Task has been assigned to you.\n\n` +
      `Description: ${taskDescription}\nStart Date: ${formatDateOnly(dueDate)}\nFrequency: ${frequency}\n\n` +
      `Please login to Focus Prints ERP to view details.`,
    html: shell(
      '#10b981',
      '#059669',
      '#059669',
      'FOCUS PRINTS ERP',
      'New Checklist Task',
      'A new routine task has been assigned to you',
      body
    ),
  };
}

/** Brand theme — OTP mail (port of initiatePasswordReset). */
function passwordResetOtp({ name, otp }) {
  const body = `
    <p style="font-size:15px; color:#374151; margin:0 0 4px 0;">Hello <strong>${esc(name)}</strong>,</p>
    <p style="font-size:14px; color:#6b7280; margin:0 0 20px 0;">Use the one-time code below to reset your password.</p>
    <div style="text-align:center; background:#faf6f2; border:1px solid #eaddd3; border-radius:12px; padding:22px; margin-bottom:20px;">
      <div style="font-family:monospace; font-size:34px; letter-spacing:10px; font-weight:bold; color:#904A20;">${esc(otp)}</div>
      <div style="font-size:12px; color:#9ca3af; margin-top:8px;">Valid for 15 minutes</div>
    </div>
    <p style="font-size:13px; color:#9ca3af; margin:0 0 22px 0;">If you did not request this, you can safely ignore this email.</p>`;

  return {
    subject: 'Focus Prints ERP — Password Reset OTP',
    text:
      `Hello ${name},\n\nYour OTP for password reset is: ${otp}\n\nThis OTP is valid for 15 minutes.\n\n` +
      `If you did not request this, please ignore.\n\n— Focus Prints ERP`,
    html: shell(
      '#904A20',
      '#b06334',
      '#904A20',
      'FOCUS PRINTS ERP',
      'Password Reset',
      'One-time code for your account',
      body
    ),
  };
}

/** Daily pending-task reminder — delegation. */
function delegationReminder({ delegateeName, taskId, taskTitle, dueDate }) {
  return {
    subject: `Reminder: Task ${taskId} is still Pending`,
    text:
      `Hello ${delegateeName},\n\nThis is a reminder that the following task assigned to you is still pending:\n\n` +
      `Task ID: ${taskId}\nTask Title: ${taskTitle}\nDue Date: ${formatDateTime(dueDate)}\n\n` +
      `Please complete it at the earliest.\n\n— Focus Prints ERP`,
  };
}

/** Daily pending-task reminder — checklist. */
function checklistReminder({ name, taskId, taskDescription, dueDate }) {
  return {
    subject: `Reminder: Checklist Task ${taskId} is Pending`,
    text:
      `Hello ${name},\n\nThis is a reminder that the following routine Checklist task is pending:\n\n` +
      `Task ID: ${taskId}\nTask Description: ${taskDescription}\nDue Date: ${formatDateOnly(dueDate)}\n\n` +
      `Please complete it in Focus Prints ERP at the earliest.\n\n— Focus Prints ERP`,
  };
}

module.exports = {
  delegationAssigned,
  checklistAssigned,
  passwordResetOtp,
  delegationReminder,
  checklistReminder,
};

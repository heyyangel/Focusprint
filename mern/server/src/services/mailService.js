const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter !== null) return transporter;
  if (!env.mail.host) {
    console.warn('[mail] MAIL_HOST not configured — emails will be logged, not sent.');
    transporter = false;
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.secure,
    auth: env.mail.user ? { user: env.mail.user, pass: env.mail.pass } : undefined,
  });
  return transporter;
}

/**
 * Sends an email. Never throws — a mail failure must not roll back a task write
 * (the Apps Script wrapped every MailApp call in its own try/catch too).
 */
async function sendMail({ to, subject, text, html }) {
  if (!to) return { sent: false, reason: 'no-recipient' };
  const tx = getTransporter();
  if (!tx) {
    console.log(`[mail:skipped] to=${to} subject="${subject}"`);
    return { sent: false, reason: 'not-configured' };
  }
  try {
    const info = await tx.sendMail({ from: env.mail.from, to, subject, text, html });
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[mail:failed] to=${to} — ${err.message}`);
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendMail };

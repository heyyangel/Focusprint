require('dotenv').config();

const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  serverUrl: process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/focusprint_erp',
  jwtSecret: process.env.JWT_SECRET || 'focusprint-erp-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mail: {
    host: process.env.MAIL_HOST || '',
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    secure: String(process.env.MAIL_SECURE || 'false') === 'true',
    user: process.env.MAIL_USER || '',
    pass: process.env.MAIL_PASS || '',
    from: process.env.MAIL_FROM || 'Focus Prints ERP <no-reply@focusprints.com>',
  },
  reminderCron: process.env.REMINDER_CRON || '0 9 * * *',
  timezone: process.env.TZ_NAME || 'Asia/Kolkata',
  enableReminders: String(process.env.ENABLE_REMINDERS || 'true') === 'true',
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  maxUploadMb: parseInt(process.env.MAX_UPLOAD_MB || '15', 10),
};

module.exports = env;

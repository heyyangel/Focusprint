const express = require('express');
const { protect, requireRole, requireTaskCreator } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { asyncHandler } = require('../utils/apiError');

const auth = require('../controllers/authController');
const users = require('../controllers/userController');
const checklist = require('../controllers/checklistController');
const delegation = require('../controllers/delegationController');
const uploads = require('../controllers/uploadController');
const reminders = require('../services/reminderService');

const router = express.Router();

router.get('/health', (_req, res) =>
  res.json({ success: true, service: 'focusprint-erp-api', time: new Date().toISOString() })
);

/* ── Auth ──────────────────────────────────────────────────────────── */
router.get('/auth/usernames', auth.usernames);
router.post('/auth/login', auth.login);
router.post('/auth/forgot-password', auth.forgotPassword);
router.post('/auth/reset-password', auth.resetPassword);
router.get('/auth/me', protect, auth.me);
router.post('/auth/change-password', protect, auth.changePassword);

/* ── Users / Doer List ─────────────────────────────────────────────── */
router.get('/users', protect, users.list);
router.get('/users/departments', protect, users.departments);
router.get('/users/hierarchy', protect, users.hierarchy);
router.post('/users', protect, requireRole('Admin', 'PC'), users.create);
router.patch('/users/:id', protect, requireRole('Admin', 'PC'), users.update);

/* ── Checklist ─────────────────────────────────────────────────────── */
router.get('/checklist', protect, checklist.list);
router.get('/checklist/summary', protect, checklist.summary);
router.post('/checklist/bulk', protect, requireTaskCreator, checklist.bulkCreate);
router.post('/checklist/complete', protect, checklist.complete);
router.post('/checklist/verify', protect, checklist.verify);
router.post('/checklist/revise', protect, checklist.revise);
router.put('/checklist/group/:groupId', protect, requireTaskCreator, checklist.updateGroup);
router.delete('/checklist/group/:groupId', protect, requireTaskCreator, checklist.deleteGroup);
router.delete('/checklist/:taskId', protect, requireTaskCreator, checklist.deleteOne);

/* ── Delegation ────────────────────────────────────────────────────── */
router.get('/delegation', protect, delegation.list);
router.post('/delegation', protect, requireTaskCreator, delegation.create);
router.post('/delegation/bulk-status', protect, delegation.bulkStatusRemark);
router.post('/delegation/complete', protect, delegation.complete);
router.post('/delegation/revise', protect, delegation.revise);
router.put('/delegation/:taskId', protect, requireTaskCreator, delegation.update);
router.delete('/delegation/:taskId', protect, requireTaskCreator, delegation.remove);
router.delete('/delegation', protect, requireTaskCreator, delegation.remove);

/* ── Uploads (proof of completion) ─────────────────────────────────── */
router.post('/uploads', protect, upload.single('file'), uploads.uploadProof);
router.delete('/uploads/:filename', protect, requireRole('Admin', 'PC'), uploads.removeProof);

/* ── Reminders (manual trigger — the cron runs them daily at 09:00) ── */
router.post(
  '/reminders/run',
  protect,
  requireRole('Admin', 'PC'),
  asyncHandler(async (_req, res) => {
    const result = await reminders.runDailyReminders();
    res.json({ success: true, message: 'Reminders dispatched.', data: result });
  })
);

module.exports = router;

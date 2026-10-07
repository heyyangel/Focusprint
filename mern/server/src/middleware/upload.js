const fs = require('fs');
const path = require('path');
const multer = require('multer');
const env = require('../config/env');

// Resolved against the server package root, not the shell's cwd, so uploads
// always land in the same place however the process is started.
const uploadRoot = path.isAbsolute(env.uploadDir)
  ? env.uploadDir
  : path.resolve(__dirname, '../..', env.uploadDir);
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (req, file, cb) => {
    // Same naming convention as uploadTaskDocument() in code.gs
    const taskId = String(req.body.taskId || 'task').replace(/[^a-zA-Z0-9_-]/g, '');
    const safe = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `task_${taskId}_${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
});

module.exports = { upload, uploadRoot };

const path = require('path');
const fs = require('fs');
const env = require('../config/env');
const { ApiError, asyncHandler } = require('../utils/apiError');
const { uploadRoot } = require('../middleware/upload');

/**
 * POST /api/uploads — replaces uploadTaskDocument()/Google Drive.
 * Stores the proof file on disk and returns a public URL served from /uploads.
 */
exports.uploadProof = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file received.');
  const fileUrl = `${env.serverUrl.replace(/\/$/, '')}/${env.uploadDir}/${req.file.filename}`;
  res.status(201).json({
    success: true,
    fileUrl,
    fileName: req.file.originalname,
    size: req.file.size,
  });
});

/** DELETE /api/uploads/:filename — removes a stored proof file. */
exports.removeProof = asyncHandler(async (req, res) => {
  const filename = path.basename(String(req.params.filename || ''));
  const target = path.join(uploadRoot, filename);
  if (!target.startsWith(uploadRoot) || !fs.existsSync(target)) {
    throw ApiError.notFound('File not found.');
  }
  fs.unlinkSync(target);
  res.json({ success: true, message: 'File removed.' });
});

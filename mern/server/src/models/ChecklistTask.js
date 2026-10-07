const mongoose = require('mongoose');

/**
 * Mirrors the "Checklist" sheet:
 *   A Created At · B Group ID · C Email · D Name · E Task ID · F Frequency
 *   G Task Description · H Due Date · I Proof is Required · J Verified by
 *   K Actual · L Document · M Remark · N Verified · O Verified Timestamp
 *   P Last Reminder Sent
 */
const checklistSchema = new mongoose.Schema(
  {
    groupId: { type: String, required: true, index: true },
    taskId: { type: String, required: true, unique: true, index: true },
    email: { type: String, trim: true, default: '' },
    name: { type: String, required: true, trim: true, index: true },
    frequency: {
      type: String,
      enum: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Once', ''],
      default: '',
    },
    taskDescription: { type: String, default: '' },
    dueDate: { type: Date, default: null, index: true },
    proofRequired: { type: String, enum: ['Yes', 'No'], default: 'No' },
    verifiedBy: { type: String, trim: true, default: '' },

    // Completion
    actual: { type: Date, default: null },
    document: { type: String, default: '' },
    remark: { type: String, default: '' },

    // Verification
    verified: { type: Boolean, default: false },
    verifiedTimestamp: { type: Date, default: null },
    verifiedByUser: { type: String, default: '' },

    createdBy: { type: String, default: '' },
    lastReminderSent: { type: Date, default: null },
  },
  { timestamps: true }
);

checklistSchema.index({ name: 1, dueDate: 1 });
checklistSchema.index({ verifiedBy: 1 });

module.exports = mongoose.model('ChecklistTask', checklistSchema);

const mongoose = require('mongoose');

/** One entry of the JSON remark history the sheet kept in column R. */
const remarkEntrySchema = new mongoose.Schema(
  {
    time: { type: Date, default: Date.now },
    remark: { type: String, default: '' },
    user: { type: String, default: '' },
    status: { type: String, default: '' },
  },
  { _id: false }
);

/**
 * Mirrors the "Delegation" sheet:
 *   A Timestamp · B Task Id · C Delegator · D Delegetee · E Parent Task
 *   F Department · G Task Title · H Task · I Prority · J Score · K Due Date
 *   L Status · M Proof Required · N Approval Required · O Document Required
 *   P Revised Date · Q Count of Revisions · R Remark · S Proof of Completion
 *   T Completion Time · U Sub Monitoring · V Last Reminder Sent
 */
const delegationSchema = new mongoose.Schema(
  {
    taskId: { type: String, required: true, unique: true, index: true },
    delegator: { type: String, required: true, trim: true, index: true },
    delegatee: { type: String, required: true, trim: true, index: true },
    parentTask: { type: String, default: '' },
    department: { type: String, trim: true, default: '' },
    taskTitle: { type: String, required: true, trim: true },
    task: { type: String, default: '' },
    priority: { type: String, enum: ['High', 'Medium', 'Low', ''], default: '' },
    score: { type: Number, default: null },
    dueDate: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: [
        'Pending',
        'Hold',
        'In Progress',
        'Approval Waiting',
        'Completed',
        'Completed With Delay',
        'Overdue',
      ],
      default: 'Pending',
      index: true,
    },
    proofRequired: { type: String, enum: ['Yes', 'No'], default: 'No' },
    approvalRequired: { type: String, enum: ['Yes', 'No'], default: 'No' },
    documentRequired: { type: String, enum: ['Yes', 'No'], default: 'No' },

    revisedDate: { type: Date, default: null },
    countOfRevisions: { type: Number, default: 0 },
    remarks: { type: [remarkEntrySchema], default: [] },

    proofOfCompletion: { type: String, default: '' },
    completionTime: { type: Date, default: null },

    // Holds the *name* of the monitor, or 'No' when disabled (same as the sheet).
    subMonitoring: { type: String, default: 'No' },
    lastReminderSent: { type: Date, default: null },
  },
  { timestamps: true }
);

delegationSchema.index({ delegator: 1, status: 1 });
delegationSchema.index({ delegatee: 1, status: 1 });

module.exports = mongoose.model('DelegationTask', delegationSchema);

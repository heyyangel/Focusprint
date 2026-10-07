import { useEffect, useState } from 'react';
import SlidePanel from '../SlidePanel';
import { fmtDateTime } from '../../utils/format';
import { toast } from '../../utils/ui';

const STATUS_CHOICES = ['Pending', 'Hold', 'In Progress', 'Completed'];

/**
 * Bulk "Update Status & Remarks" drawer — port of renderBulkRemarkTasks() and
 * submitBulkRemark() from Delegation.html. Each selected task gets its own
 * status dropdown and remark box; the remark is mandatory.
 */
export default function RemarkPanel({ open, onClose, tasks, onSubmit }) {
  const [rows, setRows] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next = {};
    tasks.forEach((t) => {
      next[t.taskId] = { status: '', remark: '', invalid: false };
    });
    setRows(next);
  }, [open, tasks]);

  const set = (taskId, patch) =>
    setRows((r) => ({ ...r, [taskId]: { ...r[taskId], ...patch, invalid: false } }));

  const submit = async () => {
    const updates = tasks.map((t) => ({
      taskId: t.taskId,
      status: rows[t.taskId]?.status || '',
      remark: (rows[t.taskId]?.remark || '').trim(),
    }));

    const empties = updates.filter((u) => !u.remark).map((u) => u.taskId);
    if (empties.length) {
      setRows((r) => {
        const next = { ...r };
        empties.forEach((id) => {
          next[id] = { ...next[id], invalid: true };
        });
        return next;
      });
      toast('Please enter a remark for all listed tasks', 'warning');
      return;
    }

    setBusy(true);
    try {
      await onSubmit(updates);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      width="max-w-md"
      icon="fa-comment-dots"
      title="Status & remarks"
      subtitle="Log an update against each task"
      footer={
        <>
          <button type="button" className="fp-btn-ghost flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="fp-btn-primary flex-1"
          >
            {busy ? (
              <>
                <i className="fas fa-circle-notch fa-spin" /> Submitting…
              </>
            ) : (
              'Submit Updates'
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-brand-50 text-brand-800 text-xs rounded-xl p-3 border border-brand-100 font-medium">
          Updating status and adding remarks for{' '}
          <span className="font-bold">{tasks.length}</span> selected task(s).
        </div>

        {tasks.map((task) => {
          const row = rows[task.taskId] || {};
          return (
            <div key={task.taskId} className="bg-white border border-sand-200 rounded-2xl p-4 space-y-3 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono text-[10px] font-bold bg-sand-100 text-sand-700 px-2 py-0.5 rounded-lg">
                    {task.taskId}
                  </span>
                  <h4 className="text-sm font-semibold text-sand-900 mt-1.5 truncate" title={task.taskTitle}>
                    {task.taskTitle}
                  </h4>
                </div>
                <span className="text-[10px] text-sand-400 font-medium shrink-0">
                  {fmtDateTime(task.timestamp)}
                </span>
              </div>

              <p className="text-xs text-sand-600 line-clamp-2 leading-relaxed bg-sand-50 border border-sand-100 rounded-lg p-2">
                {task.task || '—'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-sand-500 mb-1 uppercase tracking-wide">
                    Status
                  </label>
                  <select
                    className="fp-input-sm"
                    value={row.status || ''}
                    onChange={(e) => set(task.taskId, { status: e.target.value })}
                  >
                    <option value="">— Keep Current —</option>
                    {STATUS_CHOICES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-sand-500 mb-1 uppercase tracking-wide">
                    Remark *
                  </label>
                  <input
                    className={`fp-input-sm ${row.invalid ? 'border-red-400 bg-red-50/60' : ''}`}
                    placeholder="Type remark update…"
                    value={row.remark || ''}
                    onChange={(e) => set(task.taskId, { remark: e.target.value })}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SlidePanel>
  );
}

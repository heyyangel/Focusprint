import { useEffect, useState } from 'react';
import SlidePanel from '../SlidePanel';
import { toast } from '../../utils/ui';

const MAX_UPLOAD_MB = 15;

/**
 * "Action Manager" drawer — port of openCompleteSidebar()/submitComplete().
 * Each selected task independently chooses Complete (proof + remark) or
 * Revise (new due date + reason).
 */
export default function ActionSidebar({ open, onClose, tasks, defaultMode = 'complete', onSubmit }) {
  const [state, setState] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const next = {};
    tasks.forEach((t) => {
      next[t.key] = {
        mode: tasks.length === 1 ? defaultMode : 'complete',
        remark: '',
        revisedDate: '',
        reviseRemark: '',
        file: null,
      };
    });
    setState(next);
  }, [open, tasks, defaultMode]);

  const set = (key, patch) => setState((s) => ({ ...s, [key]: { ...s[key], ...patch } }));

  const pickFile = (key, file) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast(`File too large (max ${MAX_UPLOAD_MB}MB)`, 'error');
      return;
    }
    set(key, { file });
  };

  const submit = async () => {
    const actions = [];
    for (const task of tasks) {
      const s = state[task.key] || {};
      if (s.mode === 'revise') {
        if (!s.revisedDate) {
          toast(`Please select a Revised Date & Time for ${task.taskId}`, 'warning');
          return;
        }
        if (!s.reviseRemark.trim()) {
          toast(`Please specify a Revision Reason for ${task.taskId}`, 'warning');
          return;
        }
        actions.push({ task, mode: 'revise', revisedDate: s.revisedDate, remark: s.reviseRemark.trim() });
      } else {
        if (task.proofRequired === 'Yes' && !s.file) {
          toast(`Please upload proof for task: ${task.taskId}`, 'warning');
          return;
        }
        actions.push({ task, mode: 'complete', remark: (s.remark || '').trim(), file: s.file || null });
      }
    }

    setBusy(true);
    try {
      await onSubmit(actions);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      icon="fa-circle-check"
      title="Action manager"
      subtitle="Complete or revise each task"
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
            <i className={`fas ${busy ? 'fa-circle-notch fa-spin' : 'fa-circle-check'}`} />
            {busy ? 'Submitting…' : 'Submit actions'}
          </button>
        </>
      }
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold text-sand-900">{tasks.length} selected</h3>
        <p className="text-xs text-sand-500">Choose an action and add a remark for each one.</p>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => {
          const s = state[task.key] || {};
          const mode = s.mode || 'complete';
          return (
            <div key={task.key} className="p-4 bg-white rounded-2xl border border-sand-200 shadow-card space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-sand-400 uppercase tracking-wider">
                    Task Description
                  </span>
                  <div className="text-sm font-bold text-sand-900 leading-snug break-words">
                    {task.taskDescription || '—'}
                  </div>
                  <div className="text-[10px] text-sand-400 font-mono mt-0.5">
                    {task.type === 'delegation' ? 'Delegation' : 'Checklist'} · {task.taskId} · Doer: {task.name}
                  </div>
                </div>

                <div className="bg-sand-100 p-0.5 rounded-lg flex shrink-0 self-start border border-sand-200">
                  {['complete', 'revise'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => set(task.key, { mode: m })}
                      className={`px-2.5 py-1 text-[9px] font-bold rounded transition-all ${
                        mode === m ? 'bg-white text-brand-700 shadow-sm' : 'text-sand-500 hover:text-sand-700'
                      }`}
                    >
                      <i className={`fas ${m === 'complete' ? 'fa-check-circle' : 'fa-calendar-alt'} mr-1`} />
                      {m === 'complete' ? 'Complete' : 'Revise'}
                    </button>
                  ))}
                </div>
              </div>

              {mode === 'complete' ? (
                <div className="space-y-3 pt-3 border-t border-dashed border-sand-200">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 bg-sand-50 px-3 py-2.5 rounded-xl border border-sand-200">
                    <span className="text-[10px] font-bold text-sand-500 uppercase tracking-wider">
                      Proof of Completion
                    </span>
                    <div className="flex flex-col items-start sm:items-end gap-1">
                      <label
                        className={`flex items-center gap-1 px-2 py-1 rounded border cursor-pointer transition-all ${
                          s.file
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-brand-50 hover:bg-brand-100 text-brand-700 border-brand-200'
                        }`}
                      >
                        <i className={`fas ${s.file ? 'fa-check' : 'fa-paperclip'} text-[10px]`} />
                        <span className="text-[9px] font-bold">{s.file ? 'Attached' : 'Attach Proof'}</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => pickFile(task.key, e.target.files?.[0])}
                        />
                      </label>
                      <span className={`text-[10px] font-semibold ${task.proofRequired === 'Yes' ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {task.proofRequired === 'Yes' ? 'Required (goes for review)' : 'Optional (auto-verifies)'}
                      </span>
                      {s.file && (
                        <span className="text-[10px] text-sand-500 max-w-[160px] truncate">{s.file.name}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-sand-400 uppercase tracking-wider mb-1">
                      Completion Remark
                    </label>
                    <textarea
                      rows={2}
                      className="fp-input-sm resize-none"
                      placeholder="Type comments/remarks…"
                      value={s.remark || ''}
                      onChange={(e) => set(task.key, { remark: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-3 border-t border-dashed border-sand-200">
                  <div>
                    <label className="block text-[10px] font-bold text-sand-400 uppercase tracking-wider mb-1">
                      <i className="far fa-calendar-alt text-brand-500 mr-1" />New Revised Date &amp; Time *
                    </label>
                    <input
                      type="datetime-local"
                      className="fp-input-sm font-semibold"
                      value={s.revisedDate || ''}
                      onChange={(e) => set(task.key, { revisedDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-sand-400 uppercase tracking-wider mb-1">
                      <i className="fas fa-comment-dots text-brand-500 mr-1" />Revision Reason *
                    </label>
                    <textarea
                      rows={2}
                      className="fp-input-sm resize-none"
                      placeholder="Specify why the date is being revised…"
                      value={s.reviseRemark || ''}
                      onChange={(e) => set(task.key, { reviseRemark: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SlidePanel>
  );
}

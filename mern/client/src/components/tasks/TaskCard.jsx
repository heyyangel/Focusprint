import { Avatar, Pill } from '../common';
import { fmtDate, fmtDateTime, completionGap, delayText, latestRemark, parseDate } from '../../utils/format';
import { FREQUENCY_STYLES, STATUS_STYLES } from '../../utils/ui';
import { showRemarkTimeline } from '../RemarkTimeline';

const GAP_TONES = {
  late: 'bg-red-50 text-red-700 ring-1 ring-red-100',
  early: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  ontime: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
};

/** One task tile in the Task Center card view. */
export default function TaskCard({ task, selected, onToggle }) {
  const isCompleted = !!task.actual;
  const due = parseDate(task.revisedDate || task.dueDate);
  const isOverdue = due && due < new Date() && !isCompleted;

  const statusLabel =
    task.type === 'delegation' && task.status ? task.status : isCompleted ? 'Completed' : 'Pending';
  const statusTone =
    STATUS_STYLES[statusLabel] ||
    (isOverdue ? STATUS_STYLES.Overdue : STATUS_STYLES.Pending);

  const gap = completionGap(task.dueDate, task.actual);
  const overdueLabel = !gap && isOverdue ? delayText(task.dueDate, isCompleted).replace(/[()]/g, '').trim() : null;

  const verifier = (task.verifiedBy || '').trim();
  const isVerified =
    task.type === 'checklist'
      ? !!task.verified
      : ['Completed', 'Completed With Delay'].includes(task.status);

  const monitor = String(task.subMonitoring || '').trim();
  const remark = latestRemark(task.remarks ?? task.remark);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle())}
      className={`relative bg-white rounded-2xl border transition-all duration-150 flex flex-col overflow-hidden cursor-pointer
        ${selected
          ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-raised'
          : 'border-sand-200/70 shadow-card hover:shadow-raised hover:border-sand-300'}`}
    >
      {/* Overdue accent rail */}
      {isOverdue && <span className="absolute inset-y-0 left-0 w-1 bg-red-500" />}

      {/* Identity row */}
      <div className="flex items-start gap-2.5 p-3.5 pb-2.5">
        {/* Padded label so the tap area is ~32px without a chunky checkbox. */}
        <label className="shrink-0 p-1.5 -m-1.5 cursor-pointer" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            className="block w-5 h-5 accent-brand-600"
            checked={selected}
            onChange={onToggle}
            aria-label={`Select ${task.taskId}`}
          />
        </label>
        <Avatar name={task.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-sand-900 truncate leading-tight">{task.name || '—'}</p>
          <p className="text-[11px] text-sand-400 font-mono">{task.taskId}</p>
          {monitor && monitor !== 'No' && (
            <span className="mt-1.5 fp-chip bg-brand-50 text-brand-700 border-brand-200" title={`Monitored by: ${monitor}`}>
              <i className="fas fa-eye text-[8px]" /> {monitor}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Pill tone={statusTone}>{statusLabel}</Pill>
          <Pill tone={FREQUENCY_STYLES[task.frequency] || FREQUENCY_STYLES.Once}>
            {task.frequency || 'Once'}
          </Pill>
        </div>
      </div>

      {/* Description */}
      <p
        className="px-3.5 pb-3 text-[13px] text-sand-600 line-clamp-2 leading-relaxed"
        title={task.taskDescription}
      >
        {task.taskDescription || '—'}
      </p>

      {/* Due / actual / gap */}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-3.5 py-2.5 bg-sand-50 border-y border-sand-200/70 items-center">
        <div>
          <p className="text-[10px] text-sand-400 font-bold uppercase tracking-wider">Due</p>
          <p className={`text-[13px] font-medium ${isOverdue ? 'text-red-600' : 'text-sand-800'}`}>
            {fmtDate(task.dueDate, '—')}
          </p>
          {task.revisedDate && (
            <p className="text-[11px] text-brand-600 font-bold" title="Revised due date">
              <i className="far fa-calendar text-[9px] mr-0.5" />
              Rev {fmtDate(task.revisedDate)}
            </p>
          )}
        </div>
        <div>
          <p className="text-[10px] text-sand-400 font-bold uppercase tracking-wider">Actual</p>
          <p className="text-[13px] font-medium text-sand-800">{task.actual ? fmtDate(task.actual) : '—'}</p>
        </div>
        <div>
          {gap && <span className={`fp-pill ${GAP_TONES[gap.tone]}`}>{gap.label}</span>}
          {overdueLabel && <span className="fp-pill bg-red-50 text-red-700 ring-1 ring-red-100">{overdueLabel}</span>}
        </div>
      </div>

      {/* Proof-required banner */}
      {task.proofRequired === 'Yes' && (
        <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 border-b border-amber-100">
          <i className="fas fa-paperclip text-amber-600 text-xs" />
          <span className="text-[11px] font-bold text-amber-800">Proof required to complete</span>
        </div>
      )}

      {/* Document + remark */}
      <div className="grid grid-cols-2 gap-2 px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-1.5 min-w-0 text-sand-600">
          <i className="fas fa-file-lines text-sand-400 text-[11px] shrink-0" />
          <span className="truncate">{task.document ? 'Document attached' : 'No document'}</span>
          {task.document && (
            <a
              href={task.document}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(e) => e.stopPropagation()}
              title="Open document"
              aria-label="Open document"
              className="shrink-0 w-8 h-8 -my-1.5 grid place-items-center rounded-lg text-brand-600 hover:bg-brand-50 transition"
            >
              <i className="fas fa-arrow-up-right-from-square text-[10px]" />
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            showRemarkTimeline(task.remarks ?? task.remark);
          }}
          className="flex items-center gap-1.5 min-w-0 text-brand-600 hover:text-brand-800 transition text-left"
          title="View remark history"
        >
          <i className="fas fa-comment-dots text-[11px] shrink-0" />
          <span className="truncate underline underline-offset-2 decoration-brand-200">
            {remark || 'No remarks'}
          </span>
        </button>
      </div>

      {/* Verification footer */}
      <div className="mt-auto flex justify-between items-end gap-2 px-3.5 py-2.5 border-t border-sand-200/70 bg-sand-50/60 text-[11px]">
        <div className="min-w-0">
          {verifier ? (
            isVerified ? (
              <>
                <span className="text-emerald-700 font-bold flex items-center gap-1 truncate">
                  <i className="fas fa-circle-check text-[11px]" /> Verified · {verifier}
                </span>
                {task.verifiedTimestamp && (
                  <span className="block text-sand-400 ml-4">{fmtDateTime(task.verifiedTimestamp)}</span>
                )}
              </>
            ) : (
              <span
                className="text-amber-700 font-bold flex items-center gap-1 truncate"
                title={`Verification is pending by ${verifier}`}
              >
                <i className="fas fa-user-clock text-[11px]" /> Awaiting {verifier}
              </span>
            )
          ) : (
            <span className="text-sand-400">No verifier assigned</span>
          )}
        </div>
        <span className="text-sand-400 font-mono shrink-0">{fmtDate(task.createdAt)}</span>
      </div>
    </article>
  );
}

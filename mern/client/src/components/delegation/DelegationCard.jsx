import { Avatar, Pill } from '../common';
import { fmtDate, fmtDateTime, latestRemark, starsForScore, parseDate } from '../../utils/format';
import { PRIORITY_STYLES, STATUS_STYLES, STATUS_ICONS } from '../../utils/ui';
import { showRemarkTimeline } from '../RemarkTimeline';

/**
 * Phone/tablet presentation of a delegation row. The desktop table pins five
 * leading columns, which would push the task text ~600px off-screen on a phone,
 * so below `lg` each row is rendered as a self-contained card instead.
 */
export default function DelegationCard({ row, selected, onToggle, onEdit, onRemark, onDelete, canEdit }) {
  const due = parseDate(row.revisedDate || row.dueDate);
  const isOverdue = due && due < new Date() && !String(row.status).includes('Completed');
  const stars = starsForScore(row.score);
  const remark = latestRemark(row.remarks);
  const hasHistory = (row.remarks || []).length > 0;
  const monitor = String(row.subMonitoring || '').trim();

  return (
    <article
      className={`relative bg-white rounded-2xl border transition-all duration-150 overflow-hidden ${
        selected ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-sand-200/70 shadow-card'
      }`}
    >
      {isOverdue && <span className="absolute inset-y-0 left-0 w-1 bg-red-500" />}

      {/* Header: select, id, status */}
      <div className="flex items-start gap-2.5 p-3.5 pb-2">
        {/* Padded label so the tap area is ~32px without a chunky checkbox. */}
        <label className="shrink-0 p-1.5 -m-1.5 cursor-pointer">
          <input
            type="checkbox"
            className="block w-5 h-5 accent-brand-600"
            checked={selected}
            onChange={onToggle}
            aria-label={`Select ${row.taskId}`}
          />
        </label>
        <div className="min-w-0 flex-1">
          <span className="font-mono text-[11px] font-bold bg-sand-100 text-sand-700 px-2 py-0.5 rounded-md">
            {row.taskId}
          </span>
          <span className="block text-[11px] text-sand-400 mt-1">{fmtDateTime(row.timestamp)}</span>
        </div>
        <Pill
          tone={STATUS_STYLES[row.status] || 'bg-sand-100 text-sand-600'}
          icon={STATUS_ICONS[row.status] || 'fa-circle'}
        >
          {row.status || '—'}
        </Pill>
      </div>

      {/* Task */}
      <div className="px-3.5 pb-3">
        <h3 className="text-sm font-bold text-sand-900 break-words leading-snug">{row.taskTitle}</h3>
        {row.task && <p className="text-[13px] text-sand-600 mt-1 break-words leading-relaxed">{row.task}</p>}
      </div>

      {/* Flow */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3.5 py-2.5 bg-sand-50 border-y border-sand-200/70 text-xs">
        <span className="text-sand-500">From</span>
        <span className="font-semibold text-sand-800">{row.delegator}</span>
        <i className="fas fa-arrow-right text-[10px] text-sand-300" />
        <span className="inline-flex items-center gap-1.5">
          <Avatar name={row.delegatee} size="xs" />
          <span className="font-semibold text-sand-900">{row.delegatee}</span>
        </span>
        {monitor && monitor !== 'No' && (
          <span className="fp-chip bg-brand-50 text-brand-700 border-brand-200" title={`Monitored by: ${monitor}`}>
            <i className="fas fa-eye text-[8px]" /> {monitor}
          </span>
        )}
      </div>

      {/* Facts */}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 px-3.5 py-3 text-xs">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-sand-400">Due</dt>
          <dd className={`font-medium ${isOverdue ? 'text-red-600' : 'text-sand-800'}`}>
            {isOverdue && <i className="fas fa-circle-exclamation mr-1" />}
            {fmtDate(row.dueDate, '—')}
          </dd>
          {row.revisedDate && (
            <dd className="text-[11px] text-brand-600 font-bold">Rev {fmtDate(row.revisedDate)}</dd>
          )}
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-sand-400">Priority</dt>
          <dd className="flex items-center gap-1.5 flex-wrap">
            <Pill tone={PRIORITY_STYLES[row.priority] || 'bg-sand-100 text-sand-600'}>
              {row.priority || '—'}
            </Pill>
            {row.score !== '' && row.score !== null && (
              <span className="inline-flex items-center gap-0.5">
                <span className="font-bold text-sand-700 tabular">{row.score}</span>
                {[1, 2, 3, 4].map((s) => (
                  <i
                    key={s}
                    className={s <= stars ? 'fas fa-star text-amber-400 text-[9px]' : 'far fa-star text-sand-200 text-[9px]'}
                  />
                ))}
              </span>
            )}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-sand-400">Department</dt>
          <dd className="text-sand-700 truncate">{row.department || '—'}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-sand-400">Revisions</dt>
          <dd className="text-sand-700 tabular">{row.countOfRevisions || 0}</dd>
        </div>
        {row.parentTask && (
          <div className="col-span-2 min-w-0">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-sand-400">Parent task</dt>
            <dd className="text-sand-700 truncate">{row.parentTask}</dd>
          </div>
        )}
      </dl>

      {/* Requirements */}
      {(row.proofRequired === 'Yes' || row.approvalRequired === 'Yes' || row.documentRequired === 'Yes') && (
        <div className="flex flex-wrap gap-1.5 px-3.5 pb-3">
          {row.proofRequired === 'Yes' && (
            <span className="fp-chip bg-amber-50 text-amber-700 border-amber-100">
              <i className="fas fa-paperclip text-[9px]" /> Proof
            </span>
          )}
          {row.approvalRequired === 'Yes' && (
            <span className="fp-chip bg-blue-50 text-blue-700 border-blue-100">
              <i className="fas fa-user-check text-[9px]" /> Approval
            </span>
          )}
          {row.documentRequired === 'Yes' && (
            <span className="fp-chip bg-teal-50 text-teal-700 border-teal-100">
              <i className="fas fa-file-signature text-[9px]" /> Doc
            </span>
          )}
        </div>
      )}

      {/* Remark + proof */}
      <div className="px-3.5 pb-3 space-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <i className="fas fa-comment-dots text-sand-400 text-[11px] shrink-0" />
          <span className="truncate text-sand-600">{remark || 'No remarks'}</span>
          {hasHistory && (
            <button
              type="button"
              onClick={() => showRemarkTimeline(row.remarks)}
              aria-label={`Remark history for ${row.taskId}`}
              className="w-8 h-8 -my-1.5 grid place-items-center rounded-lg text-brand-600 hover:bg-brand-50 hover:text-brand-800 shrink-0 transition"
            >
              <i className="fas fa-clock-rotate-left text-[11px]" />
            </button>
          )}
        </div>
        {row.proofOfCompletion && (
          <a
            href={row.proofOfCompletion}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 border border-brand-200 px-3 py-1.5 rounded-lg font-bold"
          >
            <i className="fas fa-arrow-up-right-from-square text-[10px]" /> Proof
          </a>
        )}
        {row.completionTime && (
          <div className="text-sand-400">
            <i className="far fa-clock text-[10px] mr-1" />
            Completed {fmtDateTime(row.completionTime)}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-t border-sand-200/70 bg-sand-50/60">
        <button type="button" onClick={onRemark} className="fp-btn-ghost flex-1 py-1.5 text-xs">
          <i className="fas fa-comment-dots" /> Remark
        </button>
        {canEdit && (
          <>
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${row.taskId}`}
              className="w-9 h-9 grid place-items-center rounded-xl border border-sand-200 bg-white text-sand-500 hover:text-brand-700 transition"
            >
              <i className="fas fa-pen text-xs" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Delete ${row.taskId}`}
              className="w-9 h-9 grid place-items-center rounded-xl border border-sand-200 bg-white text-sand-500 hover:text-red-600 hover:border-red-200 transition"
            >
              <i className="fas fa-trash-can text-xs" />
            </button>
          </>
        )}
      </div>
    </article>
  );
}

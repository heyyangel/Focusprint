import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { delegationApi, userApi } from '../api/services';
import {
  PageBody, Toolbar, Section, StatGrid, StatCard, RoleSwitcher, SearchInput,
  FilterButton, ExportButton, Avatar, Pill, Spinner, EmptyState, ErrorState,
} from '../components/common';
import Pagination from '../components/Pagination';
import DelegationFilterPanel, { DEFAULT_DELEGATION_FILTERS } from '../components/delegation/DelegationFilterPanel';
import DelegationForm from '../components/delegation/DelegationForm';
import RemarkPanel from '../components/delegation/RemarkPanel';
import DelegationCard from '../components/delegation/DelegationCard';
import { showRemarkTimeline } from '../components/RemarkTimeline';
import {
  fmtDate, fmtDateTime, toISODate, parseDate, latestRemark, starsForScore, downloadCsv, todayISO,
} from '../utils/format';
import { toast, confirmDialog, alertDialog, PRIORITY_STYLES, STATUS_STYLES, STATUS_ICONS } from '../utils/ui';
import { canCreateTasks, canRemarkDelegation, roleSwitcherOptions, filterDelegationByRole } from '../utils/permissions';

const EXPORT_COLUMNS = [
  { label: 'Timestamp', value: (r) => fmtDateTime(r.timestamp) },
  { label: 'Task Id', value: (r) => r.taskId },
  { label: 'Delegator', value: (r) => r.delegator },
  { label: 'Delegatee', value: (r) => r.delegatee },
  { label: 'Parent Task', value: (r) => r.parentTask },
  { label: 'Department', value: (r) => r.department },
  { label: 'Task Title', value: (r) => r.taskTitle },
  { label: 'Task', value: (r) => r.task },
  { label: 'Priority', value: (r) => r.priority },
  { label: 'Score', value: (r) => r.score },
  { label: 'Due Date', value: (r) => fmtDateTime(r.dueDate) },
  { label: 'Status', value: (r) => r.status },
  { label: 'Proof Required', value: (r) => r.proofRequired },
  { label: 'Approval Required', value: (r) => r.approvalRequired },
  { label: 'Document Required', value: (r) => r.documentRequired },
  { label: 'Revised Date', value: (r) => fmtDateTime(r.revisedDate) },
  { label: 'Count of Revisions', value: (r) => r.countOfRevisions },
  { label: 'Sub Monitoring', value: (r) => r.subMonitoring },
  { label: 'Latest Remark', value: (r) => latestRemark(r.remarks) },
  { label: 'Proof of Completion', value: (r) => r.proofOfCompletion },
  { label: 'Completion Time', value: (r) => fmtDateTime(r.completionTime) },
];

/**
 * The five frozen leading columns. Each column's left offset is derived from
 * the widths before it, and every frozen cell is pinned to exactly its width,
 * so the browser can never widen a column and push the offsets out of sync.
 */
const FROZEN_WIDTHS = [48, 132, 150, 170, 160];
const FROZEN = FROZEN_WIDTHS.map((width, i) => {
  const left = FROZEN_WIDTHS.slice(0, i).reduce((sum, w) => sum + w, 0);
  return { width, style: { left, width, minWidth: width, maxWidth: width } };
});
const frozen = (i) => FROZEN[i].style;

export default function Delegation() {
  const { user } = useAuth();
  const switcherOptions = useMemo(() => roleSwitcherOptions(user), [user]);

  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tab, setTab] = useState(switcherOptions[0]?.value || 'tome');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(DEFAULT_DELEGATION_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState(new Set());

  const [filterOpen, setFilterOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [remarkTargets, setRemarkTargets] = useState([]);

  const mayCreate = canCreateTasks(user);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await delegationApi.list());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    Promise.all([userApi.list(), userApi.hierarchy(), userApi.departments()])
      .then(([u, h, d]) => {
        setUsers(u);
        setHierarchy(h);
        setDepartments(d);
      })
      .catch(() => toast('Could not load the Doer List', 'error'));
  }, [load]);

  /* ── Scope + filtering ───────────────────────────────────────────── */
  const scoped = useMemo(() => filterDelegationByRole(rows, user, tab), [rows, user, tab]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: scoped.length,
      pending: scoped.filter((r) => r.status === 'Pending').length,
      awaiting: scoped.filter((r) => r.status === 'Approval Waiting').length,
      overdue: scoped.filter((r) => {
        const d = parseDate(r.revisedDate || r.dueDate);
        return d && d < now && !String(r.status).includes('Completed');
      }).length,
    };
  }, [scoped]);

  const filtered = useMemo(() => {
    let data = scoped;

    if (filters.delegators.length) data = data.filter((r) => filters.delegators.includes(r.delegator));
    if (filters.delegatees.length) data = data.filter((r) => filters.delegatees.includes(r.delegatee));
    if (filters.priorities.length) data = data.filter((r) => filters.priorities.includes(r.priority));
    if (filters.statuses.length) data = data.filter((r) => filters.statuses.includes(r.status));
    if (filters.departments.length) data = data.filter((r) => filters.departments.includes(r.department));

    if (filters.fromDate || filters.toDate) {
      data = data.filter((r) => {
        const iso = toISODate(r.revisedDate || r.dueDate);
        if (!iso) return false;
        if (filters.fromDate && iso < filters.fromDate) return false;
        if (filters.toDate && iso > filters.toDate) return false;
        return true;
      });
    }

    const q = search.trim().toLowerCase();
    if (q) {
      data = data.filter((r) =>
        [r.taskTitle, r.task, r.delegator, r.delegatee, r.taskId, r.subMonitoring, r.department]
          .some((v) => String(v || '').toLowerCase().includes(q))
      );
    }
    return data;
  }, [scoped, filters, search]);

  useEffect(() => setPage(1), [tab, filters, search, pageSize]);

  const pageRows = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const filterCount =
    filters.delegators.length + filters.delegatees.length + filters.priorities.length +
    filters.statuses.length + filters.departments.length +
    (filters.fromDate ? 1 : 0) + (filters.toDate ? 1 : 0);

  const options = useMemo(
    () => ({
      delegators: [...new Set(rows.map((r) => r.delegator).filter(Boolean))].sort(),
      delegatees: [...new Set(rows.map((r) => r.delegatee).filter(Boolean))].sort(),
      departments: [...new Set(rows.map((r) => r.department).filter(Boolean))].sort(),
    }),
    [rows]
  );

  const parentTaskOptions = useMemo(
    () => [...new Set(rows.map((r) => `${r.taskId} | ${r.taskTitle}`))].sort(),
    [rows]
  );

  /* ── Selection ───────────────────────────────────────────────────── */
  const toggleRow = (taskId) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.taskId));
  const toggleAllOnPage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageRows.forEach((r) => next.delete(r.taskId));
      else pageRows.forEach((r) => next.add(r.taskId));
      return next;
    });

  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r.taskId)), [rows, selected]);

  /* ── Actions ─────────────────────────────────────────────────────── */
  const saveTask = async (payload) => {
    try {
      const res = editing
        ? await delegationApi.update(editing.taskId, payload)
        : await delegationApi.create(payload);
      toast(res.message);
      setFormOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const deleteTasks = async (ids) => {
    const ok = await confirmDialog({
      title: ids.length === 1 ? 'Delete this task?' : `Delete ${ids.length} tasks?`,
      text: 'This action cannot be undone.',
      confirmButtonText: 'Yes, delete',
    });
    if (!ok) return;
    try {
      const res = await delegationApi.remove(ids);
      toast(res.message);
      setSelected(new Set());
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const openRemarks = (candidates) => {
    const allowed = candidates.filter((r) => canRemarkDelegation(user, r));
    const blocked = candidates.filter((r) => !canRemarkDelegation(user, r));

    if (!allowed.length) {
      alertDialog({
        title: 'Permission Denied',
        text: 'Only the Boss or the task delegator can add remarks or update status for these tasks.',
        icon: 'error',
      });
      return;
    }
    if (blocked.length) toast(`${blocked.length} task(s) skipped — you are not their delegator.`, 'info');
    setRemarkTargets(allowed);
  };

  const submitRemarks = async (updates) => {
    try {
      const res = await delegationApi.bulkStatusRemark(updates);
      toast(res.message);
      setRemarkTargets([]);
      setSelected(new Set());
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const exportCsv = () => {
    if (!filtered.length) {
      toast('No data to export', 'warning');
      return;
    }
    downloadCsv(`delegation_export_${todayISO()}.csv`, EXPORT_COLUMNS, filtered);
    toast('Exported successfully');
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <PageBody>
      <StatGrid>
        <StatCard label="In view" value={stats.total} icon="fa-layer-group" tone="brand" hint="Tasks in this tab" />
        <StatCard label="Pending" value={stats.pending} icon="fa-clock" tone="amber" hint="Not started or in progress" />
        <StatCard label="Approval waiting" value={stats.awaiting} icon="fa-user-clock" tone="blue" hint="Done, needs sign-off" />
        <StatCard label="Overdue" value={stats.overdue} icon="fa-triangle-exclamation" tone="red" hint="Past the due date" />
      </StatGrid>

      <Section
        title="Delegated tasks"
        icon="fa-diagram-project"
        description={`${filtered.length} matching task${filtered.length === 1 ? '' : 's'}`}
        actions={
          <Toolbar>
            {switcherOptions.length > 0 && (
              <RoleSwitcher options={switcherOptions} value={tab} onChange={setTab} />
            )}
            <SearchInput value={search} onChange={setSearch} placeholder="Search tasks…" />
            <FilterButton count={filterCount} onClick={() => setFilterOpen(true)} />
            <ExportButton onClick={exportCsv} />
            {mayCreate && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                className="fp-btn-primary flex-1 sm:flex-none"
              >
                <i className="fas fa-plus" /> Add Task
              </button>
            )}
          </Toolbar>
        }
      >
        {loading ? (
          <Spinner label="Loading tasks…" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No tasks found" hint="Try clearing filters or switching tabs." />
        ) : (
          <>
            {/* Phone / tablet: one card per task */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3 p-3 sm:p-4 bg-sand-50/50">
              {pageRows.map((row) => (
                <DelegationCard
                  key={row.taskId}
                  row={row}
                  selected={selected.has(row.taskId)}
                  canEdit={mayCreate}
                  onToggle={() => toggleRow(row.taskId)}
                  onEdit={() => {
                    setEditing(row);
                    setFormOpen(true);
                  }}
                  onRemark={() => openRemarks([row])}
                  onDelete={() => deleteTasks([row.taskId])}
                />
              ))}
            </div>

            {/* Desktop: full table with frozen leading columns */}
            <div className="hidden lg:block overflow-auto scrollbar-slim max-h-[calc(100dvh-360px)] min-h-[280px]">
            <table className="min-w-full border-separate border-spacing-0">
              <colgroup>
                {FROZEN.map((c, i) => (
                  <col key={i} style={{ width: c.width }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th className={`fp-th sticky top-0 z-40 bg-sand-100 sticky-col text-center`} style={frozen(0)}>
                    <input
                      type="checkbox"
                      aria-label="Select all rows on this page"
                      className="accent-brand-600"
                      checked={allOnPageSelected}
                      onChange={toggleAllOnPage}
                    />
                  </th>
                  <th className={`fp-th sticky top-0 z-40 bg-sand-100 sticky-col text-center`} style={frozen(1)}>Actions</th>
                  <th className={`fp-th sticky top-0 z-40 bg-sand-100 sticky-col`} style={frozen(2)}>ID &amp; Created</th>
                  <th className={`fp-th sticky top-0 z-40 bg-sand-100 sticky-col`} style={frozen(3)}>Flow</th>
                  <th className={`fp-th sticky top-0 z-40 bg-sand-100 sticky-col sticky-col-last`} style={frozen(4)}>Parent &amp; Dept</th>
                  <th className="fp-th sticky top-0 z-30 bg-sand-100">Task</th>
                  <th className="fp-th sticky top-0 z-30 bg-sand-100">Priority &amp; Score</th>
                  <th className="fp-th sticky top-0 z-30 bg-sand-100">Due &amp; Status</th>
                  <th className="fp-th sticky top-0 z-30 bg-sand-100">Requirements</th>
                  <th className="fp-th sticky top-0 z-30 bg-sand-100">Revision</th>
                  <th className="fp-th sticky top-0 z-30 bg-sand-100">Remark</th>
                  <th className="fp-th sticky top-0 z-30 bg-sand-100">Proof &amp; Completion</th>
                </tr>
              </thead>

              <tbody>
                {pageRows.map((row, idx) => {
                  const isSelected = selected.has(row.taskId);
                  const due = parseDate(row.revisedDate || row.dueDate);
                  const isOverdue = due && due < new Date() && !String(row.status).includes('Completed');
                  const stars = starsForScore(row.score);
                  const remark = latestRemark(row.remarks);
                  const hasHistory = (row.remarks || []).length > 0;
                  const monitor = String(row.subMonitoring || '').trim();
                  const bg = isSelected ? 'bg-brand-50' : idx % 2 ? 'bg-sand-50' : 'bg-white';

                  return (
                    <tr key={row.taskId} className={`${bg} border-b border-sand-100 transition-colors`}>
                      <td className={`fp-td sticky-col z-10 ${bg} text-center`} style={frozen(0)}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.taskId}`}
                          className="accent-brand-600"
                          checked={isSelected}
                          onChange={() => toggleRow(row.taskId)}
                        />
                      </td>

                      <td className={`fp-td sticky-col z-10 ${bg}`} style={frozen(1)}>
                        <div className="flex items-center justify-center gap-1">
                          {mayCreate && (
                            <button
                              type="button"
                              title="Edit task"
                              aria-label={`Edit ${row.taskId}`}
                              onClick={() => {
                                setEditing(row);
                                setFormOpen(true);
                              }}
                              className="w-7 h-7 grid place-items-center rounded-lg text-sand-400 hover:bg-brand-50 hover:text-brand-700 transition"
                            >
                              <i className="fas fa-pen text-xs" />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Add remark / update status"
                            aria-label={`Remark on ${row.taskId}`}
                            onClick={() => openRemarks([row])}
                            className="w-7 h-7 grid place-items-center rounded-lg text-sand-400 hover:bg-brand-50 hover:text-brand-700 transition"
                          >
                            <i className="fas fa-comment-dots text-xs" />
                          </button>
                          {mayCreate && (
                            <button
                              type="button"
                              title="Delete task"
                              aria-label={`Delete ${row.taskId}`}
                              onClick={() => deleteTasks([row.taskId])}
                              className="w-7 h-7 grid place-items-center rounded-lg text-sand-400 hover:bg-red-50 hover:text-red-600 transition"
                            >
                              <i className="fas fa-trash-can text-xs" />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className={`fp-td sticky-col z-10 ${bg}`} style={frozen(2)}>
                        <span className="font-mono text-xs bg-sand-100 text-sand-800 px-2 py-1 rounded-lg font-bold">
                          {row.taskId}
                        </span>
                        <div className="text-[11px] text-sand-400 mt-1.5" title="Creation date">
                          {fmtDateTime(row.timestamp)}
                        </div>
                      </td>

                      <td className={`fp-td sticky-col z-10 ${bg}`} style={frozen(3)}>
                        <div className="text-[11px] text-sand-400 mb-1">
                          From <span className="font-semibold text-sand-600">{row.delegator}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Avatar name={row.delegatee} size="xs" />
                          <span className="text-sm font-semibold text-sand-900 truncate max-w-[110px]" title={row.delegatee}>
                            {row.delegatee}
                          </span>
                        </div>
                        {monitor && monitor !== 'No' && (
                          <div className="mt-2 fp-chip max-w-[138px] bg-brand-50 text-brand-700 border-brand-200" title={`Monitored by: ${monitor}`}>
                            <i className="fas fa-eye text-[9px]" /> <span className="truncate">{monitor}</span>
                          </div>
                        )}
                      </td>

                      <td className={`fp-td sticky-col z-10 sticky-col-last ${bg} text-xs`} style={frozen(4)}>
                        <div className="truncate max-w-[128px] text-sm font-medium text-sand-700" title={row.parentTask}>
                          <i className="fas fa-sitemap text-[10px] mr-1 text-sand-400" />
                          {row.parentTask || '—'}
                        </div>
                        <div className="truncate max-w-[128px] text-xs text-sand-400 mt-1" title={row.department}>
                          <i className="fas fa-building text-[10px] mr-1 text-sand-300" />
                          {row.department || '—'}
                        </div>
                      </td>

                      <td className="fp-td min-w-[260px] max-w-[420px]">
                        <div className="text-sm font-bold text-sand-900 break-words">{row.taskTitle}</div>
                        <div className="text-sm text-sand-500 mt-1 break-words leading-relaxed">{row.task}</div>
                      </td>

                      <td className="fp-td">
                        <Pill tone={PRIORITY_STYLES[row.priority] || 'bg-sand-100 text-sand-600'}>
                          {row.priority || '—'}
                        </Pill>
                        <div className="mt-2 flex items-center gap-1">
                          {row.score !== '' && row.score !== null ? (
                            <>
                              <span className="font-bold text-sand-800 text-sm tabular">{row.score}</span>
                              <span className="flex">
                                {[1, 2, 3, 4].map((s) => (
                                  <i
                                    key={s}
                                    className={s <= stars ? 'fas fa-star text-amber-400 text-[10px]' : 'far fa-star text-sand-200 text-[10px]'}
                                  />
                                ))}
                              </span>
                            </>
                          ) : (
                            <span className="text-sand-300 text-xs">—</span>
                          )}
                        </div>
                      </td>

                      <td className="fp-td">
                        <Pill
                          tone={STATUS_STYLES[row.status] || 'bg-sand-100 text-sand-600'}
                          icon={STATUS_ICONS[row.status] || 'fa-circle'}
                        >
                          {row.status || '—'}
                        </Pill>
                        <div className={`mt-1.5 text-xs whitespace-nowrap ${isOverdue ? 'text-red-600 font-bold' : 'text-sand-400'}`}>
                          {isOverdue && <i className="fas fa-circle-exclamation mr-1" />}
                          {fmtDateTime(row.dueDate, '—')}
                        </div>
                      </td>

                      <td className="fp-td">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {row.proofRequired === 'Yes' && (
                            <span className="fp-chip bg-amber-50 text-amber-700 border-amber-100" title="Proof of completion required">
                              <i className="fas fa-paperclip text-[9px]" /> Proof
                            </span>
                          )}
                          {row.approvalRequired === 'Yes' && (
                            <span className="fp-chip bg-blue-50 text-blue-700 border-blue-100" title="Approval required">
                              <i className="fas fa-user-check text-[9px]" /> Approval
                            </span>
                          )}
                          {row.documentRequired === 'Yes' && (
                            <span className="fp-chip bg-teal-50 text-teal-700 border-teal-100" title="Document required">
                              <i className="fas fa-file-signature text-[9px]" /> Doc
                            </span>
                          )}
                          {row.proofRequired !== 'Yes' && row.approvalRequired !== 'Yes' && row.documentRequired !== 'Yes' && (
                            <span className="text-sand-300 text-xs">—</span>
                          )}
                        </div>
                      </td>

                      <td className="fp-td text-xs text-sand-600">
                        <div className="text-sm font-semibold truncate max-w-[120px]" title="Revised date">
                          {fmtDate(row.revisedDate) || <span className="text-sand-300">—</span>}
                        </div>
                        <div className="text-xs text-sand-400 mt-1.5">
                          <i className="fas fa-rotate-left text-[10px] mr-1 text-sand-300" />
                          {row.countOfRevisions || 0} revisions
                        </div>
                      </td>

                      <td className="fp-td max-w-[170px]">
                        <div className="flex items-center gap-1.5 justify-between font-medium">
                          <span className="truncate block max-w-[120px]" title={remark}>
                            {remark || <span className="text-sand-300">—</span>}
                          </span>
                          {hasHistory && (
                            <button
                              type="button"
                              title="View remark history"
                              aria-label={`Remark history for ${row.taskId}`}
                              onClick={() => showRemarkTimeline(row.remarks)}
                              className="text-brand-500 hover:text-brand-700 transition shrink-0"
                            >
                              <i className="fas fa-clock-rotate-left text-xs" />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="fp-td">
                        {row.proofOfCompletion ? (
                          <a
                            href={row.proofOfCompletion}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 px-2.5 py-1 rounded-lg text-xs font-bold transition"
                          >
                            <i className="fas fa-arrow-up-right-from-square text-[10px]" /> Proof
                          </a>
                        ) : (
                          <span className="text-sand-300">—</span>
                        )}
                        <div className="text-xs text-sand-400 mt-1.5 whitespace-nowrap">
                          <i className="far fa-clock text-[10px] mr-1 text-sand-300" />
                          {fmtDateTime(row.completionTime) || '—'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}

        {!loading && !error && filtered.length > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </Section>

      {/* Floating bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-2rem)] sm:w-auto max-w-md flex items-center justify-center gap-1.5 sm:gap-2 rounded-2xl bg-brand-950 text-white px-2.5 sm:px-3 py-2.5 shadow-panel animate-pop-in">
          <span className="px-1.5 sm:px-2 text-sm font-semibold tabular whitespace-nowrap">{selected.size}<span className="hidden sm:inline"> selected</span></span>
          <span className="w-px h-6 bg-white/15" />
          <button
            type="button"
            onClick={() => openRemarks(selectedRows)}
            className="fp-btn bg-white/10 hover:bg-white/20 text-white px-4 py-2"
          >
            <i className="fas fa-comment-dots" />
            <span className="hidden sm:inline">Status / Remark</span>
          </button>
          {mayCreate && (
            <button
              type="button"
              onClick={() => deleteTasks([...selected])}
              className="fp-btn bg-red-600 hover:bg-red-700 text-white px-4 py-2"
            >
              <i className="fas fa-trash-can" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            title="Clear selection"
            aria-label="Clear selection"
            className="w-9 h-9 grid place-items-center rounded-xl text-brand-200 hover:bg-white/10 hover:text-white transition"
          >
            <i className="fas fa-times" />
          </button>
        </div>
      )}

      <DelegationFilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={setFilters}
        options={options}
      />

      <DelegationForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={saveTask}
        editing={editing}
        currentUser={user}
        users={users}
        hierarchy={hierarchy}
        departments={departments}
        parentTaskOptions={parentTaskOptions}
      />

      <RemarkPanel
        open={remarkTargets.length > 0}
        onClose={() => setRemarkTargets([])}
        tasks={remarkTargets}
        onSubmit={submitRemarks}
      />
    </PageBody>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checklistApi, delegationApi, uploadApi } from '../api/services';
import {
  PageBody, Toolbar, Section, StatGrid, StatCard, RoleSwitcher,
  FilterButton, ExportButton, Pill, Spinner, EmptyState, ErrorState,
} from '../components/common';
import Pagination from '../components/Pagination';
import TaskCard from '../components/tasks/TaskCard';
import ActionSidebar from '../components/tasks/ActionSidebar';
import TasksFilterPanel, { DEFAULT_TASK_FILTERS } from '../components/tasks/TasksFilterPanel';
import { showRemarkTimeline } from '../components/RemarkTimeline';
import {
  fmtDate, fmtDateTime, toISODate, parseDate, completionGap, downloadCsv, todayISO,
} from '../utils/format';
import { toast, confirmDialog, FREQUENCY_STYLES, STATUS_STYLES } from '../utils/ui';
import { roleSwitcherOptions, filterTasksByRole, sameName } from '../utils/permissions';

/**
 * Both modules feed one unified task shape so the Task Center can mix them,
 * exactly as the Apps Script page did in checkAllDone().
 */
const fromChecklist = (t) => ({
  key: `checklist_${t.taskId}`,
  type: 'checklist',
  taskId: t.taskId,
  groupId: t.groupId,
  name: t.name,
  frequency: t.frequency || 'Once',
  taskDescription: t.taskDescription,
  dueDate: t.dueDate,
  revisedDate: null,
  actual: t.actual,
  verifiedBy: t.verifiedBy,
  verified: t.verified,
  verifiedTimestamp: t.verifiedTimestamp,
  document: t.document,
  remark: t.remark,
  proofRequired: t.proofRequired,
  status: t.actual ? 'Completed' : 'Pending',
  subMonitoring: '',
  createdAt: t.createdAt,
});

const fromDelegation = (t) => ({
  key: `delegation_${t.taskId}`,
  type: 'delegation',
  taskId: t.taskId,
  groupId: '',
  name: t.delegatee,
  frequency: 'Once',
  taskDescription: `${t.taskTitle ? `[${t.taskTitle}] ` : ''}${t.task || ''}`,
  dueDate: t.dueDate,
  revisedDate: t.revisedDate,
  actual: t.completionTime,
  verifiedBy: t.delegator,
  verified: ['Completed', 'Completed With Delay'].includes(t.status),
  verifiedTimestamp: t.completionTime,
  document: t.proofOfCompletion,
  remarks: t.remarks,
  proofRequired: t.proofRequired,
  approvalRequired: t.approvalRequired,
  status: t.status,
  subMonitoring: t.subMonitoring,
  createdAt: t.timestamp,
});

/** Labels for the removable chip shown when a lens is active. */
const QUICK_LABELS = {
  open: 'All open work',
  today: 'Due today',
  delayed: 'Delayed',
  verify: 'Awaiting my verification',
};

const EXPORT_COLUMNS = [
  { label: 'Type', value: (t) => t.type },
  { label: 'Task ID', value: (t) => t.taskId },
  { label: 'Name', value: (t) => t.name },
  { label: 'Task Description', value: (t) => t.taskDescription },
  { label: 'Frequency', value: (t) => t.frequency },
  { label: 'Due Date', value: (t) => fmtDate(t.dueDate) },
  { label: 'Revised Date', value: (t) => fmtDate(t.revisedDate) },
  { label: 'Actual', value: (t) => fmtDateTime(t.actual) },
  { label: 'Status', value: (t) => t.status },
  { label: 'Proof is Required', value: (t) => t.proofRequired },
  { label: 'Verified by', value: (t) => t.verifiedBy },
  { label: 'Verified', value: (t) => (t.verified ? 'Yes' : 'No') },
  { label: 'Document', value: (t) => t.document },
];

export default function Tasks() {
  const { user } = useAuth();
  const switcherOptions = useMemo(() => roleSwitcherOptions(user), [user]);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tab, setTab] = useState(switcherOptions[0]?.value || 'tome');
  const [module, setModule] = useState('delegation');
  const [tabAutoPicked, setTabAutoPicked] = useState(false);
  const [view, setView] = useState('card');
  const [filters, setFilters] = useState(DEFAULT_TASK_FILTERS);
  const [quick, setQuick] = useState(null); // 'delayed' | 'today' | 'verify' | null
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [selected, setSelected] = useState(new Set());

  const [filterOpen, setFilterOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionMode, setActionMode] = useState('complete');

  const [searchParams] = useSearchParams();

  /**
   * The Overview KPI tiles link here with `?quick=` so the tile you pressed
   * lands on exactly the tasks it counted. Runs on every query-string change —
   * user interactions do not touch the URL, so this never fights a filter set
   * by hand — and arriving with no parameter resets to the default view.
   */
  useEffect(() => {
    const q = searchParams.get('quick');
    const scope = searchParams.get('scope');

    // The personal tiles ("assigned to you") land on the To Me tab so the
    // destination shows the same set of tasks the tile counted.
    if (scope === 'all' || scope === 'byme' || scope === 'tome') setTab(scope);

    if (q === 'today' || q === 'delayed' || q === 'open') {
      setQuick(q);
      setFilters({ ...DEFAULT_TASK_FILTERS });
    } else if (q === 'verify') {
      // Work awaiting verification is already completed, so the default
      // "pending only" status filter would hide every one of them.
      setQuick('verify');
      setFilters({ ...DEFAULT_TASK_FILTERS, statuses: ['completed'] });
    } else {
      setQuick(null);
      setFilters({ ...DEFAULT_TASK_FILTERS });
    }
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [checklist, delegation] = await Promise.all([
        checklistApi.list().catch(() => []),
        delegationApi.list().catch(() => []),
      ]);
      setTasks([...checklist.map(fromChecklist), ...delegation.map(fromDelegation)]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Scope + filters ─────────────────────────────────────────────── */
  const scoped = useMemo(() => filterTasksByRole(tasks, user, tab), [tasks, user, tab]);

  const stats = useMemo(() => {
    const today = todayISO();
    const now = new Date();
    const open = scoped.filter((t) => !t.actual);
    return {
      open: open.length,
      dueToday: open.filter((t) => toISODate(t.revisedDate || t.dueDate) === today).length,
      delayed: open.filter((t) => {
        const d = parseDate(t.revisedDate || t.dueDate);
        return d && d < now;
      }).length,
      toVerify: scoped.filter((t) => t.actual && sameName(t.verifiedBy, user?.name) && !t.verified).length,
    };
  }, [scoped, user]);

  /**
   * The full filter chain for one module's tasks. Both the visible list and the
   * tab badges run through this, so a badge can never contradict the list — the
   * mismatch that used to show "0 results" under a badge reading 52.
   */
  const applyLens = useCallback((rows, moduleKey) => {
    let data = rows;

    if (filters.fromDate || filters.toDate) {
      data = data.filter((t) => {
        const iso = toISODate(t.revisedDate || t.dueDate);
        if (!iso) return false;
        if (filters.fromDate && iso < filters.fromDate) return false;
        if (filters.toDate && iso > filters.toDate) return false;
        return true;
      });
    } else if (quick === 'verify') {
      data = data.filter((t) => t.actual && sameName(t.verifiedBy, user?.name) && !t.verified);
    } else if (quick === 'delayed') {
      data = data.filter((t) => {
        if (t.actual) return false;
        const d = parseDate(t.revisedDate || t.dueDate);
        return d && d < new Date();
      });
    } else if (quick === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      data = data.filter((t) => {
        const d = parseDate(t.revisedDate || t.dueDate);
        return d && d >= start && d <= end;
      });
    } else if (quick === 'open') {
      // "All open work" — deliberately skips the checklist date window below,
      // so this shows everything outstanding rather than the next two days.
    } else if (moduleKey === 'checklist') {
      // Checklist defaults to today + tomorrow, plus anything still overdue.
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() + 1);
      end.setHours(23, 59, 59, 999);
      data = data.filter((t) => {
        const d = parseDate(t.revisedDate || t.dueDate);
        if (!d) return false;
        return (d >= start && d <= end) || (d < start && !t.actual);
      });
    }

    if (filters.names.length) data = data.filter((t) => filters.names.includes(t.name));
    if (filters.frequencies.length) data = data.filter((t) => filters.frequencies.includes(t.frequency));
    if (filters.verifiers.length) data = data.filter((t) => filters.verifiers.includes((t.verifiedBy || '').trim()));

    if (filters.statuses.length) {
      data = data.filter((t) => {
        const done = !!t.actual;
        return (filters.statuses.includes('pending') && !done) || (filters.statuses.includes('completed') && done);
      });
    }
    return data;
  }, [filters, quick, user]);

  const byModule = useMemo(
    () => ({
      delegation: scoped.filter((t) => t.type === 'delegation'),
      checklist: scoped.filter((t) => t.type === 'checklist'),
    }),
    [scoped]
  );

  const filtered = useMemo(
    () => applyLens(byModule[module] || [], module),
    [byModule, module, applyLens]
  );

  const counts = useMemo(
    () => ({
      delegation: applyLens(byModule.delegation, 'delegation').length,
      checklist: applyLens(byModule.checklist, 'checklist').length,
    }),
    [byModule, applyLens]
  );

  // On first load, open the tab that actually has work under the active lens.
  useEffect(() => {
    if (tabAutoPicked || loading) return;
    setTabAutoPicked(true);
    if (counts.delegation === 0 && counts.checklist > 0) setModule('checklist');
  }, [loading, counts, tabAutoPicked]);

  useEffect(() => setPage(1), [module, tab, filters, quick, pageSize]);

  const pageTasks = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const filterOptions = useMemo(
    () => ({
      names: [...new Set(tasks.map((t) => t.name).filter(Boolean))].sort(),
      verifiers: [...new Set(tasks.map((t) => (t.verifiedBy || '').trim()).filter(Boolean))].sort(),
    }),
    [tasks]
  );

  const filterCount =
    filters.names.length + filters.frequencies.length + filters.verifiers.length + filters.statuses.length +
    (filters.fromDate ? 1 : 0) + (filters.toDate ? 1 : 0);

  /* ── Selection & eligibility ─────────────────────────────────────── */
  const selectedTasks = useMemo(() => tasks.filter((t) => selected.has(t.key)), [tasks, selected]);
  // Memoised: these arrays feed effect dependencies inside ActionSidebar.
  const completable = useMemo(() => selectedTasks.filter((t) => !t.actual), [selectedTasks]);
  const verifiable = useMemo(
    () => selectedTasks.filter((t) => t.actual && sameName(t.verifiedBy, user?.name) && !t.verified),
    [selectedTasks, user]
  );

  const toggle = (key) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const allOnPage = pageTasks.length > 0 && pageTasks.every((t) => selected.has(t.key));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPage) pageTasks.forEach((t) => next.delete(t.key));
      else pageTasks.forEach((t) => next.add(t.key));
      return next;
    });

  /* ── Submit complete / revise ────────────────────────────────────── */
  const submitActions = async (actions) => {
    try {
      const now = new Date().toISOString();

      // Upload every attached proof first so a failure aborts before any write.
      const completes = [];
      for (const a of actions.filter((x) => x.mode === 'complete')) {
        const documentLink = a.file ? await uploadApi.proof(a.file, a.task.taskId) : '';
        completes.push({
          type: a.task.type,
          taskId: a.task.taskId,
          documentLink,
          actualTimestamp: now,
          remark: a.remark,
        });
      }

      const revises = actions
        .filter((x) => x.mode === 'revise')
        .map((a) => ({
          type: a.task.type,
          taskId: a.task.taskId,
          revisedDate: a.revisedDate,
          remark: a.remark,
          timestamp: now,
        }));

      const strip = ({ type, ...rest }) => rest;
      const calls = [];
      const dc = completes.filter((c) => c.type === 'delegation').map(strip);
      const cc = completes.filter((c) => c.type === 'checklist').map(strip);
      const dr = revises.filter((c) => c.type === 'delegation').map(strip);
      const cr = revises.filter((c) => c.type === 'checklist').map(strip);

      if (dc.length) calls.push(delegationApi.complete(dc));
      if (cc.length) calls.push(checklistApi.complete(cc));
      if (dr.length) calls.push(delegationApi.revise(dr));
      if (cr.length) calls.push(checklistApi.revise(cr));

      if (!calls.length) return;
      await Promise.all(calls);

      toast('All actions submitted successfully!');
      setActionOpen(false);
      setSelected(new Set());
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const submitVerify = async () => {
    if (!verifiable.length) {
      toast('No tasks eligible for verification', 'info');
      return;
    }
    const ok = await confirmDialog({
      title: 'Verify tasks?',
      text: `Mark ${verifiable.length} task(s) as verified?`,
      icon: 'question',
      confirmButtonText: 'Yes, verify',
      confirmButtonColor: '#059669',
    });
    if (!ok) return;

    try {
      const checklistIds = verifiable.filter((t) => t.type === 'checklist').map((t) => t.taskId);
      if (checklistIds.length) {
        const res = await checklistApi.verify(checklistIds);
        toast(res.message);
      }
      const delegationTasks = verifiable.filter((t) => t.type === 'delegation');
      if (delegationTasks.length) {
        await delegationApi.bulkStatusRemark(
          delegationTasks.map((t) => ({
            taskId: t.taskId,
            status: 'Completed',
            remark: 'Verified by delegator',
          }))
        );
        toast(`${delegationTasks.length} delegation task(s) approved.`);
      }
      setSelected(new Set());
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const openActions = (mode, keys) => {
    if (keys) setSelected(new Set(keys));
    setActionMode(mode);
    setActionOpen(true);
  };

  const exportCsv = () => {
    if (!filtered.length) {
      toast('No data to export', 'warning');
      return;
    }
    downloadCsv(`tasks_export_${todayISO()}.csv`, EXPORT_COLUMNS, filtered);
    toast('Exported successfully');
  };

  const moduleTab = (key, label, icon, count) => (
    <button
      key={key}
      type="button"
      onClick={() => {
        setModule(key);
        setQuick(null);
        setSelected(new Set());
      }}
      aria-selected={module === key}
      role="tab"
      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-150 ${
        module === key ? 'bg-white text-brand-700 shadow-sm' : 'text-sand-500 hover:text-sand-700'
      }`}
    >
      <i className={`fas ${icon} text-xs`} />
      {label}
      <span
        className={`grid place-items-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold tabular ${
          module === key ? 'bg-brand-100 text-brand-700' : 'bg-sand-200 text-sand-600'
        }`}
      >
        {count}
      </span>
    </button>
  );

  return (
    <PageBody>
      <StatGrid>
        <StatCard
          label="Open"
          value={stats.open}
          icon="fa-layer-group"
          tone="brand"
          hint="Everything still to do"
          onClick={() => setQuick(null)}
          active={quick === null}
        />
        <StatCard
          label="Due today"
          value={stats.dueToday}
          icon="fa-calendar-day"
          tone="blue"
          hint="Click to filter"
          onClick={() => setQuick(quick === 'today' ? null : 'today')}
          active={quick === 'today'}
        />
        <StatCard
          label="Delayed"
          value={stats.delayed}
          icon="fa-hourglass-half"
          tone="red"
          hint="Click to filter"
          onClick={() => setQuick(quick === 'delayed' ? null : 'delayed')}
          active={quick === 'delayed'}
        />
        <StatCard label="To verify" value={stats.toVerify} icon="fa-user-check" tone="emerald" hint="Waiting on your sign-off" />
      </StatGrid>

      <Section
        title="My task queue"
        icon="fa-clipboard-check"
        description={`${filtered.length} task${filtered.length === 1 ? '' : 's'} in view`}
        actions={
          <Toolbar>
            {switcherOptions.length > 0 && (
              <RoleSwitcher options={switcherOptions} value={tab} onChange={setTab} />
            )}
            <FilterButton count={filterCount} onClick={() => setFilterOpen(true)} />
            <ExportButton onClick={exportCsv} />
            <div className="flex bg-sand-100 rounded-xl p-0.5 border border-sand-200/70">
              {[
                { key: 'card', icon: 'fa-grip', label: 'Cards' },
                { key: 'table', icon: 'fa-table-list', label: 'Table' },
              ].map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setView(v.key)}
                  aria-label={`${v.label} view`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 flex items-center gap-1.5 ${
                    view === v.key ? 'bg-white text-brand-700 shadow-sm' : 'text-sand-500 hover:text-sand-700'
                  }`}
                >
                  <i className={`fas ${v.icon}`} /> <span className="hidden md:inline">{v.label}</span>
                </button>
              ))}
            </div>
          </Toolbar>
        }
      >
        {/* Module tabs + select-all bar */}
        <div className="px-4 sm:px-5 py-3 border-b border-sand-200/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 bg-sand-100 rounded-xl p-1 border border-sand-200/70 overflow-x-auto scrollbar-slim max-w-full" role="tablist">
            {moduleTab('delegation', 'Delegation', 'fa-diagram-project', counts.delegation)}
            {moduleTab('checklist', 'Checklist', 'fa-list-check', counts.checklist)}
          </div>

          <div className="flex items-center gap-3">
            {quick && (
              <button
                type="button"
                onClick={() => setQuick(null)}
                className="fp-pill bg-brand-50 text-brand-700 hover:bg-brand-100 transition"
              >
                {QUICK_LABELS[quick] || 'Filtered'} <i className="fas fa-times ml-0.5" />
              </button>
            )}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" className="w-4 h-4 accent-brand-600" checked={allOnPage} onChange={toggleAll} />
              <span className="text-xs font-semibold text-sand-600">Select page</span>
            </label>
          </div>
        </div>

        <div className={view === 'card' ? 'p-3 sm:p-5 bg-sand-50/50' : ''}>
          {loading ? (
            <Spinner label="Loading tasks…" />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : filtered.length === 0 ? (
            <EmptyState title="No tasks match your filters" hint="Try switching tabs or clearing the filters." />
          ) : view === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4">
              {pageTasks.map((task) => (
                <TaskCard key={task.key} task={task} selected={selected.has(task.key)} onToggle={() => toggle(task.key)} />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-slim">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-sand-100">
                    <th className="fp-th w-10">
                      <input type="checkbox" className="accent-brand-600" checked={allOnPage} onChange={toggleAll} aria-label="Select all" />
                    </th>
                    <th className="fp-th">Task ID</th>
                    <th className="fp-th">Assignee</th>
                    <th className="fp-th">Description</th>
                    <th className="fp-th">Frequency</th>
                    <th className="fp-th">Due date</th>
                    <th className="fp-th">Actual</th>
                    <th className="fp-th">Status</th>
                    <th className="fp-th">Verification</th>
                    <th className="fp-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageTasks.map((t) => {
                    const isCompleted = !!t.actual;
                    const due = parseDate(t.revisedDate || t.dueDate);
                    const isOverdue = due && due < new Date() && !isCompleted;
                    const statusText =
                      t.type === 'delegation' && t.status ? t.status : isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'Pending';
                    const gap = completionGap(t.dueDate, t.actual);
                    const verifier = (t.verifiedBy || '').trim();

                    return (
                      <tr
                        key={t.key}
                        className={`border-b border-sand-100 transition-colors ${selected.has(t.key) ? 'bg-brand-50' : 'hover:bg-sand-50'}`}
                      >
                        <td className="fp-td">
                          <input
                            type="checkbox"
                            className="accent-brand-600"
                            checked={selected.has(t.key)}
                            onChange={() => toggle(t.key)}
                            aria-label={`Select ${t.taskId}`}
                          />
                        </td>
                        <td className="fp-td font-mono text-[11px] font-bold text-sand-500">{t.taskId}</td>
                        <td className="fp-td font-semibold text-sand-800">
                          <div className="truncate max-w-[150px]" title={t.name}>{t.name || '—'}</div>
                          {t.subMonitoring && t.subMonitoring !== 'No' && (
                            <span className="mt-1 fp-chip bg-brand-50 border-brand-200 text-brand-700">
                              <i className="fas fa-eye text-[8px]" /> {t.subMonitoring}
                            </span>
                          )}
                        </td>
                        <td className="fp-td min-w-[240px] max-w-[380px] break-words">{t.taskDescription || '—'}</td>
                        <td className="fp-td">
                          <Pill tone={FREQUENCY_STYLES[t.frequency] || FREQUENCY_STYLES.Once}>{t.frequency || 'Once'}</Pill>
                        </td>
                        <td className={`fp-td whitespace-nowrap ${isOverdue ? 'text-red-600 font-bold' : ''}`}>
                          <div>{fmtDate(t.dueDate, '—')}</div>
                          {t.revisedDate && (
                            <div className="text-[10px] text-brand-600 font-bold mt-0.5">
                              <i className="far fa-calendar text-[9px] mr-0.5" />Rev {fmtDate(t.revisedDate)}
                            </div>
                          )}
                        </td>
                        <td className="fp-td whitespace-nowrap">{t.actual ? fmtDate(t.actual) : '—'}</td>
                        <td className="fp-td">
                          <Pill tone={STATUS_STYLES[statusText] || 'bg-amber-50 text-amber-700'}>{statusText}</Pill>
                          {gap && <div className="text-[10px] font-bold text-sand-500 mt-1">{gap.label}</div>}
                        </td>
                        <td className="fp-td text-xs">
                          {!verifier ? (
                            <span className="text-sand-300">—</span>
                          ) : t.verified ? (
                            <>
                              <div className="font-bold text-emerald-600 flex items-center gap-1">
                                <i className="fas fa-check-double text-[10px]" /> {verifier}
                              </div>
                              {t.verifiedTimestamp && (
                                <div className="text-[10px] text-sand-400">{fmtDateTime(t.verifiedTimestamp)}</div>
                              )}
                            </>
                          ) : (
                            <div className="font-bold text-amber-600 flex items-center gap-1" title={`Pending verification by ${verifier}`}>
                              <i className="fas fa-user-clock text-[10px]" /> {verifier}
                            </div>
                          )}
                        </td>
                        <td className="fp-td">
                          <div className="flex items-center gap-1">
                            {t.document && (
                              <a
                                href={t.document}
                                target="_blank"
                                rel="noreferrer noopener"
                                title="Open document"
                                className="w-7 h-7 grid place-items-center rounded-lg text-sand-400 hover:bg-brand-50 hover:text-brand-700 transition"
                              >
                                <i className="fas fa-arrow-up-right-from-square text-[10px]" />
                              </a>
                            )}
                            <button
                              type="button"
                              title="View remark history"
                              aria-label={`Remark history for ${t.taskId}`}
                              onClick={() => showRemarkTimeline(t.remarks ?? t.remark)}
                              className="w-7 h-7 grid place-items-center rounded-lg text-sand-400 hover:bg-brand-50 hover:text-brand-700 transition"
                            >
                              <i className="fas fa-comment-dots text-[11px]" />
                            </button>
                            {!isCompleted && (
                              <>
                                <button
                                  type="button"
                                  title="Complete task"
                                  aria-label={`Complete ${t.taskId}`}
                                  onClick={() => openActions('complete', [t.key])}
                                  className="w-7 h-7 grid place-items-center rounded-lg text-emerald-600 hover:bg-emerald-50 transition"
                                >
                                  <i className="fas fa-check text-[11px]" />
                                </button>
                                <button
                                  type="button"
                                  title="Revise due date"
                                  aria-label={`Revise ${t.taskId}`}
                                  onClick={() => openActions('revise', [t.key])}
                                  className="w-7 h-7 grid place-items-center rounded-lg text-brand-600 hover:bg-brand-50 transition"
                                >
                                  <i className="far fa-calendar text-[11px]" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && !error && filtered.length > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizes={[6, 12, 24, 48]}
          />
        )}
      </Section>

      {/* Floating action bar */}
      {(completable.length > 0 || verifiable.length > 0) && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-2rem)] sm:w-auto max-w-lg flex items-center justify-center gap-1.5 sm:gap-2 rounded-2xl bg-brand-950 text-white px-2.5 sm:px-3 py-2.5 shadow-panel animate-pop-in">
          <span className="px-1.5 sm:px-2 text-sm font-semibold tabular whitespace-nowrap">{selected.size}<span className="hidden sm:inline"> selected</span></span>
          <span className="w-px h-6 bg-white/15" />
          {completable.length > 0 && (
            <button
              type="button"
              onClick={() => openActions('complete')}
              className="fp-btn bg-white/10 hover:bg-white/20 text-white px-4 py-2"
            >
              <i className="fas fa-circle-check" /> Complete ({completable.length})
            </button>
          )}
          {verifiable.length > 0 && (
            <button
              type="button"
              onClick={submitVerify}
              className="fp-btn bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2"
            >
              <i className="fas fa-check-double" /> Verify ({verifiable.length})
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

      <TasksFilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={(f) => {
          setFilters(f);
          setQuick(null);
        }}
        options={filterOptions}
      />

      <ActionSidebar
        open={actionOpen}
        onClose={() => setActionOpen(false)}
        tasks={completable}
        defaultMode={actionMode}
        onSubmit={submitActions}
      />
    </PageBody>
  );
}

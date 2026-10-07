import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { checklistApi, userApi } from '../api/services';
import {
  PageBody, Toolbar, Section, StatGrid, StatCard, RoleSwitcher,
  FilterButton, ExportButton, Avatar, Pill, Spinner, EmptyState, ErrorState,
} from '../components/common';
import Pagination from '../components/Pagination';
import BulkAddPanel from '../components/checklist/BulkAddPanel';
import ChecklistFilterPanel, { DEFAULT_CHECKLIST_FILTERS } from '../components/checklist/ChecklistFilterPanel';
import { fmtDate, fmtDateTime, toISODate, parseDate, downloadCsv, todayISO } from '../utils/format';
import { toast, confirmDialog, FREQUENCY_STYLES } from '../utils/ui';
import { canCreateTasks, roleSwitcherOptions, filterChecklistByRole } from '../utils/permissions';

const EXPORT_COLUMNS = [
  { label: 'Created At', value: (r) => fmtDateTime(r.createdAt) },
  { label: 'Name', value: (r) => r.name },
  { label: 'Group ID', value: (r) => r.groupId },
  { label: 'Task ID', value: (r) => r.taskId },
  { label: 'Task Description', value: (r) => r.taskDescription },
  { label: 'Frequency', value: (r) => r.frequency },
  { label: 'Due Date', value: (r) => fmtDate(r.dueDate) },
  { label: 'Proof is Required', value: (r) => r.proofRequired },
  { label: 'Verified by', value: (r) => r.verifiedBy },
  { label: 'Actual', value: (r) => fmtDateTime(r.actual) },
  { label: 'Verified', value: (r) => (r.verified ? 'Yes' : 'No') },
];

export default function Checklist() {
  const { user } = useAuth();
  const switcherOptions = useMemo(() => roleSwitcherOptions(user), [user]);

  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tab, setTab] = useState(switcherOptions[0]?.value || 'tome');
  const [filters, setFilters] = useState(DEFAULT_CHECKLIST_FILTERS);
  const [personFilter, setPersonFilter] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [filterOpen, setFilterOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const mayCreate = canCreateTasks(user);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await checklistApi.list());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    userApi.list().then(setUsers).catch(() => setUsers([]));
  }, [load]);

  /* ── Scope, stats and the people summary ─────────────────────────── */
  const scoped = useMemo(() => filterChecklistByRole(rows, user, tab), [rows, user, tab]);

  const stats = useMemo(() => {
    const today = todayISO();
    const series = new Set(scoped.map((r) => r.groupId)).size;
    const dueToday = scoped.filter((r) => toISODate(r.dueDate) === today).length;
    const awaiting = scoped.filter((r) => r.actual && !r.verified).length;
    const overdue = scoped.filter((r) => {
      const d = parseDate(r.dueDate);
      return d && toISODate(d) < today && !r.actual;
    }).length;
    return { series, dueToday, awaiting, overdue };
  }, [scoped]);

  const summary = useMemo(() => {
    const map = new Map();
    scoped.forEach((r) => {
      if (!r.name) return;
      if (!map.has(r.name)) map.set(r.name, { name: r.name, groups: new Set(), tasks: 0, open: 0 });
      const entry = map.get(r.name);
      entry.groups.add(r.groupId);
      entry.tasks += 1;
      if (!r.actual) entry.open += 1;
    });
    return [...map.values()]
      .map((e) => ({ name: e.name, groups: e.groups.size, tasks: e.tasks, open: e.open }))
      .sort((a, b) => b.open - a.open || a.name.localeCompare(b.name));
  }, [scoped]);

  /* ── Filters ─────────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    let data = scoped;

    if (personFilter) data = data.filter((r) => r.name === personFilter);
    else if (filters.names.length) data = data.filter((r) => filters.names.includes(r.name));

    if (filters.frequencies.length) data = data.filter((r) => filters.frequencies.includes(r.frequency));
    if (filters.verifiers.length) data = data.filter((r) => filters.verifiers.includes((r.verifiedBy || '').trim()));

    if (filters.fromDate || filters.toDate) {
      data = data.filter((r) => {
        const iso = toISODate(r.dueDate);
        if (!iso) return false;
        if (filters.fromDate && iso < filters.fromDate) return false;
        if (filters.toDate && iso > filters.toDate) return false;
        return true;
      });
    } else {
      // Default window carried over from the Apps Script: today and tomorrow only.
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() + 1);
      end.setHours(23, 59, 59, 999);
      data = data.filter((r) => {
        const d = parseDate(r.dueDate);
        return d && d >= start && d <= end;
      });
    }
    return data;
  }, [scoped, personFilter, filters]);

  /** Rows collapse into their Group ID series. */
  const groups = useMemo(() => {
    const map = new Map();
    filtered.forEach((r) => {
      if (!r.groupId) return;
      if (!map.has(r.groupId)) map.set(r.groupId, []);
      map.get(r.groupId).push(r);
    });
    map.forEach((list) => list.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
    return [...map.entries()];
  }, [filtered]);

  useEffect(() => setPage(1), [tab, filters, personFilter, pageSize]);

  const pageGroups = useMemo(
    () => groups.slice((page - 1) * pageSize, page * pageSize),
    [groups, page, pageSize]
  );

  const filterCount =
    filters.names.length + filters.frequencies.length + filters.verifiers.length +
    (filters.fromDate ? 1 : 0) + (filters.toDate ? 1 : 0);

  const options = useMemo(
    () => ({
      names: [...new Set(users.map((u) => u.name).filter(Boolean))].sort(),
      verifiers: [...new Set(rows.map((r) => (r.verifiedBy || '').trim()).filter(Boolean))].sort(),
    }),
    [users, rows]
  );

  /* ── Actions ─────────────────────────────────────────────────────── */
  const submitBulk = async (payload) => {
    try {
      const res = await checklistApi.bulkCreate(payload);
      toast(res.message);
      setBulkOpen(false);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const deleteGroup = async (groupId, count) => {
    const ok = await confirmDialog({
      title: 'Delete this series?',
      text: `This will delete ${count} task(s) permanently.`,
      confirmButtonText: 'Yes, delete',
    });
    if (!ok) return;
    try {
      const res = await checklistApi.deleteGroup(groupId);
      toast(res.message);
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const toggleGroup = (groupId) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });

  const exportCsv = () => {
    if (!filtered.length) {
      toast('No data to export', 'warning');
      return;
    }
    downloadCsv(`checklist_export_${todayISO()}.csv`, EXPORT_COLUMNS, filtered);
    toast('Exported successfully');
  };

  const usingDefaultWindow = !filters.fromDate && !filters.toDate;

  return (
    <PageBody>
      <StatGrid>
        <StatCard label="Series" value={stats.series} icon="fa-layer-group" tone="brand" hint="Distinct recurring groups" />
        <StatCard label="Due today" value={stats.dueToday} icon="fa-calendar-day" tone="blue" hint="Occurrences dated today" />
        <StatCard label="Awaiting verification" value={stats.awaiting} icon="fa-user-check" tone="amber" hint="Done, needs a verifier" />
        <StatCard label="Overdue" value={stats.overdue} icon="fa-triangle-exclamation" tone="red" hint="Past due, still open" />
      </StatGrid>

      <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)] gap-5">
        {/* People summary */}
        <Section
          title="People"
          icon="fa-users"
          description={`${summary.length} in view`}
          className="h-fit xl:sticky xl:top-[88px]"
        >
          {summary.length === 0 ? (
            <EmptyState icon="fa-user-slash" title="No data" />
          ) : (
            <ul className="divide-y divide-sand-100 max-h-[340px] xl:max-h-[calc(100dvh-330px)] overflow-y-auto scrollbar-slim">
              {summary.map((s) => {
                const active = personFilter === s.name;
                return (
                  <li key={s.name}>
                    <button
                      type="button"
                      onClick={() => setPersonFilter(active ? null : s.name)}
                      aria-pressed={active}
                      className={`w-full text-left px-4 py-3 flex items-center gap-2.5 sm:gap-3 transition border-l-[3px] ${
                        active ? 'bg-brand-50 border-brand-600' : 'border-transparent hover:bg-sand-50'
                      }`}
                    >
                      <Avatar name={s.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-sand-900 truncate">{s.name}</span>
                        <span className="block text-[11px] text-sand-500">
                          {s.groups} series · {s.tasks} tasks
                        </span>
                      </span>
                      {s.open > 0 && (
                        <span className="fp-pill bg-amber-50 text-amber-700 tabular">{s.open}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {/* Series table */}
        <Section
          title="Checklist series"
          icon="fa-list-check"
          description={
            usingDefaultWindow
              ? 'Showing today and tomorrow — widen the date range in Filter'
              : `${groups.length} series in the selected range`
          }
          actions={
            <Toolbar>
              {switcherOptions.length > 0 && (
                <RoleSwitcher options={switcherOptions} value={tab} onChange={setTab} />
              )}
              <FilterButton count={filterCount} onClick={() => setFilterOpen(true)} />
              <ExportButton onClick={exportCsv} />
              {mayCreate && (
                <button type="button" onClick={() => setBulkOpen(true)} className="fp-btn-primary flex-1 sm:flex-none">
                  <i className="fas fa-plus" /> Bulk Add
                </button>
              )}
            </Toolbar>
          }
        >
          {personFilter && (
            <div className="px-4 sm:px-5 py-2.5 bg-brand-50 border-b border-brand-100 flex flex-wrap items-center gap-2">
              <span className="text-xs text-brand-800">
                Filtered to <span className="font-bold">{personFilter}</span>
              </span>
              <button
                type="button"
                onClick={() => setPersonFilter(null)}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                Clear
              </button>
            </div>
          )}

          <div className="overflow-x-auto lg:overflow-auto scrollbar-slim lg:max-h-[calc(100dvh-400px)] lg:min-h-[260px]">
            {loading ? (
              <Spinner label="Loading tasks…" />
            ) : error ? (
              <ErrorState message={error} onRetry={load} />
            ) : groups.length === 0 ? (
              <EmptyState title="No tasks found" hint="Adjust the date range or filters to see more." />
            ) : (
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="fp-th sticky top-0 z-20 bg-sand-100 w-10" />
                    <th className="fp-th sticky top-0 z-20 bg-sand-100">Assignee</th>
                    <th className="fp-th sticky top-0 z-20 bg-sand-100">Series</th>
                    <th className="fp-th sticky top-0 z-20 bg-sand-100">Description</th>
                    <th className="fp-th sticky top-0 z-20 bg-sand-100">Frequency</th>
                    <th className="fp-th sticky top-0 z-20 bg-sand-100">Due date</th>
                    <th className="fp-th sticky top-0 z-20 bg-sand-100">Proof</th>
                    <th className="fp-th sticky top-0 z-20 bg-sand-100">Verified by</th>
                    <th className="fp-th sticky top-0 z-20 bg-sand-100">Created</th>
                    <th className="fp-th sticky top-0 z-20 bg-sand-100 text-center w-16" />
                  </tr>
                </thead>

                <tbody>
                  {pageGroups.map(([groupId, list]) => {
                    const first = list[0];
                    const isOpen = expanded.has(groupId);
                    const dueDate = parseDate(first.dueDate);
                    const isDue = dueDate && dueDate < new Date() && !first.actual;
                    const verifier = (first.verifiedBy || '').trim();

                    return [
                      <tr key={groupId} className="bg-white border-b border-sand-100 hover:bg-sand-50/70 transition-colors">
                        <td className="fp-td text-center">
                          {list.length > 1 && (
                            <button
                              type="button"
                              onClick={() => toggleGroup(groupId)}
                              aria-expanded={isOpen}
                              aria-label={isOpen ? 'Collapse series' : 'Expand series'}
                              className="w-7 h-7 grid place-items-center rounded-lg text-sand-400 hover:bg-brand-50 hover:text-brand-700 transition"
                            >
                              <i className={`fas ${isOpen ? 'fa-chevron-down' : 'fa-chevron-right'} text-xs`} />
                            </button>
                          )}
                        </td>
                        <td className="fp-td">
                          <div className="flex items-center gap-2">
                            <Avatar name={first.name} size="sm" />
                            <span className="text-sm font-semibold text-sand-900 whitespace-nowrap">{first.name}</span>
                          </div>
                        </td>
                        <td className="fp-td">
                          <span
                            className="inline-block max-w-[150px] truncate align-bottom bg-sand-100 text-sand-700 px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold"
                            title={groupId}
                          >
                            {groupId}
                          </span>
                          <div className="text-[11px] text-sand-400 mt-1 font-mono">
                            {first.taskId} · {list.length} occurrence{list.length === 1 ? '' : 's'}
                          </div>
                        </td>
                        <td className="fp-td min-w-[240px] max-w-[380px] break-words">{first.taskDescription}</td>
                        <td className="fp-td">
                          <Pill tone={FREQUENCY_STYLES[first.frequency] || FREQUENCY_STYLES.Once}>
                            {first.frequency || '—'}
                          </Pill>
                        </td>
                        <td className={`fp-td text-xs whitespace-nowrap ${isDue ? 'text-red-600 font-bold' : 'text-sand-600'}`}>
                          {isDue && <i className="fas fa-circle-exclamation mr-1" />}
                          {fmtDate(first.dueDate, '—')}
                        </td>
                        <td className="fp-td">
                          {first.proofRequired === 'Yes' ? (
                            <Pill tone="bg-amber-50 text-amber-700 ring-1 ring-amber-100" icon="fa-paperclip">Required</Pill>
                          ) : (
                            <span className="text-sand-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="fp-td">
                          {verifier ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sand-700">
                              <Avatar name={verifier} size="xs" gradient="from-emerald-400 to-emerald-600" />
                              {verifier}
                            </span>
                          ) : (
                            <Pill tone="bg-sand-100 text-sand-500" icon="fa-clock">Unassigned</Pill>
                          )}
                        </td>
                        <td className="fp-td text-xs text-sand-400 whitespace-nowrap">
                          {fmtDateTime(first.createdAt)}
                        </td>
                        <td className="fp-td text-center">
                          {mayCreate && (
                            <button
                              type="button"
                              onClick={() => deleteGroup(groupId, list.length)}
                              title="Delete this series"
                              aria-label={`Delete series ${groupId}`}
                              className="w-7 h-7 grid place-items-center rounded-lg text-sand-400 hover:bg-red-50 hover:text-red-600 transition mx-auto"
                            >
                              <i className="fas fa-trash-can text-xs" />
                            </button>
                          )}
                        </td>
                      </tr>,

                      ...(isOpen
                        ? list.slice(1).map((r) => (
                            <tr key={r.taskId} className="bg-brand-50/30 border-b border-sand-100">
                              <td className="fp-td text-center text-sand-300">
                                <i className="fas fa-turn-up fa-rotate-90 text-[10px]" />
                              </td>
                              <td className="fp-td" />
                              <td className="fp-td text-xs font-mono text-sand-500">{r.taskId}</td>
                              <td className="fp-td text-xs text-sand-600 break-words max-w-[380px]">{r.taskDescription}</td>
                              <td className="fp-td text-xs text-sand-500">{r.frequency}</td>
                              <td className="fp-td text-xs text-sand-600 whitespace-nowrap">{fmtDate(r.dueDate, '—')}</td>
                              <td className="fp-td text-xs">
                                {r.proofRequired === 'Yes' ? <i className="fas fa-check text-amber-500" /> : '—'}
                              </td>
                              <td className="fp-td text-xs text-sand-500">{r.verifiedBy || '—'}</td>
                              <td className="fp-td text-xs text-sand-400">
                                {r.actual ? (
                                  <span className="text-emerald-600 font-semibold">
                                    <i className="fas fa-check mr-1" />Done
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="fp-td" />
                            </tr>
                          ))
                        : []),
                    ];
                  })}
                </tbody>
              </table>
            )}
          </div>

          {!loading && !error && groups.length > 0 && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={groups.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              unit="series"
            />
          )}
        </Section>
      </div>

      <ChecklistFilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={(f) => {
          setFilters(f);
          setPersonFilter(null);
        }}
        options={options}
      />

      <BulkAddPanel open={bulkOpen} onClose={() => setBulkOpen(false)} onSubmit={submitBulk} users={users} />
    </PageBody>
  );
}

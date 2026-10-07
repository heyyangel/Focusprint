import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checklistApi, delegationApi } from '../api/services';
import {
  PageBody, StatGrid, StatCard, Section, Spinner, EmptyState, ErrorState, Avatar, Pill,
} from '../components/common';
import { fmtDate, fmtDateTime, parseDate, latestRemark, toISODate } from '../utils/format';
import { STATUS_STYLES, STATUS_ICONS } from '../utils/ui';
import { norm, sameName, isManager, filterDelegationByRole } from '../utils/permissions';

/**
 * Read-only landing page. It aggregates the same delegation and checklist data
 * the modules already load — no new endpoints, no writes.
 */
export default function Overview() {
  const { user, modules } = useAuth();
  const [delegation, setDelegation] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [d, c] = await Promise.all([
        delegationApi.list().catch(() => []),
        checklistApi.list().catch(() => []),
      ]);
      setDelegation(d);
      setChecklist(c);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Delegation rows this user is entitled to see — the same scoping the
   * Delegation module applies, so nothing leaks into the panels below.
   */
  const visibleDelegation = useMemo(
    () => filterDelegationByRole(delegation, user, 'all'),
    [delegation, user]
  );

  /** Everything assigned to me, normalised into one shape. */
  const mine = useMemo(() => {
    const me = norm(user?.name);
    // Matches the Task Center's "To Me" scope: your own work plus anything you
    // sub-monitor. Keeping the predicates identical is what makes the tile
    // figure and its destination agree.
    const fromDelegation = visibleDelegation
      .filter((t) => norm(t.delegatee) === me || norm(t.subMonitoring) === me)
      .map((t) => ({
        key: `delegation_${t.taskId}`,
        module: 'Delegation',
        to: '/delegation',
        taskId: t.taskId,
        title: t.taskTitle || t.task,
        due: t.revisedDate || t.dueDate,
        done: !!t.completionTime,
        status: t.status,
        counterpart: t.delegator,
        priority: t.priority,
      }));
    const fromChecklist = checklist
      .filter((t) => norm(t.name) === me)
      .map((t) => ({
        key: `checklist_${t.taskId}`,
        module: 'Checklist',
        to: '/tasks',
        taskId: t.taskId,
        title: t.taskDescription,
        due: t.dueDate,
        done: !!t.actual,
        status: t.actual ? 'Completed' : 'Pending',
        counterpart: t.verifiedBy,
        priority: '',
      }));
    return [...fromDelegation, ...fromChecklist];
  }, [visibleDelegation, checklist, user]);

  const stats = useMemo(() => {
    const today = toISODate(new Date());
    const now = new Date();
    const open = mine.filter((t) => !t.done);

    const dueToday = open.filter((t) => toISODate(t.due) === today).length;
    const overdue = open.filter((t) => {
      const d = parseDate(t.due);
      return d && d < now;
    }).length;

    // Work waiting on my sign-off — the same test the Task Center's verify
    // lens applies: finished, I am the named verifier, not yet signed off.
    const awaitingApproval = visibleDelegation.filter(
      (t) =>
        sameName(t.delegator, user?.name) &&
        t.completionTime &&
        !['Completed', 'Completed With Delay'].includes(t.status)
    ).length;
    const awaitingVerify = checklist.filter(
      (t) => sameName(t.verifiedBy, user?.name) && t.actual && !t.verified
    ).length;

    return { open: open.length, dueToday, overdue, awaiting: awaitingApproval + awaitingVerify };
  }, [mine, visibleDelegation, checklist, user]);

  /** My soonest open work, earliest due date first. */
  const upNext = useMemo(
    () =>
      mine
        .filter((t) => !t.done && t.due)
        .sort((a, b) => new Date(a.due) - new Date(b.due))
        .slice(0, 6),
    [mine]
  );

  /** Latest remark-history entries across delegation tasks I can see. */
  const activity = useMemo(
    () =>
      visibleDelegation
        .flatMap((t) =>
          (t.remarks || []).map((r) => ({
            key: `${t.taskId}-${r.time}-${r.remark}`,
            taskId: t.taskId,
            title: t.taskTitle,
            ...r,
          }))
        )
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 6),
    [visibleDelegation]
  );

  /** Status mix across the tasks in scope — only meaningful for managers. */
  const statusMix = useMemo(() => {
    const scope = isManager(user) ? visibleDelegation : [];
    const counts = new Map();
    scope.forEach((t) => counts.set(t.status, (counts.get(t.status) || 0) + 1));
    const total = scope.length;
    return {
      total,
      rows: [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([status, count]) => ({ status, count, pct: total ? Math.round((count / total) * 100) : 0 })),
    };
  }, [visibleDelegation, user]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  if (loading) return <Spinner label="Loading your overview…" className="py-32" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <PageBody>
      {/* Greeting banner */}
      <div className="relative overflow-hidden rounded-2xl bg-brand-950 text-white px-5 py-5 sm:px-8 sm:py-7">
        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 12% 20%, #b0693a 0, transparent 42%), radial-gradient(circle at 88% 90%, #904a20 0, transparent 48%)',
          }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-300">
              {greeting}
            </p>
            <h2 className="font-display text-xl sm:text-3xl font-bold mt-1">{user?.name}</h2>
            <p className="text-sm text-brand-200/80 mt-1.5">
              {stats.open === 0
                ? 'You have nothing outstanding. Nicely done.'
                : `You have ${stats.open} open task${stats.open === 1 ? '' : 's'}` +
                  (stats.overdue ? `, ${stats.overdue} already past due.` : '.')}
            </p>
          </div>
          <Link to="/tasks" className="fp-btn bg-white text-brand-800 hover:bg-brand-50 shadow-raised w-full sm:w-auto">
            <i className="fas fa-clipboard-check" /> Open Task Center
          </Link>
        </div>
      </div>

      {/* KPIs — each opens the Task Center filtered to exactly what it counted */}
      <StatGrid>
        <StatCard
          label="Open tasks"
          value={stats.open}
          icon="fa-layer-group"
          tone="brand"
          hint="Assigned to you"
          to="/tasks?scope=tome&quick=open"
        />
        <StatCard
          label="Due today"
          value={stats.dueToday}
          icon="fa-calendar-day"
          tone="blue"
          hint="Finish before end of day"
          to="/tasks?scope=tome&quick=today"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          icon="fa-triangle-exclamation"
          tone="red"
          hint="Past the due date"
          to="/tasks?scope=tome&quick=delayed"
        />
        <StatCard
          label="Awaiting you"
          value={stats.awaiting}
          icon="fa-user-check"
          tone="emerald"
          hint="To approve or verify"
          to="/tasks?quick=verify"
        />
      </StatGrid>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {/* Up next */}
        <Section
          className="xl:col-span-2"
          title="Up next"
          icon="fa-hourglass-half"
          description="Your open work, soonest first"
          actions={
            <Link to="/tasks" className="text-xs font-semibold text-brand-600 hover:underline">
              View all <i className="fas fa-arrow-right text-[10px] ml-0.5" />
            </Link>
          }
        >
          {upNext.length === 0 ? (
            <EmptyState icon="fa-mug-hot" title="Nothing due" hint="You are all caught up." />
          ) : (
            <ul className="divide-y divide-sand-100">
              {upNext.map((t) => {
                const due = parseDate(t.due);
                const overdue = due && due < new Date();
                return (
                  <li key={t.key}>
                    <Link
                      to={t.to}
                      className="flex items-center gap-3 sm:gap-3.5 px-4 sm:px-5 py-3.5 hover:bg-sand-50 transition group"
                    >
                      <span
                        className={`grid place-items-center w-9 h-9 shrink-0 rounded-xl ${
                          overdue ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'
                        }`}
                      >
                        <i className={`fas ${t.module === 'Delegation' ? 'fa-diagram-project' : 'fa-list-check'} text-sm`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-sand-900 truncate group-hover:text-brand-700">
                          {t.title || '—'}
                        </span>
                        <span className="block text-xs text-sand-500 truncate">
                          <span className="font-mono">{t.taskId}</span> · {t.module}
                          {t.counterpart ? ` · with ${t.counterpart}` : ''}
                        </span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className={`block text-xs font-semibold ${overdue ? 'text-red-600' : 'text-sand-700'}`}>
                          {fmtDate(t.due, '—')}
                        </span>
                        <span className="block text-[11px] text-sand-400">{overdue ? 'Overdue' : 'Due'}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {/* Right column */}
        <div className="space-y-5">
          {modules.includes('delegation') && statusMix.total > 0 && (
            <Section title="Delegation mix" icon="fa-chart-pie" description={`${statusMix.total} tasks`}>
              <div className="p-4 sm:p-5 space-y-3">
                {statusMix.rows.map((r) => (
                  <div key={r.status}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-sand-700 flex items-center gap-1.5">
                        <i className={`fas ${STATUS_ICONS[r.status] || 'fa-circle'} text-[10px] text-sand-400`} />
                        {r.status}
                      </span>
                      <span className="font-bold text-sand-900 tabular">{r.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-sand-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${Math.max(r.pct, 3)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="Recent activity" icon="fa-clock-rotate-left" description="Latest remarks and status changes">
            {activity.length === 0 ? (
              <EmptyState icon="fa-comment-slash" title="No activity yet" />
            ) : (
              <ul className="divide-y divide-sand-100">
                {activity.map((a) => (
                  <li key={a.key} className="px-4 sm:px-5 py-3 flex gap-3">
                    <Avatar name={a.user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-sand-800 leading-snug">
                        <span className="font-semibold">{a.user || 'Someone'}</span>{' '}
                        on <span className="font-mono text-sand-500">{a.taskId}</span>
                      </p>
                      <p className="text-xs text-sand-600 truncate">{a.remark || '—'}</p>
                      <p className="flex items-center gap-2 mt-1">
                        {a.status && a.status !== 'No Change' && (
                          <Pill tone={STATUS_STYLES[a.status] || 'bg-sand-100 text-sand-600'}>{a.status}</Pill>
                        )}
                        <span className="text-[11px] text-sand-400">{fmtDateTime(a.time)}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      {/* Module shortcuts */}
      <Section title="Modules" icon="fa-grip" description="Jump straight into a workspace">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-sand-100">
          {[
            { key: 'delegation', to: '/delegation', icon: 'fa-diagram-project', label: 'Delegation', text: 'Assign work and track approvals' },
            { key: 'checklist', to: '/checklist', icon: 'fa-list-check', label: 'Checklist', text: 'Build and verify recurring routines' },
            { key: 'tasks', to: '/tasks', icon: 'fa-clipboard-check', label: 'Task Center', text: 'Complete, revise and verify' },
          ]
            .filter((m) => modules.includes(m.key))
            .map((m) => (
              <Link key={m.key} to={m.to} className="flex items-center gap-3.5 p-4 sm:p-5 hover:bg-sand-50 transition group">
                <span className="grid place-items-center w-11 h-11 shrink-0 rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition">
                  <i className={`fas ${m.icon} text-lg`} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-sand-900">{m.label}</span>
                  <span className="block text-xs text-sand-500">{m.text}</span>
                </span>
                <i className="fas fa-arrow-right text-xs text-sand-300 ml-auto group-hover:text-brand-600 transition" />
              </Link>
            ))}
        </div>
      </Section>
    </PageBody>
  );
}

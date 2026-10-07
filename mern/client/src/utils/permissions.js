export const norm = (v) => String(v || '').trim().toLowerCase();
export const sameName = (a, b) => !!norm(a) && norm(a) === norm(b);

export const isPrivileged = (user) => ['Admin', 'PC'].includes(String(user?.role || '').trim());
export const isManager = (user) =>
  ['Admin', 'PC', 'Delegator'].includes(String(user?.role || '').trim());

/** Hides "Add Task" / "Bulk Add" from Delegatee and User, as the old UI did. */
export const canCreateTasks = (user) => isManager(user);

/** "All | By Me | To Me" is only offered to Delegator / Admin / PC. */
export const roleSwitcherOptions = (user) => {
  const role = String(user?.role || '').trim();
  if (role === 'Delegatee' || role === 'User') return [];
  if (['Delegator', 'Admin', 'PC'].includes(role)) {
    return [
      { label: 'All', value: 'all' },
      { label: 'By Me', value: 'byme' },
      { label: 'To Me', value: 'tome' },
    ];
  }
  return [
    { label: 'By Me', value: 'byme' },
    { label: 'To Me', value: 'tome' },
  ];
};

/** Boss or the task's own delegator may remark / change status / edit / delete. */
export const canRemarkDelegation = (user, task) =>
  isPrivileged(user) || sameName(task?.delegator, user?.name);

/**
 * Delegation scope filter — port of applyRoleFilter() in Delegation.html.
 * A sub-monitor who is neither delegator nor delegatee stops seeing a task
 * once it is completed.
 */
export function filterDelegationByRole(rows, user, tab) {
  const me = norm(user?.name);
  const role = String(user?.role || '').trim();

  return rows.filter((r) => {
    const isDelegator = norm(r.delegator) === me;
    const isDelegatee = norm(r.delegatee) === me;
    const isSubMonitor = norm(r.subMonitoring) === me;
    const isCompleted = String(r.status || '').includes('Completed');

    if (isSubMonitor && !isDelegator && !isDelegatee && isCompleted) return false;

    if (role === 'Delegatee' || role === 'User') return isDelegatee || isSubMonitor;
    if (tab === 'all') return true;
    if (tab === 'byme') return isDelegator || isSubMonitor;
    if (tab === 'tome') return isDelegatee || isSubMonitor;
    return false;
  });
}

/** Checklist scope filter — port of applyRoleFilter() in Checklist.html. */
export function filterChecklistByRole(rows, user, tab) {
  const me = norm(user?.name);
  const role = String(user?.role || '').trim();

  return rows.filter((r) => {
    const isVerifier = norm(r.verifiedBy) === me;
    const isDoer = norm(r.name) === me;

    if (role === 'Delegatee' || role === 'User') return isDoer || isVerifier;
    if (tab === 'all') return true;
    if (tab === 'byme') return isVerifier;
    if (tab === 'tome') return isDoer || isVerifier;
    return false;
  });
}

/** Task Center scope filter — port of isVisibleForUser() in Tasks.html. */
export function filterTasksByRole(rows, user, tab) {
  const me = norm(user?.name);
  const role = String(user?.role || '').trim();

  return rows.filter((t) => {
    const isVerifier = norm(t.verifiedBy) === me;
    const isDoer = norm(t.name) === me;
    const isSubMonitor = norm(t.subMonitoring) === me;
    const isCompleted = !!t.actual;

    if (isSubMonitor && !isVerifier && !isDoer && isCompleted) return false;

    if (role === 'Delegatee' || role === 'User') return isDoer || isSubMonitor || isVerifier;
    if (tab === 'all') return true;
    if (tab === 'byme') return isVerifier || isSubMonitor;
    if (tab === 'tome') return isDoer || isSubMonitor;
    return false;
  });
}

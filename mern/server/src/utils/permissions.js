const PRIVILEGED_ROLES = ['Admin', 'PC'];
const MANAGER_ROLES = ['Admin', 'PC', 'Delegator'];

const norm = (v) => String(v || '').trim().toLowerCase();
const sameName = (a, b) => !!norm(a) && norm(a) === norm(b);

const isPrivileged = (user) => PRIVILEGED_ROLES.includes(String(user?.role || '').trim());
const isManager = (user) => MANAGER_ROLES.includes(String(user?.role || '').trim());

/**
 * Who may create/edit/delete tasks — the Apps Script UI hid "Add Task" and
 * "Bulk Add" from the Delegatee/User roles; this enforces the same rule.
 */
const canCreateTasks = (user) => isManager(user);

/** Remarks & status updates: the Boss (Admin/PC) or the task's own delegator. */
const canRemarkDelegation = (user, task) =>
  isPrivileged(user) || sameName(task?.delegator, user?.name);

/** Only the person named in "Verified by" may verify a checklist task. */
const canVerifyChecklist = (user, task) =>
  isPrivileged(user) || sameName(task?.verifiedBy, user?.name);

/** Doer, delegator or the assigned sub-monitor may complete / revise. */
const canActOnDelegation = (user, task) =>
  isPrivileged(user) ||
  sameName(task?.delegatee, user?.name) ||
  sameName(task?.delegator, user?.name) ||
  sameName(task?.subMonitoring, user?.name);

const canActOnChecklist = (user, task) =>
  isPrivileged(user) ||
  sameName(task?.name, user?.name) ||
  sameName(task?.verifiedBy, user?.name);

/**
 * Navigation entitlement — port of configureNavigationByRole() in Index.html.
 * Returns the modules a user may open plus the landing page.
 */
function navigationFor(user) {
  const role = norm(user?.role);
  const dept = norm(user?.department);

  if (role === 'delegator' && dept === 'admin') {
    return { modules: ['delegation', 'checklist', 'tasks'], landing: 'delegation' };
  }
  if (role === 'delegator') {
    return { modules: ['delegation', 'tasks'], landing: 'delegation' };
  }
  if (role === 'admin' || role === 'pc') {
    return { modules: ['delegation', 'checklist', 'tasks'], landing: 'delegation' };
  }
  if (role === 'delegatee' && dept !== 'admin') {
    return { modules: ['tasks'], landing: 'tasks' };
  }
  return { modules: ['tasks'], landing: 'tasks' };
}

module.exports = {
  norm,
  sameName,
  isPrivileged,
  isManager,
  canCreateTasks,
  canRemarkDelegation,
  canVerifyChecklist,
  canActOnDelegation,
  canActOnChecklist,
  navigationFor,
};

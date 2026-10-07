/**
 * Single source of truth for the app's modules — the sidebar, the topbar title
 * and the route guards all read from here.
 *
 * `module` matches the entitlement keys the API returns in `user.navigation`.
 * "overview" is client-side only: it aggregates data the user can already see.
 */
export const MODULES = [
  {
    key: 'overview',
    path: '/overview',
    label: 'Overview',
    icon: 'fa-gauge-high',
    title: 'Overview',
    subtitle: 'Your workload at a glance',
    alwaysAvailable: true,
  },
  {
    key: 'delegation',
    path: '/delegation',
    label: 'Delegation',
    icon: 'fa-diagram-project',
    title: 'Delegation Manager',
    subtitle: 'Assign and track delegated tasks',
  },
  {
    key: 'checklist',
    path: '/checklist',
    label: 'Checklist',
    icon: 'fa-list-check',
    title: 'Checklist Manager',
    subtitle: 'Manage and track recurring routine tasks',
  },
  {
    key: 'tasks',
    path: '/tasks',
    label: 'Task Center',
    icon: 'fa-clipboard-check',
    title: 'Task Center',
    subtitle: 'Complete, revise and verify your tasks',
  },
];

export const moduleByPath = (pathname) =>
  MODULES.find((m) => pathname.startsWith(m.path)) || MODULES[0];

/** Modules this user may open, in sidebar order. */
export const visibleModules = (entitlements = []) =>
  MODULES.filter((m) => m.alwaysAvailable || entitlements.includes(m.key));

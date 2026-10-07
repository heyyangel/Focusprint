import Swal from 'sweetalert2';

const BRAND = '#904a20';

export function toast(title, icon = 'success') {
  return Swal.fire({
    toast: true,
    position: 'top-end',
    icon,
    title,
    showConfirmButton: false,
    timer: 2400,
    timerProgressBar: true,
  });
}

export function confirmDialog({
  title,
  text,
  confirmButtonText = 'Yes',
  icon = 'warning',
  confirmButtonColor = '#ef4444',
}) {
  return Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonColor,
    cancelButtonColor: '#9a8874',
    confirmButtonText,
  }).then((r) => r.isConfirmed);
}

export function alertDialog({ title, text, icon = 'info' }) {
  return Swal.fire({ title, text, icon, confirmButtonColor: BRAND });
}

export function htmlDialog({ title, html, confirmButtonText = 'Close' }) {
  return Swal.fire({
    title,
    html,
    confirmButtonText,
    confirmButtonColor: BRAND,
    customClass: { popup: 'rounded-2xl shadow-xl' },
  });
}

/* ── Shared badge palettes (carried over from the Apps Script UI) ───── */

export const PRIORITY_STYLES = {
  High: 'bg-red-50 text-red-700 ring-1 ring-red-100',
  Medium: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  Low: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
};

export const STATUS_STYLES = {
  Pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  Hold: 'bg-sand-100 text-sand-700 ring-1 ring-sand-200',
  'In Progress': 'bg-sky-50 text-sky-700 ring-1 ring-sky-100',
  'Approval Waiting': 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  Completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  'Completed With Delay': 'bg-violet-50 text-violet-700 ring-1 ring-violet-100',
  Overdue: 'bg-red-50 text-red-700 ring-1 ring-red-100',
};

export const STATUS_ICONS = {
  Pending: 'fa-clock',
  Hold: 'fa-pause-circle',
  'In Progress': 'fa-spinner',
  'Approval Waiting': 'fa-user-clock',
  Completed: 'fa-check-circle',
  'Completed With Delay': 'fa-check-double',
  Overdue: 'fa-exclamation-circle',
};

export const FREQUENCY_STYLES = {
  Daily: 'bg-brand-50 text-brand-700 ring-1 ring-brand-100',
  Weekly: 'bg-teal-50 text-teal-700 ring-1 ring-teal-100',
  Monthly: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100',
  Quarterly: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100',
  Yearly: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  Once: 'bg-sand-100 text-sand-600 ring-1 ring-sand-200',
};

/**
 * Every status the remark panel can set must be filterable, otherwise a task
 * moved to Hold or In Progress vanishes with no way to bring it back.
 */
export const DELEGATION_STATUSES = [
  'Pending',
  'In Progress',
  'Hold',
  'Approval Waiting',
  'Completed',
  'Completed With Delay',
  'Overdue',
];

export const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];

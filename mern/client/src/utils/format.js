export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_INDEX = MONTHS.reduce((acc, m, i) => ({ ...acc, [m.toLowerCase()]: i }), {});

/**
 * Accepts ISO strings, Date objects and the legacy "dd MMM yy HH:mm:ss" values
 * the spreadsheet produced. Port of parseDateTimeString() from the old pages.
 */
export function parseDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const str = String(value).trim();
  if (!str) return null;

  const native = new Date(str);
  if (!Number.isNaN(native.getTime())) return native;

  const parts = str.split(/\s+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const month = MONTH_INDEX[String(parts[1]).toLowerCase().slice(0, 3)];
    let year = parseInt(parts[2], 10);
    if (Number.isNaN(day) || month === undefined || Number.isNaN(year)) return null;
    if (year < 100) year += 2000;

    let [h, m, s] = [0, 0, 0];
    if (parts[3]) {
      const t = parts[3].split(':');
      h = parseInt(t[0], 10) || 0;
      m = parseInt(t[1], 10) || 0;
      s = parseInt(t[2], 10) || 0;
    }
    const parsed = new Date(year, month, day, h, m, s);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

const pad = (n) => String(n).padStart(2, '0');

/** "12 Aug 26" */
export function fmtDate(value, fallback = '') {
  const d = parseDate(value);
  if (!d) return fallback;
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
}

/** "12 Aug 26 14:30" */
export function fmtDateTime(value, fallback = '') {
  const d = parseDate(value);
  if (!d) return fallback;
  return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "12 Aug 26 14:30:05" — matches the sheet's full timestamp format. */
export function fmtFullTimestamp(value, fallback = '') {
  const d = parseDate(value);
  if (!d) return fallback;
  return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Timezone-safe YYYY-MM-DD (never shifts a date across midnight like toISOString). */
export function toISODate(value) {
  const d = parseDate(value);
  if (!d) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** YYYY-MM-DDTHH:mm — the value shape a datetime-local input expects. */
export function toDateTimeLocal(value) {
  const d = parseDate(value);
  if (!d) return '';
  return `${toISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const todayISO = () => toISODate(new Date());

/** " (3 days delay)" — port of computeDelayText(). */
export function delayText(dueDate, isCompleted) {
  if (isCompleted) return '';
  const due = parseDate(dueDate);
  if (!due) return '';
  const now = new Date();
  if (due >= now) return '';

  const diff = now - due;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000);
  if (days >= 1) return ` (${days} day${days > 1 ? 's' : ''} delay)`;
  if (hours >= 1) return ` (${hours}h delay)`;
  if (minutes >= 1) return ` (${minutes}m delay)`;
  return ' (just delayed)';
}

/** "+2d late" / "3d early" / "On time" badge for due-vs-actual. */
export function completionGap(dueDate, actual) {
  const due = parseDate(dueDate);
  const act = parseDate(actual);
  if (!due || !act) return null;
  const days = Math.round((act - due) / 86400000);
  if (days > 0) return { label: `+${days}d late`, tone: 'late' };
  if (days < 0) return { label: `${Math.abs(days)}d early`, tone: 'early' };
  return { label: 'On time', tone: 'ontime' };
}

/** Star count from the 5/10/15/20 score scale used by the Delegation form. */
export function starsForScore(score) {
  const pts = Number(score);
  if (!pts || Number.isNaN(pts)) return 0;
  if (pts >= 20) return 4;
  if (pts >= 15) return 3;
  if (pts >= 10) return 2;
  if (pts >= 5) return 1;
  return 0;
}

export const SCORE_BY_STARS = { 1: 5, 2: 10, 3: 15, 4: 20 };

/** Latest remark text out of either the array form or a legacy JSON string. */
export function latestRemark(remarks) {
  if (!remarks) return '';
  if (Array.isArray(remarks)) {
    if (!remarks.length) return '';
    return remarks[remarks.length - 1]?.remark || '';
  }
  const str = String(remarks).trim();
  if (str.startsWith('[')) {
    try {
      const arr = JSON.parse(str);
      if (Array.isArray(arr) && arr.length) return arr[arr.length - 1].remark || '';
    } catch {
      /* fall through to the raw string */
    }
  }
  return str;
}

/** Normalises either remark representation into a timeline-friendly array. */
export function remarkHistory(remarks) {
  if (!remarks) return [];
  if (Array.isArray(remarks)) return remarks;
  const str = String(remarks).trim();
  if (!str) return [];
  try {
    const arr = JSON.parse(str);
    if (Array.isArray(arr)) return arr;
  } catch {
    /* not JSON — treat as a single original note */
  }
  return [{ time: 'Original', remark: str, status: '', user: '' }];
}

export function downloadCsv(filename, columns, rows) {
  const escapeCell = (v) => {
    const value = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  };
  const body = [
    columns.map((c) => escapeCell(c.label)).join(','),
    ...rows.map((row) => columns.map((c) => escapeCell(c.value(row))).join(',')),
  ].join('\n');

  const blob = new Blob([`﻿${body}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const initials = (name) => String(name || '?').trim().charAt(0).toUpperCase() || '?';

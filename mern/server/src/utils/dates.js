const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_INDEX = MONTHS.reduce((acc, m, i) => ({ ...acc, [m.toLowerCase()]: i }), {});

/**
 * Robust date parser — accepts Date objects, ISO strings, datetime-local values
 * and the "dd MMM yy HH:mm:ss" strings the Apps Script front-end produced.
 * Port of parseBackendDate() from code.gs.
 */
function parseDate(val) {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  const str = String(val).trim();
  if (!str) return null;

  const native = new Date(str);
  if (!isNaN(native.getTime())) return native;

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
      h = parseInt(t[0] || 0, 10) || 0;
      m = parseInt(t[1] || 0, 10) || 0;
      s = parseInt(t[2] || 0, 10) || 0;
    }
    const parsed = new Date(year, month, day, h, m, s);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/** "dd MMM yy HH:mm:ss" — the sheet's datetime display format. */
function formatDateTime(val) {
  const d = parseDate(val);
  if (!d) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** "dd MMM yy" — the sheet's date-only display format. */
function formatDateOnly(val) {
  const d = parseDate(val);
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
}

/** Local (not UTC) YYYY-MM-DD key — used for "already reminded today" checks. */
function localISODate(val) {
  const d = parseDate(val);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** End of the given day (23:59:59.999) — how the sheet judged "delayed". */
function endOfDay(val) {
  const d = parseDate(val);
  if (!d) return null;
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Month arithmetic that clamps to the last valid day (Jan 31 → Feb 28). */
function addMonths(date, months) {
  const d = new Date(date);
  const targetMonth = (d.getMonth() + months) % 12;
  d.setMonth(d.getMonth() + months);
  if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) d.setDate(0);
  return d;
}

module.exports = {
  MONTHS,
  parseDate,
  formatDateTime,
  formatDateOnly,
  localISODate,
  endOfDay,
  addDays,
  addMonths,
};

import { useEffect, useRef, useState } from 'react';
import { fmtDate, todayISO } from '../utils/format';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Multi-date calendar popover — port of the openCalendar()/renderCalendar()
 * widget in Checklist.html. Past dates are disabled, and a Daily frequency
 * collapses the selection to a single start date that applies immediately.
 */
export default function MultiDatePicker({ value = [], onChange, frequency = '', triggerClassName = '' }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [cursor, setCursor] = useState(() => {
    const first = value[0] ? new Date(value[0]) : new Date();
    return { month: first.getMonth(), year: first.getFullYear() };
  });
  const rootRef = useRef(null);
  const singleDate = frequency === 'Daily';

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openPicker = () => {
    setDraft(value);
    const first = value[0] ? new Date(value[0]) : new Date();
    setCursor({ month: first.getMonth(), year: first.getFullYear() });
    setOpen(true);
  };

  const commit = (dates) => {
    onChange(dates);
    setOpen(false);
  };

  const toggleDate = (iso) => {
    if (singleDate) {
      commit([iso]);
      return;
    }
    setDraft((prev) => (prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort()));
  };

  const shiftMonth = (delta) =>
    setCursor(({ month, year }) => {
      const next = month + delta;
      if (next < 0) return { month: 11, year: year - 1 };
      if (next > 11) return { month: 0, year: year + 1 };
      return { month: next, year };
    });

  const today = todayISO();
  const firstDayIndex = new Date(cursor.year, cursor.month, 1).getDay();
  const lastDay = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const prevLastDay = new Date(cursor.year, cursor.month, 0).getDate();

  const label =
    value.length === 0
      ? 'Select Date(s)'
      : value.length === 1
        ? fmtDate(value[0])
        : `${value.length} dates selected`;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={openPicker}
        className={`w-full border border-sand-200 rounded-lg px-2.5 py-1.5 text-sm flex items-center justify-between
          hover:bg-sand-50 focus:ring-2 focus:ring-brand-500/25 outline-none text-left bg-white transition ${triggerClassName}`}
      >
        <span className={`truncate ${value.length ? 'text-sand-800 font-medium' : 'text-sand-400'}`}>
          {label}
        </span>
        <i className="far fa-calendar-alt text-brand-500 shrink-0 ml-1" />
      </button>

      {open && (
        <div className="absolute z-[120] mt-2 left-0 bg-white rounded-2xl shadow-raised border border-sand-200 p-4 w-72 animate-pop-in">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="w-8 h-8 grid place-items-center rounded-lg hover:bg-sand-100 text-sand-500 transition"
            >
              <i className="fas fa-chevron-left text-xs" />
            </button>
            <span className="text-sm font-bold text-sand-900">
              {MONTH_NAMES[cursor.month]} {cursor.year}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="w-8 h-8 grid place-items-center rounded-lg hover:bg-sand-100 text-sand-500 transition"
            >
              <i className="fas fa-chevron-right text-xs" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-sand-400 uppercase tracking-wider mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-3">
            {Array.from({ length: firstDayIndex }, (_, i) => (
              <div key={`lead-${i}`} className="p-1.5 text-xs text-sand-300 select-none">
                {prevLastDay - firstDayIndex + i + 1}
              </div>
            ))}
            {Array.from({ length: lastDay }, (_, i) => {
              const day = i + 1;
              const iso = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isPast = iso < today;
              const isSelected = draft.includes(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isPast}
                  onClick={() => toggleDate(iso)}
                  className={`w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-all duration-100 ${
                    isPast
                      ? 'text-sand-300 cursor-not-allowed'
                      : isSelected
                        ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
                        : 'text-sand-700 hover:bg-brand-50'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-sand-200 text-xs">
            <span className="text-sand-500 font-medium">{draft.length} selected</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setDraft([])}
                className="px-2.5 py-1.5 rounded-lg border border-sand-200 bg-white hover:bg-sand-50 text-sand-600 font-medium transition"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => commit(draft)}
                className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow transition"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

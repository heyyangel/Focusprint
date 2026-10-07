import { useEffect, useState } from 'react';
import SlidePanel from '../SlidePanel';
import MultiDatePicker from '../MultiDatePicker';
import { toISODate } from '../../utils/format';
import { toast, FREQUENCIES } from '../../utils/ui';

const WEEKDAYS = [
  { day: 1, short: 'M', label: 'Monday' },
  { day: 2, short: 'T', label: 'Tuesday' },
  { day: 3, short: 'W', label: 'Wednesday' },
  { day: 4, short: 'T', label: 'Thursday' },
  { day: 5, short: 'F', label: 'Friday' },
  { day: 6, short: 'S', label: 'Saturday' },
];

/** Next occurrence of a weekday, starting today — port of getUpcomingDayDate(). */
function upcomingWeekday(dayOfWeek) {
  const today = new Date();
  const result = new Date(today);
  result.setDate(today.getDate() + ((dayOfWeek - today.getDay() + 7) % 7));
  return toISODate(result);
}

/** How many occurrences the server will generate for each frequency. */
const OCCURRENCES = { Daily: 365, Weekly: 52, Monthly: 12, Quarterly: 4 };

let rowSeq = 0;
const blankRow = () => ({
  key: `row-${Date.now()}-${(rowSeq += 1)}`,
  name: '',
  frequency: '',
  dates: [],
  proofRequired: 'No',
  verifiedBy: '',
  taskDescription: '',
});

/**
 * Bulk Add drawer — port of addBulkRow() / collectBulkRows() / submitBulk()
 * from Checklist.html. The recurrence expansion itself now runs server-side;
 * this form only collects the start date(s) plus the frequency.
 */
export default function BulkAddPanel({ open, onClose, onSubmit, users }) {
  const [rows, setRows] = useState([blankRow(), blankRow()]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setRows([blankRow(), blankRow()]);
  }, [open]);

  const names = users.map((u) => u.name);
  const patch = (key, changes) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...changes } : r)));

  const changeFrequency = (row, frequency) => {
    // Daily generates from a single start date, so collapse any extra picks.
    const dates = frequency === 'Daily' && row.dates.length > 1 ? [row.dates[0]] : row.dates;
    patch(row.key, { frequency, dates });
  };

  const toggleWeekday = (row, day) => {
    const iso = upcomingWeekday(day);
    const dates = row.dates.includes(iso)
      ? row.dates.filter((d) => d !== iso)
      : [...row.dates, iso].sort();
    patch(row.key, { dates });
  };

  const submit = async () => {
    const payload = rows
      .filter((r) => r.name.trim() && r.taskDescription.trim() && r.dates.length)
      .map((r) => ({
        name: r.name.trim(),
        email: users.find((u) => u.name === r.name)?.email || '',
        taskDescription: r.taskDescription.trim(),
        frequency: r.frequency,
        dates: r.dates,
        proofRequired: r.proofRequired,
        verifiedBy: r.verifiedBy,
      }));

    if (!payload.length) {
      toast('Add at least one complete task with due date(s)', 'warning');
      return;
    }

    setBusy(true);
    try {
      await onSubmit(payload);
    } finally {
      setBusy(false);
    }
  };

  const totalGenerated = rows.reduce((sum, r) => {
    if (!r.name.trim() || !r.taskDescription.trim() || !r.dates.length) return sum;
    return sum + (OCCURRENCES[r.frequency] || r.dates.length);
  }, 0);

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      side="left"
      width="max-w-6xl"
      icon="fa-layer-group"
      title="Bulk add tasks"
      subtitle="Generate a recurring checklist series"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-xs text-sand-500">
            {totalGenerated > 0
              ? `${totalGenerated} task occurrence(s) will be generated`
              : 'Fill a row to generate tasks'}
          </span>
          <div className="flex gap-3">
            <button type="button" className="fp-btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={submit}
              className="fp-btn-primary"
            >
              <i className={`fas ${busy ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk'}`} />
              {busy ? 'Saving…' : 'Generate tasks'}
            </button>
          </div>
        </div>
      }
    >
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-sand-500">
          A recurring frequency expands automatically from the first selected date —
          Daily 365×, Weekly 52×, Monthly 12×, Quarterly 4×. Yearly and blank use exactly
          the dates you pick.
        </p>
        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, blankRow()])}
          className="fp-btn-subtle shrink-0"
        >
          <i className="fas fa-plus" /> Add Row
        </button>
      </div>

      <div className="space-y-4">
        {rows.map((row, index) => (
          <div key={row.key} className="rounded-2xl border border-sand-200 bg-white shadow-card overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_1.5fr_0.8fr_1.2fr_auto] gap-3 p-4 bg-white items-start">
              <div>
                <label className="fp-label">Name *</label>
                <select
                  className="fp-input-sm"
                  value={row.name}
                  onChange={(e) => patch(row.key, { name: e.target.value })}
                >
                  <option value="">Select assignee...</option>
                  {names.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="fp-label">Frequency</label>
                <select
                  className="fp-input-sm"
                  value={row.frequency}
                  onChange={(e) => changeFrequency(row, e.target.value)}
                >
                  <option value="">Select</option>
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="fp-label">Due Date(s) *</label>
                {row.frequency === 'Weekly' && (
                  <div className="flex gap-1.5 mb-2">
                    {WEEKDAYS.map((w) => {
                      const active = row.dates.includes(upcomingWeekday(w.day));
                      return (
                        <button
                          key={w.day}
                          type="button"
                          title={w.label}
                          onClick={() => toggleWeekday(row, w.day)}
                          className={`w-6 h-6 rounded-full text-[10px] font-bold border transition flex items-center justify-center ${
                            active
                              ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                              : 'bg-white border-sand-200 text-sand-500 hover:bg-sand-50'
                          }`}
                        >
                          {w.short}
                        </button>
                      );
                    })}
                  </div>
                )}
                <MultiDatePicker
                  value={row.dates}
                  frequency={row.frequency}
                  onChange={(dates) => patch(row.key, { dates })}
                />
                {row.dates.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {row.dates.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 border border-brand-200 px-2 py-0.5 rounded-full text-xs font-medium"
                      >
                        {d}
                        <button
                          type="button"
                          aria-label={`Remove ${d}`}
                          onClick={() => patch(row.key, { dates: row.dates.filter((x) => x !== d) })}
                          className="hover:text-red-500 font-bold"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="fp-label">Proof</label>
                <select
                  className="fp-input-sm"
                  value={row.proofRequired}
                  onChange={(e) => patch(row.key, { proofRequired: e.target.value })}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              <div>
                <label className="fp-label">Verified by</label>
                <select
                  className="fp-input-sm"
                  value={row.verifiedBy}
                  onChange={(e) => patch(row.key, { verifiedBy: e.target.value })}
                >
                  <option value="">Select verifier...</option>
                  {names.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  aria-label={`Remove row ${index + 1}`}
                  onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== row.key) : rs))}
                  className="w-8 h-8 grid place-items-center rounded-lg text-sand-400 hover:bg-red-50 hover:text-red-600 transition"
                >
                  <i className="fas fa-trash-alt text-xs" />
                </button>
              </div>
            </div>

            <div className="p-3 bg-sand-50 border-t border-sand-200 flex flex-col sm:flex-row sm:items-start gap-2">
              <span className="text-xs font-semibold text-sand-500 shrink-0 sm:mt-2 flex items-center gap-1">
                <i className="far fa-file-lines text-brand-500" /> Description * :
              </span>
              <textarea
                rows={1}
                className="fp-input-sm resize-y"
                placeholder="Type the task description here…"
                value={row.taskDescription}
                onChange={(e) => patch(row.key, { taskDescription: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
    </SlidePanel>
  );
}

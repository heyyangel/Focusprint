import { useEffect, useState } from 'react';
import SlidePanel from '../SlidePanel';
import CheckboxList from '../CheckboxList';
import { todayISO } from '../../utils/format';

export const DEFAULT_TASK_FILTERS = {
  names: [],
  frequencies: [],
  verifiers: [],
  // The old UI defaulted the Task Center to pending work only.
  statuses: ['pending'],
  fromDate: '',
  toDate: '',
};

const STATUS_LABELS = {
  pending: 'Pending (not yet completed)',
  completed: 'Completed (has an actual date)',
};

export default function TasksFilterPanel({ open, onClose, filters, onApply, options }) {
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const today = todayISO();

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      side="left"
      width="max-w-sm"
      icon="fa-sliders"
      title="Filter tasks"
      subtitle="Task Center"
      footer={
        <>
          <button
            type="button"
            className="fp-btn-ghost flex-1"
            onClick={() => {
              setDraft(DEFAULT_TASK_FILTERS);
              onApply(DEFAULT_TASK_FILTERS);
              onClose();
            }}
          >
            Clear All
          </button>
          <button
            type="button"
            className="fp-btn-primary flex-1"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            Apply
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <span className="text-sm font-semibold text-sand-700 mb-1.5 block">
            Task Date Range (Past / Today)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              max={today}
              value={draft.fromDate}
              aria-label="From date"
              className="fp-input-sm"
              onChange={(e) => set({ fromDate: e.target.value })}
            />
            <input
              type="date"
              max={today}
              value={draft.toDate}
              aria-label="To date"
              className="fp-input-sm"
              onChange={(e) => set({ toDate: e.target.value })}
            />
          </div>
        </div>

        <CheckboxList
          label="Name"
          searchable
          searchPlaceholder="Search names…"
          items={options.names}
          selected={draft.names}
          onChange={(v) => set({ names: v })}
          maxHeight="max-h-40"
        />
        <CheckboxList
          label="Frequency"
          items={['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Once']}
          selected={draft.frequencies}
          onChange={(v) => set({ frequencies: v })}
        />
        <CheckboxList
          label="Verified By"
          searchable
          searchPlaceholder="Search verifiers…"
          items={options.verifiers}
          selected={draft.verifiers}
          onChange={(v) => set({ verifiers: v })}
          emptyText="No verifiers found"
          maxHeight="max-h-40"
        />

        <div>
          <span className="text-sm font-semibold text-sand-700 mb-1.5 block">Status</span>
          <div className="border border-sand-200 rounded-xl divide-y divide-sand-100 bg-white">
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2.5 px-3 py-2 hover:bg-brand-50/60 cursor-pointer transition">
                <input
                  type="checkbox"
                  className="accent-brand-600 w-3.5 h-3.5"
                  checked={draft.statuses.includes(value)}
                  onChange={() =>
                    set({
                      statuses: draft.statuses.includes(value)
                        ? draft.statuses.filter((s) => s !== value)
                        : [...draft.statuses, value],
                    })
                  }
                />
                <span className="text-sm text-sand-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </SlidePanel>
  );
}

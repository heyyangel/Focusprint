import { useState, useEffect } from 'react';
import SlidePanel from '../SlidePanel';
import CheckboxList from '../CheckboxList';
import { todayISO } from '../../utils/format';
import { DELEGATION_STATUSES } from '../../utils/ui';

export const DEFAULT_DELEGATION_FILTERS = {
  delegators: [],
  delegatees: [],
  priorities: [],
  // Same default the Apps Script applied: everything except the finished states.
  statuses: ['Pending', 'In Progress', 'Hold', 'Approval Waiting', 'Overdue'],
  departments: [],
  fromDate: '',
  toDate: '',
};

export default function DelegationFilterPanel({ open, onClose, filters, onApply, options }) {
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
      subtitle="Delegation Manager"
      footer={
        <>
          <button
            type="button"
            className="fp-btn-ghost flex-1"
            onClick={() => {
              setDraft(DEFAULT_DELEGATION_FILTERS);
              onApply(DEFAULT_DELEGATION_FILTERS);
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
          <p className="text-[11px] text-sand-400 mt-1">
            Filters on the revised due date when one exists, otherwise the due date.
          </p>
        </div>

        <CheckboxList
          label="Delegator"
          searchable
          items={options.delegators}
          selected={draft.delegators}
          onChange={(v) => set({ delegators: v })}
        />
        <CheckboxList
          label="Delegatee"
          searchable
          items={options.delegatees}
          selected={draft.delegatees}
          onChange={(v) => set({ delegatees: v })}
        />
        <CheckboxList
          label="Priority"
          items={['High', 'Medium', 'Low']}
          selected={draft.priorities}
          onChange={(v) => set({ priorities: v })}
        />
        <CheckboxList
          label="Status"
          items={DELEGATION_STATUSES}
          selected={draft.statuses}
          onChange={(v) => set({ statuses: v })}
        />
        <CheckboxList
          label="Department"
          searchable
          items={options.departments}
          selected={draft.departments}
          onChange={(v) => set({ departments: v })}
        />
      </div>
    </SlidePanel>
  );
}

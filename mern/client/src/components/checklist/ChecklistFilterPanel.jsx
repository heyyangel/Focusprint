import { useEffect, useState } from 'react';
import SlidePanel from '../SlidePanel';
import CheckboxList from '../CheckboxList';
import { FREQUENCIES } from '../../utils/ui';

export const DEFAULT_CHECKLIST_FILTERS = {
  names: [],
  frequencies: [],
  verifiers: [],
  fromDate: '',
  toDate: '',
};

export default function ChecklistFilterPanel({ open, onClose, filters, onApply, options }) {
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      side="left"
      width="max-w-sm"
      icon="fa-sliders"
      title="Filter tasks"
      subtitle="Checklist Manager"
      footer={
        <>
          <button
            type="button"
            className="fp-btn-ghost flex-1"
            onClick={() => {
              setDraft(DEFAULT_CHECKLIST_FILTERS);
              onApply(DEFAULT_CHECKLIST_FILTERS);
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
          <span className="text-sm font-semibold text-sand-700 mb-1.5 block">Task Date Range</span>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={draft.fromDate}
              aria-label="From date"
              className="fp-input-sm"
              onChange={(e) => set({ fromDate: e.target.value })}
            />
            <input
              type="date"
              value={draft.toDate}
              aria-label="To date"
              className="fp-input-sm"
              onChange={(e) => set({ toDate: e.target.value })}
            />
          </div>
          <p className="text-[11px] text-sand-400 mt-1">
            Leave empty to keep the default “Today &amp; Tomorrow” window.
          </p>
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
          items={FREQUENCIES}
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
      </div>
    </SlidePanel>
  );
}

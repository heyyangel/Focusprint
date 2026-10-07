import { useEffect, useMemo, useState } from 'react';
import SlidePanel from '../SlidePanel';
import { ToggleGroup, StarRating } from '../common';
import { toDateTimeLocal } from '../../utils/format';
import { toast } from '../../utils/ui';
import { isPrivileged } from '../../utils/permissions';

const EMPTY = {
  delegator: '',
  delegatee: '',
  parentTask: '',
  department: '',
  taskTitle: '',
  task: '',
  priority: '',
  score: '',
  dueDate: '',
  proofRequired: 'No',
  approvalRequired: 'No',
  documentRequired: 'No',
  subMonitoring: 'No',
  subMonitoringUser: '',
};

const YES_NO = [
  { value: 'Yes', label: 'Yes', activeClass: 'bg-brand-600 text-white border-brand-600 shadow-sm', hoverClass: 'hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200' },
  { value: 'No', label: 'No', activeClass: 'bg-sand-500 text-white border-sand-500 shadow-sm' },
];

const PRIORITY_OPTIONS = [
  { value: 'High', label: 'High', activeClass: 'bg-red-600 text-white border-red-600 shadow-sm', hoverClass: 'hover:bg-red-50 hover:text-red-600 hover:border-red-200' },
  { value: 'Medium', label: 'Medium', activeClass: 'bg-amber-500 text-white border-amber-500 shadow-sm', hoverClass: 'hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200' },
  { value: 'Low', label: 'Low', activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm', hoverClass: 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200' },
];

/**
 * Add / Edit Task drawer — port of openAddModal(), openEditModal() and
 * submitForm() from Delegation.html.
 */
export default function DelegationForm({
  open,
  onClose,
  onSubmit,
  editing, // the row being edited, or null when adding
  currentUser,
  users,
  hierarchy,
  departments,
  parentTaskOptions,
}) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const allNames = useMemo(() => users.map((u) => u.name).sort(), [users]);
  const isEdit = !!editing;

  // A plain Delegator always delegates in their own name; Admin/PC may pick anyone.
  const delegatorLocked = !isPrivileged(currentUser);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const monitor = String(editing.subMonitoring || '').trim();
      const monitoringOn = monitor && monitor !== 'No';
      setForm({
        delegator: editing.delegator || '',
        delegatee: editing.delegatee || '',
        parentTask: editing.parentTask || '',
        department: editing.department || '',
        taskTitle: editing.taskTitle || '',
        task: editing.task || '',
        priority: editing.priority || '',
        score: editing.score === '' || editing.score === null ? '' : editing.score,
        dueDate: toDateTimeLocal(editing.dueDate),
        proofRequired: editing.proofRequired || 'No',
        approvalRequired: editing.approvalRequired || 'No',
        documentRequired: editing.documentRequired || 'No',
        subMonitoring: monitoringOn ? 'Yes' : 'No',
        subMonitoringUser: monitoringOn ? monitor : '',
      });
    } else {
      setForm({ ...EMPTY, delegator: currentUser?.name || '' });
    }
  }, [open, editing, currentUser]);

  // Narrow the delegatee list to the people mapped under the chosen delegator.
  const delegateeOptions = useMemo(() => {
    const picked = String(form.delegator || '').trim().toLowerCase();
    if (picked && hierarchy.length) {
      const mapped = hierarchy
        .filter((h) => String(h.delegator || '').toLowerCase() === picked)
        .map((h) => h.delegatee)
        .filter(Boolean);
      if (mapped.length) return [...new Set(mapped)].sort();
    }
    return allNames;
  }, [form.delegator, hierarchy, allNames]);

  const delegatorOptions = useMemo(() => {
    const fromHierarchy = [...new Set(hierarchy.map((h) => h.delegator).filter(Boolean))].sort();
    const base = fromHierarchy.length ? fromHierarchy : allNames;
    // Always keep the signed-in user selectable.
    return currentUser?.name && !base.includes(currentUser.name)
      ? [currentUser.name, ...base]
      : base;
  }, [hierarchy, allNames, currentUser]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // Auto-fill the department from the chosen delegatee's Doer List record.
  const onDelegateeChange = (name) => {
    const matched = users.find((u) => u.name.toLowerCase() === name.toLowerCase());
    set({ delegatee: name, department: matched?.department || form.department });
  };

  const submit = async () => {
    if (!form.delegator || !form.delegatee || !form.taskTitle.trim() || !form.task.trim() || !form.dueDate) {
      toast('Please fill all required fields (*)', 'warning');
      return;
    }
    if (form.subMonitoring === 'Yes' && !form.subMonitoringUser) {
      toast('Please select a person for Sub-Monitoring', 'warning');
      return;
    }

    setBusy(true);
    try {
      await onSubmit({
        delegator: form.delegator,
        delegatee: form.delegatee,
        parentTask: form.parentTask.trim(),
        department: form.department.trim(),
        taskTitle: form.taskTitle.trim(),
        task: form.task.trim(),
        priority: form.priority,
        score: form.score,
        dueDate: form.dueDate,
        proofRequired: form.proofRequired,
        approvalRequired: form.approvalRequired,
        documentRequired: form.documentRequired,
        // The backend stores the monitor's name, or 'No' when disabled.
        subMonitoring: form.subMonitoring === 'Yes' ? form.subMonitoringUser : 'No',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      width="max-w-lg"
      icon={isEdit ? 'fa-pencil-alt' : 'fa-plus-circle'}
      title={isEdit ? `Edit ${editing.taskId}` : 'New delegation task'}
      subtitle={isEdit ? 'Update the assignment details' : 'Assign work to a team member'}
      footer={
        <>
          <button type="button" className="fp-btn-ghost flex-1" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="fp-btn-primary flex-1"
          >
            <i className={`fas ${busy ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk'}`} />
            {busy ? 'Saving…' : isEdit ? 'Update task' : 'Save task'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="f-delegator" className="fp-label">Delegator *</label>
          <select
            id="f-delegator"
            className="fp-input disabled:bg-sand-100 disabled:cursor-not-allowed"
            value={form.delegator}
            disabled={delegatorLocked}
            onChange={(e) => set({ delegator: e.target.value, delegatee: '' })}
          >
            <option value="">Select delegator...</option>
            {delegatorOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="f-delegatee" className="fp-label">Delegatee *</label>
          <select
            id="f-delegatee"
            className="fp-input"
            value={form.delegatee}
            onChange={(e) => onDelegateeChange(e.target.value)}
          >
            <option value="">Select delegatee...</option>
            {delegateeOptions.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="f-parent" className="fp-label">Parent Task</label>
          <input
            id="f-parent"
            list="fp-parent-tasks"
            className="fp-input"
            placeholder="Search parent task (title or ID)"
            value={form.parentTask}
            onChange={(e) => set({ parentTask: e.target.value })}
          />
          <datalist id="fp-parent-tasks">
            {parentTaskOptions.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="f-department" className="fp-label">Department</label>
          <select
            id="f-department"
            className="fp-input"
            value={form.department}
            onChange={(e) => set({ department: e.target.value })}
          >
            <option value="">Select department...</option>
            {[...new Set([...departments, form.department].filter(Boolean))].sort().map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <span className="fp-label">Priority</span>
          <ToggleGroup
            options={PRIORITY_OPTIONS}
            value={form.priority}
            onChange={(v) => set({ priority: form.priority === v ? '' : v })}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="f-title" className="fp-label">Task Title *</label>
          <input
            id="f-title"
            className="fp-input"
            placeholder="Short title"
            value={form.taskTitle}
            onChange={(e) => set({ taskTitle: e.target.value })}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="f-task" className="fp-label">Task Description *</label>
          <textarea
            id="f-task"
            rows={3}
            className="fp-input resize-none"
            placeholder="Detailed description…"
            value={form.task}
            onChange={(e) => set({ task: e.target.value })}
          />
        </div>

        <div>
          <span className="fp-label">Score (Stars)</span>
          <div className="h-[38px] flex items-center">
            <StarRating value={Number(form.score) || 0} onChange={(v) => set({ score: v })} />
          </div>
        </div>

        <div>
          <label htmlFor="f-due" className="fp-label">Due Date *</label>
          <input
            id="f-due"
            type="datetime-local"
            className="fp-input"
            value={form.dueDate}
            onChange={(e) => set({ dueDate: e.target.value })}
          />
        </div>

        <div>
          <span className="fp-label">Proof Required</span>
          <ToggleGroup
            options={YES_NO}
            value={form.proofRequired}
            onChange={(v) => set({ proofRequired: v })}
          />
        </div>

        <div>
          <span className="fp-label">Approval Required</span>
          <ToggleGroup
            options={YES_NO}
            value={form.approvalRequired}
            onChange={(v) => set({ approvalRequired: v })}
          />
        </div>

        <div className="sm:col-span-2">
          <span className="fp-label">Sub-Monitoring</span>
          <div className="flex flex-col gap-3 bg-brand-50 border border-brand-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <ToggleGroup
                className="w-48"
                options={[
                  { value: 'Yes', label: 'Enable', activeClass: 'bg-brand-600 text-white border-brand-600 shadow-sm', hoverClass: 'hover:bg-brand-100 hover:text-brand-700 hover:border-brand-200' },
                  { value: 'No', label: 'Disable', activeClass: 'bg-sand-500 text-white border-sand-500 shadow-sm' },
                ]}
                value={form.subMonitoring}
                onChange={(v) => set({ subMonitoring: v, subMonitoringUser: v === 'Yes' ? form.subMonitoringUser : '' })}
              />
              <p className="text-xs text-brand-700">Assign someone to keep an eye on this task.</p>
            </div>

            {form.subMonitoring === 'Yes' && (
              <div>
                <label htmlFor="f-monitor" className="block text-xs font-semibold text-brand-800 mb-1">
                  Select Person to Monitor *
                </label>
                <select
                  id="f-monitor"
                  className="fp-input border-brand-200"
                  value={form.subMonitoringUser}
                  onChange={(e) => set({ subMonitoringUser: e.target.value })}
                >
                  <option value="">Select person...</option>
                  {allNames.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </SlidePanel>
  );
}

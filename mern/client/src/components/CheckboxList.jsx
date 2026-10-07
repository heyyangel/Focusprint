import { useState } from 'react';

/**
 * Searchable multi-select block used throughout the filter panels
 * (buildCheckboxList / buildNameCheckboxes in the Apps Script pages).
 */
export default function CheckboxList({
  label,
  items,
  selected,
  onChange,
  searchable = false,
  searchPlaceholder = 'Search…',
  emptyText = 'No matches',
  maxHeight = 'max-h-36',
}) {
  const [query, setQuery] = useState('');
  const filtered = query
    ? items.filter((i) => String(i).toLowerCase().includes(query.toLowerCase()))
    : items;

  const toggle = (value) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-sand-700">{label}</span>
        {selected.length > 0 && (
          <button
            type="button"
            className="text-xs font-semibold text-brand-600 hover:underline"
            onClick={() => onChange([])}
          >
            Clear
          </button>
        )}
      </div>

      {searchable && (
        <div className="relative mb-1.5">
          <i className="fas fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-sand-400 text-xs" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={`Search ${label}`}
            className="fp-input-sm pl-7"
          />
        </div>
      )}

      <div className={`${maxHeight} overflow-y-auto scrollbar-slim border border-sand-200 rounded-xl divide-y divide-sand-100 bg-white`}>
        {filtered.length === 0 ? (
          <p className="text-xs text-sand-400 p-3 text-center">{emptyText}</p>
        ) : (
          filtered.map((value) => (
            <label
              key={value}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-brand-50/60 cursor-pointer transition"
            >
              <input
                type="checkbox"
                className="accent-brand-600 w-3.5 h-3.5"
                checked={selected.includes(value)}
                onChange={() => toggle(value)}
              />
              <span className="text-sm text-sand-700">{value}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

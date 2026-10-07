import { Link } from 'react-router-dom';
import { initials } from '../utils/format';

/** Brand mark — the Focus Prints LLP logo plus the ERP wordmark. */
export function Logo({ size = 'md', showWordmark = true }) {
  const heights = { sm: 'h-7', md: 'h-9', lg: 'h-14', xl: 'h-16' };
  return (
    <div className="flex items-center gap-3">
      <img
        src="/logo.png"
        alt="Focus Prints LLP"
        className={`${heights[size] || heights.md} w-auto object-contain`}
      />
      {showWordmark && (
        <span className="hidden sm:block border-l border-sand-200 pl-3 leading-tight">
          <span className="block font-display text-base font-bold text-sand-900">Focus Prints</span>
          <span className="block text-[10px] tracking-[0.16em] uppercase text-brand-600">ERP Suite</span>
        </span>
      )}
    </div>
  );
}

/** Circular initial badge for a person. */
export function Avatar({ name, size = 'md', gradient = 'from-brand-400 to-brand-600' }) {
  const sizes = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  };
  return (
    <span
      title={name}
      className={`${sizes[size] || sizes.md} shrink-0 rounded-full bg-gradient-to-br ${gradient}
        grid place-items-center text-white font-bold`}
    >
      {initials(name)}
    </span>
  );
}

/** Coloured status / priority / frequency pill. */
export function Pill({ tone = 'bg-sand-100 text-sand-600', icon, children, title }) {
  return (
    <span className={`fp-pill ${tone}`} title={title}>
      {icon ? <i className={`fas ${icon} text-[10px]`} /> : null}
      {children}
    </span>
  );
}

/* ── Dashboard tiles ───────────────────────────────────────────────── */

const TONES = {
  brand: { wrap: 'bg-brand-50 text-brand-700', ring: 'ring-brand-100' },
  amber: { wrap: 'bg-amber-50 text-amber-700', ring: 'ring-amber-100' },
  emerald: { wrap: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-100' },
  red: { wrap: 'bg-red-50 text-red-700', ring: 'ring-red-100' },
  blue: { wrap: 'bg-blue-50 text-blue-700', ring: 'ring-blue-100' },
  sand: { wrap: 'bg-sand-100 text-sand-700', ring: 'ring-sand-200' },
};

/**
 * KPI tile. Sized to stay readable two-up on a 360px phone: the icon and figure
 * shrink, the label is allowed to wrap rather than truncate, and the hint line
 * is dropped until there is room for it.
 */
export function StatCard({ label, value, icon, tone = 'brand', hint, onClick, to, active = false }) {
  const t = TONES[tone] || TONES.brand;
  const interactive = !!(onClick || to);

  // `to` navigates — as a real link, so middle-click and open-in-new-tab work.
  // `onClick` filters in place. Neither renders a plain, inert tile.
  const Tag = to ? Link : onClick ? 'button' : 'div';
  const tagProps = to ? { to } : onClick ? { type: 'button', onClick } : {};

  return (
    <Tag
      {...tagProps}
      className={`group fp-card p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 text-left w-full transition-all duration-150
        ${interactive ? 'hover:shadow-raised hover:-translate-y-0.5 hover:border-brand-200 cursor-pointer' : ''}
        ${active ? `ring-2 ${t.ring} border-transparent` : ''}`}
    >
      <span className={`grid place-items-center w-9 h-9 sm:w-11 sm:h-11 shrink-0 rounded-xl ${t.wrap}`}>
        <i className={`fas ${icon} text-base sm:text-lg`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-sand-500 leading-tight">
          {label}
        </span>
        <span className="block font-display text-xl sm:text-2xl font-bold text-sand-900 tabular leading-tight">
          {value}
        </span>
        {hint ? (
          <span className="hidden sm:block text-[11px] text-sand-400 truncate">{hint}</span>
        ) : null}
      </span>
      {interactive && (
        <i className="fas fa-arrow-right text-xs text-sand-300 shrink-0 opacity-0 -translate-x-1
                      group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150" />
      )}
    </Tag>
  );
}

/** Responsive strip of KPI tiles — two-up on phones, full row on laptops. */
export function StatGrid({ children, cols = 4 }) {
  const map = {
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 lg:grid-cols-5',
  };
  return <div className={`grid gap-3 sm:gap-4 ${map[cols] || map[4]}`}>{children}</div>;
}

/** Titled content panel — the standard container for a page section. */
export function Section({ title, icon, description, actions, children, bodyClass = '', className = '' }) {
  return (
    <section className={`fp-section ${className}`}>
      {(title || actions) && (
        <div className="fp-section-head">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <span className="grid place-items-center w-8 h-8 rounded-lg bg-brand-50 text-brand-600 shrink-0">
                <i className={`fas ${icon} text-sm`} />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-sand-900 truncate">{title}</h2>
              {description && <p className="text-xs text-sand-500 truncate">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">{actions}</div>}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

/** Standard page wrapper — consistent gutters and vertical rhythm. */
export function PageBody({ children, className = '' }) {
  return (
    <div className={`px-4 sm:px-6 py-5 space-y-5 animate-rise-in ${className}`}>{children}</div>
  );
}

/** Row of page-level controls sitting above the data section. */
export function Toolbar({ children, className = '' }) {
  return <div className={`flex flex-wrap items-center gap-2 ${className}`}>{children}</div>;
}

/* ── States ────────────────────────────────────────────────────────── */

export function Spinner({ label = 'Loading…', className = 'py-16' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-sand-400 ${className}`}>
      <i className="fas fa-circle-notch fa-spin text-3xl mb-3 text-brand-500" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon = 'fa-inbox', title = 'Nothing here yet', hint }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <span className="grid place-items-center w-14 h-14 rounded-2xl bg-sand-100 text-sand-400 mb-3">
        <i className={`fas ${icon} text-xl`} />
      </span>
      <p className="text-sm font-semibold text-sand-700">{title}</p>
      {hint ? <p className="text-xs text-sand-500 mt-1 max-w-sm">{hint}</p> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <span className="grid place-items-center w-14 h-14 rounded-2xl bg-red-50 text-red-500 mb-3">
        <i className="fas fa-triangle-exclamation text-xl" />
      </span>
      <p className="text-sm font-semibold text-red-600">Something went wrong</p>
      <p className="text-xs text-sand-500 mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="fp-btn-ghost mt-4">
          <i className="fas fa-rotate-right" /> Try again
        </button>
      )}
    </div>
  );
}

/* ── Controls ──────────────────────────────────────────────────────── */

/** "All | By Me | To Me" segmented control. */
export function RoleSwitcher({ options, value, onChange }) {
  if (!options.length) return null;
  return (
    <div className="flex bg-sand-100 rounded-xl p-0.5 border border-sand-200/70" role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
            value === opt.value ? 'bg-white text-brand-700 shadow-sm' : 'text-sand-500 hover:text-sand-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/** Yes/No or multi-option segmented button group used across the forms. */
export function ToggleGroup({ options, value, onChange, className = '' }) {
  return (
    <div className={`flex gap-1.5 ${className}`}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all duration-150 active:scale-[0.97] ${
              active
                ? opt.activeClass || 'bg-brand-600 text-white border-brand-600 shadow-sm'
                : `bg-white border-sand-200 text-sand-500 ${opt.hoverClass || 'hover:bg-sand-50 hover:text-sand-700'}`
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** 4-star score picker mapping to the 5 / 10 / 15 / 20 point scale. */
export function StarRating({ value, onChange, readOnly = false }) {
  const active = value >= 20 ? 4 : value >= 15 ? 3 : value >= 10 ? 2 : value >= 5 ? 1 : 0;
  const SCORE = { 1: 5, 2: 10, 3: 15, 4: 20 };

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1.5 text-xl">
        {[1, 2, 3, 4].map((s) => (
          <button
            key={s}
            type="button"
            disabled={readOnly}
            aria-label={`${s} star${s > 1 ? 's' : ''} (${SCORE[s]} points)`}
            onClick={() => !readOnly && onChange(value === SCORE[s] ? '' : SCORE[s])}
            className={readOnly ? 'cursor-default' : 'hover:scale-110 transition duration-150'}
          >
            <i className={s <= active ? 'fas fa-star text-amber-400' : 'far fa-star text-sand-300'} />
          </button>
        ))}
      </div>
      <span className="text-xs font-bold text-amber-600 tabular">
        {active > 0 ? `${value} pts` : 'No score'}
      </span>
    </div>
  );
}

/** Filter button with an active-count badge. */
export function FilterButton({ count = 0, onClick }) {
  return (
    <button type="button" onClick={onClick} className="fp-btn-ghost px-3 sm:px-4">
      <i className="fas fa-sliders text-brand-500" />
      <span className="hidden sm:inline">Filter</span>
      {count > 0 && (
        <span className="grid place-items-center w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-bold">
          {count}
        </span>
      )}
    </button>
  );
}

export function ExportButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="fp-btn-ghost px-3 sm:px-4" title="Export to CSV">
      <i className="fas fa-file-arrow-down text-emerald-600" />
      <span className="hidden sm:inline">Export</span>
    </button>
  );
}

/** Search field used in page toolbars. */
export function SearchInput({ value, onChange, placeholder = 'Search…', className = 'flex-1 min-w-[140px] sm:flex-none sm:w-56' }) {
  return (
    <div className={`relative ${className}`}>
      <i className="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-sand-400 text-xs" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="fp-input pl-8 py-2"
      />
    </div>
  );
}

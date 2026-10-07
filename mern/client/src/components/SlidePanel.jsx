import { useEffect } from 'react';

/**
 * The sliding drawer used by every filter / add / remark panel — the React
 * equivalent of the openModal()/closeModal() pair in the Apps Script pages.
 */
export default function SlidePanel({
  open,
  onClose,
  side = 'right',
  title,
  subtitle,
  icon,
  width = 'max-w-lg',
  footer,
  children,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-brand-950/45 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      role="presentation"
    >
      <div
        className={`absolute top-0 ${side === 'right' ? 'right-0' : 'left-0'} h-full w-full ${width}
          bg-sand-50 shadow-panel flex flex-col
          ${side === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Panel'}
      >
        <div className="shrink-0 px-5 py-4 flex justify-between items-center bg-brand-950 text-white">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <span className="grid place-items-center w-9 h-9 rounded-xl bg-white/10 text-brand-200 shrink-0">
                <i className={`fas ${icon}`} />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-tight truncate">{title}</h2>
              {subtitle && <p className="text-[11px] text-brand-300 truncate">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="w-8 h-8 grid place-items-center rounded-lg text-brand-200 hover:bg-white/10 hover:text-white transition shrink-0"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-slim p-5">{children}</div>

        {footer ? (
          <div className="shrink-0 p-4 border-t border-sand-200 bg-white flex gap-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { moduleByPath } from '../utils/navigation';
import { initials } from '../utils/format';

const LONG_DATE = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };

/** Page chrome above the content column: title, live clock, user menu. */
export default function Topbar({ onOpenMobileNav, onSignOut }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const active = moduleByPath(pathname);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 h-16 shrink-0 bg-white/85 backdrop-blur border-b border-sand-200/70">
      <div className="h-full px-4 sm:px-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
          className="lg:hidden w-9 h-9 grid place-items-center rounded-lg text-sand-600 hover:bg-sand-100 transition"
        >
          <i className="fas fa-bars" />
        </button>

        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-sand-900 leading-tight truncate">
            {active.title}
          </h1>
          <p className="hidden sm:block text-xs text-sand-500 leading-tight truncate">{active.subtitle}</p>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sand-50 border border-sand-200/70 text-xs font-medium text-sand-600">
            <i className="far fa-calendar text-brand-500" />
            {new Date().toLocaleDateString('en-GB', LONG_DATE)}
          </span>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-xl border border-sand-200/70 bg-white hover:bg-sand-50 transition"
            >
              <span className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white text-xs font-bold">
                {initials(user?.name)}
              </span>
              <span className="hidden sm:block text-left leading-tight">
                <span className="block text-sm font-semibold text-sand-800">{user?.name}</span>
                <span className="block text-[11px] text-sand-500">{user?.role}</span>
              </span>
              <i className={`fas fa-chevron-down text-[10px] text-sand-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-60 rounded-xl border border-sand-200 bg-white shadow-raised overflow-hidden animate-pop-in"
              >
                <div className="px-4 py-3 bg-sand-50 border-b border-sand-200/70">
                  <p className="text-sm font-semibold text-sand-900 truncate">{user?.name}</p>
                  <p className="text-xs text-sand-500 truncate">{user?.email || 'No email on file'}</p>
                  <p className="mt-1.5 flex flex-wrap gap-1">
                    <span className="fp-pill bg-brand-50 text-brand-700">{user?.role}</span>
                    {user?.department && (
                      <span className="fp-pill bg-sand-100 text-sand-600">{user.department}</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                >
                  <i className="fas fa-right-from-bracket w-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

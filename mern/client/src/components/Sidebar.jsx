import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { visibleModules } from '../utils/navigation';
import { initials } from '../utils/format';

/**
 * Fixed application rail — logo, module navigation, signed-in user.
 * Collapses to an icon rail on desktop and slides in as a drawer on mobile.
 */
export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile, onSignOut }) {
  const { user, modules } = useAuth();
  const items = visibleModules(modules);

  const link = ({ isActive }) =>
    `fp-nav-item ${isActive ? 'fp-nav-item-active' : ''} ${collapsed ? 'lg:justify-center lg:px-0' : ''}`;

  return (
    <>
      {/* Mobile scrim */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-brand-950/50 backdrop-blur-sm lg:hidden animate-fade-in"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-brand-950 shadow-sidebar
          transition-[width,transform] duration-300 ease-in-out
          ${collapsed ? 'lg:w-[76px]' : 'lg:w-64'}
          w-64 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className={`flex items-center gap-3 px-4 h-16 shrink-0 border-b border-white/[0.07] ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-white shrink-0 shadow-sm">
            <img src="/logo.png" alt="" className="w-8 h-auto object-contain" />
          </span>
          <span className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
            <span className="block font-display font-bold text-white text-[15px] leading-tight">
              Focus Prints
            </span>
            <span className="block text-[11px] text-brand-300 tracking-[0.14em] uppercase leading-tight">
              ERP Suite
            </span>
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation"
            className="ml-auto lg:hidden w-8 h-8 grid place-items-center rounded-lg text-brand-200 hover:bg-white/10"
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Modules */}
        <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-dark px-3 py-4">
          <p className={`px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-300/60 ${collapsed ? 'lg:hidden' : ''}`}>
            Workspace
          </p>
          <ul className="space-y-1">
            {items.map((m) => (
              <li key={m.key}>
                <NavLink to={m.path} className={link} onClick={onCloseMobile} title={collapsed ? m.label : undefined}>
                  <i className={`fas ${m.icon} fp-nav-icon`} />
                  <span className={collapsed ? 'lg:hidden' : ''}>{m.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User + sign out */}
        <div className="shrink-0 border-t border-white/[0.07] p-3">
          <div className={`flex items-center gap-3 rounded-xl px-2 py-2 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
            <span className="grid place-items-center w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white text-sm font-bold">
              {initials(user?.name)}
            </span>
            <span className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
              <span className="block text-sm font-semibold text-white truncate">{user?.name}</span>
              <span className="block text-[11px] text-brand-300 truncate">
                {user?.role}
                {user?.department ? ` · ${user.department}` : ''}
              </span>
            </span>
            <button
              type="button"
              onClick={onSignOut}
              title="Sign out"
              aria-label="Sign out"
              className={`w-8 h-8 grid place-items-center rounded-lg text-brand-200 hover:bg-white/10 hover:text-white transition ${collapsed ? 'lg:hidden' : ''}`}
            >
              <i className="fas fa-right-from-bracket text-sm" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex w-full items-center justify-center gap-2 mt-2 py-2 rounded-lg
                       text-[11px] font-semibold text-brand-300/70 hover:bg-white/[0.07] hover:text-white transition"
          >
            <i className={`fas ${collapsed ? 'fa-angles-right' : 'fa-angles-left'}`} />
            <span className={collapsed ? 'hidden' : ''}>Collapse</span>
          </button>
        </div>
      </aside>
    </>
  );
}

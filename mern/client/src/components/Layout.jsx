import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { confirmDialog } from '../utils/ui';

const COLLAPSE_KEY = 'fp_erp_sidebar_collapsed';

/** App shell: fixed sidebar rail + sticky topbar + scrolling content column. */
export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setMobileOpen(false), [pathname]);

  const handleSignOut = async () => {
    const ok = await confirmDialog({
      title: 'Sign out?',
      text: 'You will need to sign in again to continue.',
      icon: 'question',
      confirmButtonText: 'Sign out',
      confirmButtonColor: '#904a20',
    });
    if (!ok) return;
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-sand-50">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onSignOut={handleSignOut}
      />

      <div
        className={`flex flex-col min-h-screen transition-[padding] duration-300 ease-in-out
          ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-64'}`}
      >
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} onSignOut={handleSignOut} />
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

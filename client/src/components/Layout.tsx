import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FileSearch, LayoutDashboard, LogOut, UploadCloud } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/dashboard/upload', label: 'Upload', icon: UploadCloud },
  { to: '/dashboard/search', label: 'Search', icon: FileSearch }
];

export function Layout() {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const signOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-ink/10 bg-white px-4 py-5 lg:block">
        <Link to="/dashboard" aria-label="PenBot AI dashboard">
          <BrandLogo />
        </Link>
        <nav className="mt-10 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition ${
                    isActive ? 'bg-brand text-white shadow-sm' : 'text-ink/75 hover:bg-mist hover:text-ink'
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-ink/10 bg-paper/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <Link to="/dashboard" className="lg:hidden" aria-label="PenBot AI dashboard">
              <BrandLogo compact />
            </Link>
            <div className="hidden lg:block">
              <p className="text-sm font-semibold text-ink/60">Workspace</p>
              <p className="text-xl font-bold text-ink">Handwritten Notes</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-ink">{user?.name || 'Student'}</p>
                <p className="text-xs text-ink/55">PenBot workspace</p>
              </div>
              <button onClick={signOut} className="icon-button" title="Logout" aria-label="Logout">
                <LogOut size={18} />
              </button>
            </div>
          </div>
          <nav className="grid grid-cols-3 border-t border-ink/10 bg-white lg:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard'}
                  className={({ isActive }) =>
                    `flex min-h-12 items-center justify-center gap-1.5 px-2 py-3 text-xs font-semibold sm:gap-2 sm:text-sm ${
                      isActive ? 'text-brand' : 'text-ink/60'
                    }`
                  }
                >
                  <Icon size={17} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function Layout() {
  const logout = useAuthStore((s) => s.logout);
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100">
      <nav className="glass m-4 p-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-bold text-lg">PenBot AI</h1>
        <div className="space-x-4 text-sm md:text-base">
          <Link to="/dashboard">My Notes</Link>
          <Link to="/dashboard/upload">Upload</Link>
          <Link to="/dashboard/search">Search</Link>
          <button
            className="underline"
            onClick={() => {
              logout();
              nav('/login');
            }}
          >
            Logout
          </button>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl p-4"><Outlet /></main>
    </div>
  );
}

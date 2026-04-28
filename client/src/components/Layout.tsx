import { Link, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-indigo-950 text-slate-100">
      <nav className="glass m-4 p-4 flex justify-between">
        <h1 className="font-bold">PenBot AI</h1>
        <div className="space-x-4">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/dashboard/upload">Upload</Link>
          <Link to="/dashboard/search">Search</Link>
        </div>
      </nav>
      <main className="p-4"><Outlet /></main>
    </div>
  );
}

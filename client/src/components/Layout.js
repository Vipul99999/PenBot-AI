import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FileSearch, LayoutDashboard, LogOut, Settings, ShieldCheck, UploadCloud } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth';
export function Layout() {
    const logout = useAuthStore((s) => s.logout);
    const user = useAuthStore((s) => s.user);
    const navigate = useNavigate();
    const signOut = async () => {
        await authApi.logout().catch(() => undefined);
        logout();
        navigate('/login');
    };
    const navItems = [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/dashboard/upload', label: 'Upload', icon: UploadCloud },
        { to: '/dashboard/search', label: 'Search', icon: FileSearch },
        { to: '/dashboard/settings', label: 'Settings', icon: Settings },
        ...(user?.role === 'admin' ? [{ to: '/dashboard/admin', label: 'Admin', icon: ShieldCheck }] : [])
    ];
    return (_jsxs("div", { className: "min-h-screen bg-paper", children: [_jsxs("aside", { className: "fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-ink/10 bg-white px-4 py-5 lg:block", children: [_jsx(Link, { to: "/dashboard", "aria-label": "PenBot AI dashboard", children: _jsx(BrandLogo, {}) }), _jsx("nav", { className: "mt-10 space-y-1", children: navItems.map((item) => {
                            const Icon = item.icon;
                            return (_jsxs(NavLink, { to: item.to, end: item.to === '/dashboard', className: ({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-brand text-white shadow-sm' : 'text-ink hover:bg-mist hover:text-ink'}`, children: [_jsx(Icon, { size: 18 }), item.label] }, item.to));
                        }) })] }), _jsxs("div", { className: "lg:pl-64", children: [_jsxs("header", { className: "sticky top-0 z-10 border-b border-ink/10 bg-paper/95 backdrop-blur", children: [_jsxs("div", { className: "mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3", children: [_jsx(Link, { to: "/dashboard", className: "lg:hidden", "aria-label": "PenBot AI dashboard", children: _jsx(BrandLogo, { compact: true }) }), _jsxs("div", { className: "hidden lg:block", children: [_jsx("p", { className: "text-sm font-black uppercase text-brand", children: "Workspace" }), _jsx("p", { className: "text-xl font-black text-ink", children: "Handwritten Notes" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "hidden text-right sm:block", children: [_jsx("p", { className: "text-sm font-black text-ink", children: user?.name || 'Student' }), _jsx("p", { className: "text-xs font-bold text-ink", children: "PenBot workspace" })] }), _jsx("button", { onClick: signOut, className: "icon-button", title: "Logout", "aria-label": "Logout", children: _jsx(LogOut, { size: 18 }) })] })] }), _jsx("nav", { className: "grid grid-cols-3 border-t border-ink/10 bg-white lg:hidden", children: navItems.map((item) => {
                                    const Icon = item.icon;
                                    return (_jsxs(NavLink, { to: item.to, end: item.to === '/dashboard', className: ({ isActive }) => `flex min-h-12 items-center justify-center gap-1.5 px-2 py-3 text-xs font-semibold sm:gap-2 sm:text-sm ${isActive ? 'text-brand' : 'text-ink'}`, children: [_jsx(Icon, { size: 17 }), item.label] }, item.to));
                                }) })] }), _jsx("main", { className: "mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8", children: _jsx(Outlet, {}) })] })] }));
}

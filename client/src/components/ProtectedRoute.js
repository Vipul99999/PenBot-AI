import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
export function ProtectedRoute({ children }) {
    const token = useAuthStore((s) => s.token);
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);
    const me = useQuery({
        queryKey: ['auth-me'],
        queryFn: () => authApi.me().then((r) => r.data),
        enabled: !token && !user,
        retry: false
    });
    useEffect(() => {
        if (me.data && !user)
            setUser({ id: me.data._id || me.data.id, name: me.data.name, email: me.data.email, role: me.data.role, settings: me.data.settings });
    }, [me.data, setUser, user]);
    if (token || user || me.data)
        return children;
    if (me.isLoading || me.isFetching)
        return _jsx("div", { className: "surface p-6 font-semibold text-ink", children: "Opening workspace..." });
    return _jsx(Navigate, { to: "/login", replace: true });
}

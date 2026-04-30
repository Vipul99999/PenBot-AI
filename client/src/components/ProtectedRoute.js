import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
export function ProtectedRoute({ children }) {
    const token = useAuthStore((s) => s.token);
    return token ? children : _jsx(Navigate, { to: "/login", replace: true });
}

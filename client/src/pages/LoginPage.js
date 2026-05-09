import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { authApi } from '@/api/auth';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuthStore } from '@/store/authStore';
export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const setAuth = useAuthStore((s) => s.setAuth);
    const nav = useNavigate();
    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data } = await authApi.login({ email: email.trim().toLowerCase(), password });
            setAuth(data.token, data.user);
            nav('/dashboard');
        }
        catch (err) {
            setError(err.response?.data?.message || 'Login failed. Check your credentials.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("main", { className: "grid min-h-screen bg-paper lg:grid-cols-[0.9fr_1.1fr]", children: [_jsxs("section", { className: "flex flex-col gap-6 bg-white p-4 sm:p-6 lg:bg-mist lg:p-10", children: [_jsx(Link, { to: "/", children: _jsx(BrandLogo, {}) }), _jsxs("div", { className: "rounded-lg border border-brand/15 bg-mist p-4 lg:hidden", children: [_jsx("h1", { className: "text-xl font-black text-ink", children: "Your handwritten notebook, ready to use." }), _jsx("p", { className: "mt-2 text-sm font-medium leading-6 text-ink/75", children: "Review OCR, edit notes, search, and export study material." })] }), _jsxs("div", { className: "surface hidden max-w-md space-y-5 border-brand/20 p-6 lg:block", children: [_jsx("h1", { className: "text-4xl font-black leading-tight text-ink", children: "Your handwritten notebook, ready to use." }), _jsx("p", { className: "text-lg font-medium leading-8 text-ink", children: "Open your workspace to review OCR, edit notes, search, and export study material." }), _jsxs("div", { className: "surface p-5", children: [_jsx("p", { className: "text-sm font-bold uppercase text-brand", children: "Today's workflow" }), _jsxs("div", { className: "mt-4 space-y-3 text-sm font-semibold text-ink/80", children: [_jsx("p", { children: "1. Upload handwritten notes" }), _jsx("p", { children: "2. Review OCR confidence" }), _jsx("p", { children: "3. Export clean study files" })] })] })] })] }), _jsx("section", { className: "flex items-center justify-center bg-white px-4 pb-10 pt-3 sm:py-10", children: _jsxs("form", { onSubmit: submit, className: "w-full max-w-md space-y-5 rounded-lg border border-ink/10 bg-white p-5 shadow-sm sm:p-6 lg:border-0 lg:shadow-none", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-3xl font-black text-ink", children: "Welcome back" }), _jsx("p", { className: "mt-2 font-medium text-ink/75", children: "Sign in to continue." })] }), error && _jsx("div", { className: "rounded-md border border-coral/30 bg-coral/10 p-3 text-sm font-medium text-coral", children: error }), _jsx("input", { className: "field", type: "email", placeholder: "Email", value: email, onChange: (e) => setEmail(e.target.value), autoComplete: "email", required: true }), _jsx("input", { className: "field", type: "password", placeholder: "Password", value: password, onChange: (e) => setPassword(e.target.value), autoComplete: "current-password", required: true }), _jsxs("button", { disabled: loading, className: "primary-button w-full", children: [loading ? 'Logging in...' : 'Login', !loading && _jsx(ArrowRight, { size: 18 })] }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 text-sm font-medium text-ink/75", children: [_jsxs("span", { children: ["New here? ", _jsx(Link, { className: "font-bold text-brand", to: "/register", children: "Create account" })] }), _jsx(Link, { className: "font-bold text-brand", to: "/forgot-password", children: "Forgot password?" })] })] }) })] }));
}

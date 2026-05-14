import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Trash2 } from 'lucide-react';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/authStore';
export function SettingsPage() {
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);
    const logout = useAuthStore((s) => s.logout);
    const navigate = useNavigate();
    const [message, setMessage] = useState('');
    const [settings, setSettings] = useState({
        defaultExportFormat: 'pdf',
        ocrMode: 'balanced',
        documentTemplate: 'study_notes',
        maxPdfPages: 25
    });
    useEffect(() => {
        if (user?.settings)
            setSettings(user.settings);
    }, [user?.settings]);
    async function save(event) {
        event.preventDefault();
        const { data } = await authApi.updateSettings({ ...settings, maxPdfPages: Number(settings.maxPdfPages) });
        setUser(data);
        setMessage('Settings saved.');
    }
    async function deleteData() {
        if (!window.confirm('Delete all notes and uploaded originals?'))
            return;
        const { data } = await authApi.deleteData();
        setMessage(`Deleted ${data.deletedNotes} notes.`);
    }
    async function deleteAccount() {
        if (!window.confirm('Delete your account and all data permanently?'))
            return;
        await authApi.deleteAccount();
        logout();
        navigate('/');
    }
    return (_jsxs("div", { className: "mx-auto max-w-3xl space-y-6", children: [_jsxs("div", { className: "surface p-5", children: [_jsx("p", { className: "text-sm font-black uppercase text-brand", children: "Preferences" }), _jsx("h2", { className: "mt-1 text-3xl font-black text-ink", children: "Settings" }), _jsx("p", { className: "mt-2 text-sm font-semibold leading-6 text-ink/75", children: "Set defaults for OCR speed, document style, exports, and storage controls." })] }), _jsxs("form", { onSubmit: save, className: "surface grid gap-4 p-5 sm:grid-cols-2", children: [_jsxs("label", { children: [_jsx("span", { className: "text-xs font-black uppercase text-brand", children: "Default export" }), _jsxs("select", { className: "field mt-2", value: settings.defaultExportFormat, onChange: (e) => setSettings((s) => ({ ...s, defaultExportFormat: e.target.value })), children: [_jsx("option", { value: "pdf", children: "PDF" }), _jsx("option", { value: "docx", children: "DOCX" }), _jsx("option", { value: "markdown", children: "Markdown" }), _jsx("option", { value: "txt", children: "TXT" })] })] }), _jsxs("label", { children: [_jsx("span", { className: "text-xs font-black uppercase text-brand", children: "OCR mode" }), _jsxs("select", { className: "field mt-2", value: settings.ocrMode, onChange: (e) => setSettings((s) => ({ ...s, ocrMode: e.target.value })), children: [_jsx("option", { value: "fast", children: "Fast" }), _jsx("option", { value: "balanced", children: "Balanced" }), _jsx("option", { value: "high_accuracy", children: "High accuracy" })] })] }), _jsxs("label", { children: [_jsx("span", { className: "text-xs font-black uppercase text-brand", children: "Document style" }), _jsxs("select", { className: "field mt-2", value: settings.documentTemplate, onChange: (e) => setSettings((s) => ({ ...s, documentTemplate: e.target.value })), children: [_jsx("option", { value: "study_notes", children: "Study notes" }), _jsx("option", { value: "lab_report", children: "Lab report" }), _jsx("option", { value: "exam_revision", children: "Exam revision" }), _jsx("option", { value: "formula_sheet", children: "Formula sheet" }), _jsx("option", { value: "qa_worksheet", children: "Q&A worksheet" })] })] }), _jsxs("label", { children: [_jsx("span", { className: "text-xs font-black uppercase text-brand", children: "Max PDF pages" }), _jsx("input", { className: "field mt-2", type: "number", min: "1", max: "100", value: settings.maxPdfPages, onChange: (e) => setSettings((s) => ({ ...s, maxPdfPages: Number(e.target.value) })) })] }), _jsxs("button", { className: "primary-button sm:col-span-2", children: [_jsx(Save, { size: 18 }), "Save settings"] }), message && _jsx("p", { className: "text-sm font-bold text-emerald-700 sm:col-span-2", children: message })] }), _jsxs("div", { className: "surface border-coral/30 p-5", children: [_jsx("h3", { className: "font-black text-coral", children: "Danger zone" }), _jsxs("div", { className: "mt-4 grid gap-2 sm:grid-cols-2", children: [_jsxs("button", { className: "secondary-button text-coral", onClick: deleteData, children: [_jsx(Trash2, { size: 18 }), "Delete notes"] }), _jsxs("button", { className: "secondary-button text-coral", onClick: deleteAccount, children: [_jsx(Trash2, { size: 18 }), "Delete account"] })] })] })] }));
}

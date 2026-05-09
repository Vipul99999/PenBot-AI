import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock3, Cpu, Database, FileText, HardDrive, Loader2, Plus, Search, Server, UploadCloud } from 'lucide-react';
import { notesApi } from '@/api/notes';
import { systemApi } from '@/api/system';
const statusMeta = {
    queued: { label: 'Queued', className: 'bg-amber-200 text-amber-950', icon: Clock3 },
    processing: { label: 'Processing', className: 'bg-sky-200 text-sky-950', icon: Loader2 },
    done: { label: 'Ready', className: 'bg-emerald-200 text-emerald-950', icon: CheckCircle2 },
    failed: { label: 'Failed', className: 'bg-red-200 text-red-950', icon: AlertCircle }
};
function stripHtml(value = '') {
    return value.replace(/<[^>]*>/g, '').trim();
}
function notePreview(note) {
    if (note.status === 'failed')
        return note.ocrError || 'OCR failed. Open this note to retry conversion.';
    return stripHtml(note.extractedText).slice(0, 170) || note.originalFile;
}
function noteTitle(note) {
    return note.title || note.structuredBlocks?.find((block) => block.type === 'title')?.content || 'Untitled note';
}
export function DashboardPage() {
    const { data = [], isLoading, isError } = useQuery({
        queryKey: ['notes'],
        queryFn: () => notesApi.list().then((r) => r.data),
        refetchInterval: (query) => query.state.data?.some((note) => ['queued', 'processing'].includes(note.status)) ? 3000 : false
    });
    const readiness = useQuery({
        queryKey: ['system-readiness'],
        queryFn: () => systemApi.readiness().then((r) => r.data),
        refetchInterval: 15000
    });
    const ready = data.filter((note) => note.status === 'done').length;
    const processing = data.filter((note) => ['queued', 'processing'].includes(note.status)).length;
    const health = readiness.data;
    const healthCards = [
        { label: 'Server', ok: health?.server?.ok, detail: 'API online', icon: Server },
        { label: 'MongoDB', ok: health?.database?.ok, detail: health?.database?.storage || 'GridFS storage', icon: Database },
        { label: 'AI OCR', ok: health?.ai?.ok, detail: health?.ai?.ocr?.trocrEnabled ? 'TrOCR/ViT enabled' : 'Local OCR ready', icon: Cpu },
        { label: 'Uploads', ok: health?.database?.ok, detail: 'Persistent originals', icon: HardDrive }
    ];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "surface flex flex-wrap items-end justify-between gap-4 p-5", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-black uppercase text-brand", children: "Overview" }), _jsx("h2", { className: "mt-1 text-3xl font-black text-ink", children: "My Notes" }), _jsx("p", { className: "mt-2 max-w-2xl text-sm font-semibold leading-6 text-ink/80", children: "Track OCR progress, open converted notes, search your notebook, and export clean study files." })] }), _jsxs("div", { className: "grid w-full grid-cols-2 gap-2 sm:w-auto", children: [_jsxs(Link, { to: "/dashboard/search", className: "secondary-button", children: [_jsx(Search, { size: 18 }), "Search"] }), _jsxs(Link, { to: "/dashboard/upload", className: "primary-button", children: [_jsx(Plus, { size: 18 }), "Upload"] })] })] }), _jsx("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-3", children: [
                    ['Total notes', data.length, FileText],
                    ['Ready to edit', ready, CheckCircle2],
                    ['In OCR', processing, Loader2]
                ].map(([label, value, Icon]) => {
                    const TypedIcon = Icon;
                    return (_jsxs("div", { className: "surface p-5 ring-1 ring-white", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-sm font-bold text-ink", children: String(label) }), _jsx(TypedIcon, { className: "text-brand", size: 20 })] }), _jsx("p", { className: "mt-4 text-3xl font-black text-ink", children: String(value) })] }, String(label)));
                }) }), _jsxs("div", { className: "surface p-5", children: [_jsxs("div", { className: "flex flex-wrap items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-black uppercase text-brand", children: "System readiness" }), _jsx("h3", { className: "mt-1 text-xl font-black text-ink", children: "Real-world conversion stack" }), _jsx("p", { className: "mt-1 text-sm font-semibold leading-6 text-ink/75", children: health?.costMode || 'Checking local OCR, MongoDB storage, and backend health.' })] }), _jsx("span", { className: health?.ok ? 'badge bg-emerald-100 text-emerald-800' : 'badge bg-amber-100 text-amber-800', children: readiness.isLoading ? 'Checking' : health?.ok ? 'Ready' : 'Needs attention' })] }), _jsx("div", { className: "mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4", children: healthCards.map((item) => {
                            const Icon = item.icon;
                            const ok = readiness.isLoading ? undefined : Boolean(item.ok);
                            return (_jsxs("div", { className: "rounded-lg border border-ink/10 bg-white p-4", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx(Icon, { className: "text-brand", size: 20 }), _jsx("span", { className: ok ? 'badge bg-emerald-100 text-emerald-800' : 'badge bg-amber-100 text-amber-800', children: readiness.isLoading ? '...' : ok ? 'OK' : 'Check' })] }), _jsx("p", { className: "mt-3 font-black text-ink", children: item.label }), _jsx("p", { className: "mt-1 line-clamp-2 text-sm font-semibold leading-6 text-ink/75", children: item.detail })] }, item.label));
                        }) })] }), isLoading && _jsx("div", { className: "surface p-6", children: "Loading notes..." }), isError && _jsx("div", { className: "surface border-coral/30 bg-coral/10 p-6 font-medium text-coral", children: "Could not load notes. Check the backend connection." }), !isLoading && !isError && data.length === 0 && (_jsxs("div", { className: "surface grid gap-6 p-8 ring-1 ring-white md:grid-cols-[1fr_auto] md:items-center", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-xl font-black text-ink", children: "Start with your first handwritten page" }), _jsx("p", { className: "mt-2 max-w-xl font-medium text-ink/80", children: "Upload a PDF or image and PenBot will create an editable note with OCR blocks." })] }), _jsxs(Link, { to: "/dashboard/upload", className: "primary-button", children: [_jsx(UploadCloud, { size: 18 }), "Upload note"] })] })), _jsx("div", { className: "grid gap-4 md:grid-cols-2 2xl:grid-cols-3", children: data.map((note) => {
                    const status = statusMeta[note.status] || statusMeta.queued;
                    const StatusIcon = status.icon;
                    return (_jsxs(Link, { to: `/dashboard/editor/${note._id}`, className: "surface block p-5 ring-1 ring-white transition hover:-translate-y-0.5 hover:shadow-lg", children: [_jsxs("div", { className: "mb-4 flex items-center justify-between gap-3", children: [_jsxs("span", { className: `badge ${status.className}`, children: [_jsx(StatusIcon, { size: 14, className: note.status === 'processing' ? 'animate-spin' : '' }), status.label] }), _jsx("span", { className: "text-xs font-bold text-ink/70", children: new Date(note.createdAt).toLocaleDateString() })] }), _jsx("h3", { className: "mb-2 line-clamp-2 text-lg font-black leading-6 text-ink", children: noteTitle(note) }), _jsx("p", { className: "min-h-16 text-sm font-medium leading-6 text-ink", children: notePreview(note) }), _jsx("div", { className: "mt-4 flex flex-wrap gap-2", children: (note.tags?.length ? note.tags : ['UNTAGGED']).slice(0, 3).map((tag) => (_jsx("span", { className: "badge bg-mist text-ink", children: tag }, tag))) })] }, note._id));
                }) })] }));
}

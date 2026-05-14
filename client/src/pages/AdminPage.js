import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Clock3, Database, RefreshCw } from 'lucide-react';
import { adminApi } from '@/api/admin';
function formatBytes(value = 0) {
    if (value < 1024)
        return `${value} B`;
    if (value < 1024 * 1024)
        return `${Math.round(value / 1024)} KB`;
    return `${Math.round((value / 1024 / 1024) * 10) / 10} MB`;
}
export function AdminPage() {
    const stats = useQuery({ queryKey: ['admin-ocr-stats'], queryFn: () => adminApi.ocrStats().then((r) => r.data), refetchInterval: 10000 });
    const jobs = useQuery({ queryKey: ['admin-ocr-jobs'], queryFn: () => adminApi.ocrJobs().then((r) => r.data), refetchInterval: 10000 });
    const cleanup = useMutation({
        mutationFn: () => adminApi.cleanupFailed(30),
        onSuccess: () => {
            stats.refetch();
            jobs.refetch();
        }
    });
    const totals = stats.data?.totals || {};
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "surface flex flex-wrap items-center justify-between gap-3 p-5", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-black uppercase text-brand", children: "Admin" }), _jsx("h2", { className: "mt-1 text-3xl font-black text-ink", children: "OCR operations" }), _jsx("p", { className: "mt-2 text-sm font-semibold text-ink/75", children: "Monitor conversion health, cost, retries, and failed jobs." })] }), _jsxs("button", { onClick: () => { stats.refetch(); jobs.refetch(); }, className: "secondary-button", children: [_jsx(RefreshCw, { size: 18 }), "Refresh"] }), _jsx("button", { onClick: () => cleanup.mutate(), disabled: cleanup.isPending, className: "secondary-button text-coral", children: cleanup.isPending ? 'Cleaning...' : 'Clean failed 30d' })] }), _jsx("div", { className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4", children: [
                    ['Queued', stats.data?.byStatus?.queued || 0, Clock3],
                    ['Processing', stats.data?.byStatus?.processing || 0, RefreshCw],
                    ['Failed', stats.data?.byStatus?.failed || 0, AlertTriangle],
                    ['Storage', formatBytes(totals.totalStorage || 0), Database]
                ].map(([label, value, Icon]) => {
                    const TypedIcon = Icon;
                    return (_jsxs("div", { className: "surface p-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-sm font-bold text-ink", children: String(label) }), _jsx(TypedIcon, { className: "text-brand", size: 20 })] }), _jsx("p", { className: "mt-4 text-3xl font-black text-ink", children: String(value) })] }, String(label)));
                }) }), _jsxs("div", { className: "surface overflow-hidden", children: [_jsx("div", { className: "border-b border-ink/10 p-4", children: _jsx("h3", { className: "font-black text-ink", children: "Recent OCR jobs" }) }), _jsx("div", { className: "overflow-auto", children: _jsxs("table", { className: "w-full min-w-[900px] text-left text-sm", children: [_jsx("thead", { className: "bg-mist text-xs uppercase text-ink/70", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3", children: "Note" }), _jsx("th", { className: "px-4 py-3", children: "Status" }), _jsx("th", { className: "px-4 py-3", children: "Engine" }), _jsx("th", { className: "px-4 py-3", children: "Confidence" }), _jsx("th", { className: "px-4 py-3", children: "Duration" }), _jsx("th", { className: "px-4 py-3", children: "Size" }), _jsx("th", { className: "px-4 py-3", children: "Scan" }), _jsx("th", { className: "px-4 py-3", children: "Retries" }), _jsx("th", { className: "px-4 py-3", children: "Error" })] }) }), _jsx("tbody", { children: (jobs.data || []).map((job) => (_jsxs("tr", { className: "border-t border-ink/10", children: [_jsx("td", { className: "max-w-xs px-4 py-3 font-bold text-ink", children: job.title || job.originalFilename }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: "badge bg-mist text-ink", children: job.status }) }), _jsx("td", { className: "px-4 py-3", children: job.ocrEngine || '-' }), _jsx("td", { className: "px-4 py-3", children: job.ocrConfidence ? `${Math.round(job.ocrConfidence * 100)}%` : '-' }), _jsx("td", { className: "px-4 py-3", children: job.ocrDurationMs ? `${Math.round(job.ocrDurationMs / 1000)}s` : '-' }), _jsx("td", { className: "px-4 py-3", children: formatBytes(job.originalSize || 0) }), _jsx("td", { className: "px-4 py-3", children: typeof job.scanQualityScore === 'number' ? `${job.scanQualityScore}/100` : '-' }), _jsx("td", { className: "px-4 py-3", children: job.retryCount || 0 }), _jsx("td", { className: "max-w-sm px-4 py-3 text-coral", children: job.ocrError || '-' })] }, job._id))) })] }) })] })] }));
}

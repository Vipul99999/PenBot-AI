import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileSearch, Search } from 'lucide-react';
import { notesApi } from '@/api/notes';
function stripHtml(value = '') {
    return value.replace(/<[^>]*>/g, '').trim();
}
export function SearchPage() {
    const [q, setQ] = useState('');
    const [submitted, setSubmitted] = useState('');
    const { data = [], isFetching, isError } = useQuery({
        queryKey: ['search', submitted],
        queryFn: () => notesApi.search(submitted).then((r) => r.data),
        enabled: submitted.length > 0
    });
    const submit = (event) => {
        event.preventDefault();
        setSubmitted(q.trim());
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-bold uppercase text-brand", children: "Find" }), _jsx("h2", { className: "mt-1 text-3xl font-black", children: "Search notes" })] }), _jsxs("form", { onSubmit: submit, className: "surface flex flex-col gap-3 p-3 md:flex-row", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40", size: 18 }), _jsx("input", { className: "field pl-10", value: q, onChange: (e) => setQ(e.target.value), placeholder: "Search topics, formulas, tags..." })] }), _jsxs("button", { className: "primary-button", disabled: !q.trim() || isFetching, children: [_jsx(FileSearch, { size: 18 }), isFetching ? 'Searching...' : 'Search'] })] }), isError && _jsx("div", { className: "surface border-coral/30 bg-coral/10 p-4 font-medium text-coral", children: "Search failed. Try another keyword." }), submitted && !isFetching && data.length === 0 && _jsx("div", { className: "surface p-6 text-ink/60", children: "No matching notes found." }), _jsx("div", { className: "grid gap-3", children: data.map((note) => (_jsxs(Link, { to: `/dashboard/editor/${note._id}`, className: "surface block p-5 transition hover:shadow-md", children: [_jsx("p", { className: "text-sm leading-6 text-ink/75", children: stripHtml(note.extractedText).slice(0, 240) || note.originalFile }), !!note.tags?.length && (_jsx("div", { className: "mt-3 flex flex-wrap gap-2", children: note.tags.map((tag) => _jsx("span", { className: "badge bg-mist text-brand", children: tag }, tag)) }))] }, note._id))) })] }));
}

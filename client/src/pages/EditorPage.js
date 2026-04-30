import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, BookOpen, Brain, Download, FileDown, RefreshCw, Save, Sparkles } from 'lucide-react';
import { NoteEditor } from '@/editor/NoteEditor';
import { notesApi } from '@/api/notes';
import { http } from '@/api/http';
async function downloadAuthenticated(url, filename) {
    const { data } = await http.get(url.replace(http.defaults.baseURL || '', ''), { responseType: 'blob' });
    const href = URL.createObjectURL(data);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(href);
}
export function EditorPage() {
    const { id = '' } = useParams();
    const queryClient = useQueryClient();
    const [html, setHtml] = useState('');
    const [wrong, setWrong] = useState('');
    const [corrected, setCorrected] = useState('');
    const [message, setMessage] = useState('');
    const noteQuery = useQuery({
        queryKey: ['note', id],
        queryFn: () => notesApi.get(id).then((r) => r.data),
        enabled: Boolean(id),
        refetchInterval: (query) => ['queued', 'processing'].includes(query.state.data?.status) ? 3000 : false
    });
    const data = noteQuery.data;
    const isBusy = ['queued', 'processing'].includes(data?.status);
    const save = useMutation({
        mutationFn: () => notesApi.update(id, { extractedText: html }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['note', id] });
            queryClient.invalidateQueries({ queryKey: ['notes'] });
            setMessage('Saved');
        }
    });
    const summarize = useMutation({ mutationFn: () => notesApi.summary(id) });
    const flashcards = useMutation({ mutationFn: () => notesApi.flashcards(id) });
    const correction = useMutation({
        mutationFn: () => notesApi.correction(id, { wrong, corrected }),
        onSuccess: () => {
            setWrong('');
            setCorrected('');
        }
    });
    if (noteQuery.isLoading)
        return _jsx("div", { className: "surface p-6", children: "Loading note..." });
    if (noteQuery.isError || !data)
        return _jsx("div", { className: "surface border-coral/30 bg-coral/10 p-6 font-medium text-coral", children: "Note not found or backend unavailable." });
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsxs(Link, { to: "/dashboard", className: "inline-flex items-center gap-2 text-sm font-semibold text-brand", children: [_jsx(ArrowLeft, { size: 16 }), "Back"] }), _jsx("h2", { className: "mt-2 text-3xl font-black", children: "Note editor" }), _jsxs("p", { className: "mt-1 text-sm text-ink/60", children: ["Status: ", data.status, isBusy ? ' - OCR is still running.' : ''] })] }), _jsxs("button", { onClick: () => noteQuery.refetch(), className: "secondary-button", children: [_jsx(RefreshCw, { size: 18 }), "Refresh"] })] }), data.status === 'failed' && _jsx("div", { className: "surface border-coral/30 bg-coral/10 p-4 font-medium text-coral", children: "OCR failed. Upload a clearer file or check the AI service logs." }), _jsxs("div", { className: "grid gap-5 xl:grid-cols-[360px_1fr]", children: [_jsxs("aside", { className: "space-y-4", children: [_jsxs("div", { className: "surface p-5", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(BookOpen, { className: "text-brand", size: 20 }), _jsx("h3", { className: "font-black", children: "OCR blocks" })] }), _jsxs("div", { className: "mt-4 max-h-[620px] space-y-3 overflow-auto pr-1", children: [(data.structuredBlocks || []).length === 0 && _jsx("p", { className: "text-sm text-ink/55", children: "Blocks will appear after OCR completes." }), (data.structuredBlocks || []).map((block, index) => (_jsxs("div", { className: "rounded-md border border-ink/10 bg-paper/70 p-3", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-2 text-xs", children: [_jsx("span", { className: "font-bold uppercase text-brand", children: block.type }), _jsxs("span", { className: block.confidence < 0.8 ? 'font-bold text-amber-700' : 'font-bold text-emerald-700', children: [Math.round((block.confidence || 0) * 100), "%"] })] }), _jsx("p", { className: "text-sm leading-6 text-ink/75", children: block.content })] }, `${block.content}-${index}`)))] })] }), _jsxs("div", { className: "surface p-5", children: [_jsx("h4", { className: "font-black", children: "Correction feedback" }), _jsxs("div", { className: "mt-3 space-y-2", children: [_jsx("input", { className: "field", placeholder: "Wrong word", value: wrong, onChange: (e) => setWrong(e.target.value) }), _jsx("input", { className: "field", placeholder: "Correct word", value: corrected, onChange: (e) => setCorrected(e.target.value) }), _jsx("button", { onClick: () => correction.mutate(), disabled: !wrong || !corrected || correction.isPending, className: "primary-button w-full", children: "Learn" })] }), correction.isSuccess && _jsx("p", { className: "mt-3 text-sm font-medium text-emerald-700", children: "Correction saved." })] })] }), _jsxs("section", { className: "space-y-4", children: [_jsx(NoteEditor, { content: data.extractedText || '', onChange: setHtml }), _jsxs("div", { className: "surface grid grid-cols-2 gap-2 p-3 sm:flex sm:flex-wrap", children: [_jsxs("button", { onClick: () => save.mutate(), disabled: save.isPending || isBusy, className: "primary-button", children: [_jsx(Save, { size: 18 }), save.isPending ? 'Saving...' : 'Save'] }), _jsxs("button", { onClick: () => summarize.mutate(), disabled: summarize.isPending || isBusy, className: "secondary-button", children: [_jsx(Sparkles, { size: 18 }), "Summary"] }), _jsxs("button", { onClick: () => flashcards.mutate(), disabled: flashcards.isPending || isBusy, className: "secondary-button", children: [_jsx(Brain, { size: 18 }), "Flashcards"] }), _jsxs("button", { onClick: () => downloadAuthenticated(notesApi.exportPdf(id), `note-${id}.pdf`), disabled: isBusy, className: "secondary-button", children: [_jsx(FileDown, { size: 18 }), "PDF"] }), _jsxs("button", { onClick: () => downloadAuthenticated(notesApi.exportDocx(id), `note-${id}.docx`), disabled: isBusy, className: "secondary-button", children: [_jsx(Download, { size: 18 }), "DOCX"] }), _jsx("button", { onClick: () => downloadAuthenticated(notesApi.exportMarkdown(id), `note-${id}.md`), disabled: isBusy, className: "secondary-button", children: "MD" }), _jsx("button", { onClick: () => downloadAuthenticated(notesApi.exportTxt(id), `note-${id}.txt`), disabled: isBusy, className: "secondary-button", children: "TXT" })] }), message && _jsx("p", { className: "text-sm font-semibold text-emerald-700", children: message }), _jsxs("div", { className: "grid gap-4 lg:grid-cols-2", children: [summarize.data && (_jsxs("div", { className: "surface p-5", children: [_jsx("h4", { className: "font-black", children: "Summary" }), _jsx("p", { className: "mt-2 text-sm leading-6 text-ink/70", children: summarize.data.data.summary }), _jsx("ul", { className: "mt-3 list-disc space-y-1 pl-5 text-sm text-ink/65", children: summarize.data.data.keyPoints.map((point) => _jsx("li", { children: point }, point)) })] })), flashcards.data && (_jsxs("div", { className: "surface p-5", children: [_jsx("h4", { className: "font-black", children: "Flashcards" }), _jsx("div", { className: "mt-3 grid gap-2", children: flashcards.data.data.flashcards.map((card) => (_jsxs("div", { className: "rounded-md border border-ink/10 bg-paper/70 p-3 text-sm", children: [_jsx("p", { className: "font-bold text-brand", children: card.q }), _jsx("p", { className: "mt-1 text-ink/65", children: card.a })] }, card.q))) })] }))] })] })] })] }));
}

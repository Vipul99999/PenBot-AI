import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Brain, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Download, FileDown, Filter, Image as ImageIcon, Plus, RefreshCw, RotateCcw, Save, Sparkles, Trash, Trash2 } from 'lucide-react';
import { notesApi } from '@/api/notes';
import { http } from '@/api/http';
const blockTypes = ['title', 'heading', 'subheading', 'paragraph', 'bullet', 'numbered', 'step', 'definition', 'theorem', 'important', 'example', 'objective', 'materials', 'observation', 'result', 'conclusion', 'exam_tip', 'question', 'answer', 'table', 'formula', 'code'];
function ReviewChecklist({ blocks, pages, activePage, dirty, isBusy, onGoPage, onReview }) {
    const emptyPages = pages.filter((page) => !blocks.some((block) => block.page === page && block.content.trim()));
    const lowConfidence = blocks.filter((block) => (block.confidence || 0) < 0.8);
    const currentPageBlocks = blocks.filter((block) => block.page === activePage);
    const missingTitle = !blocks.some((block) => block.type === 'title' && block.content.trim());
    const exportReady = !isBusy && !dirty && emptyPages.length === 0 && lowConfidence.length === 0 && !missingTitle;
    const items = [
        { label: 'OCR finished', ok: !isBusy, detail: isBusy ? 'Conversion is still running.' : 'All detected output is available.' },
        { label: 'Pages contain text', ok: emptyPages.length === 0, detail: emptyPages.length ? `Empty page: ${emptyPages.join(', ')}` : `${pages.length} page${pages.length === 1 ? '' : 's'} ready.` },
        { label: 'Low confidence reviewed', ok: lowConfidence.length === 0, detail: lowConfidence.length ? `${lowConfidence.length} block${lowConfidence.length === 1 ? '' : 's'} need review.` : 'No weak OCR blocks.' },
        { label: 'Title present', ok: !missingTitle, detail: missingTitle ? 'Add or mark a title block.' : 'Document title detected.' },
        { label: 'Saved before export', ok: !dirty, detail: dirty ? 'Autosave will run shortly.' : 'Latest edits are saved.' }
    ];
    return (_jsxs("div", { className: "surface p-5", children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-black uppercase text-brand", children: "Review checklist" }), _jsx("h3", { className: "mt-1 text-xl font-black text-ink", children: exportReady ? 'Ready to export' : 'Needs review' })] }), _jsx("span", { className: exportReady ? 'badge bg-emerald-100 text-emerald-800' : 'badge bg-amber-100 text-amber-800', children: exportReady ? 'Ready' : 'Review' })] }), _jsx("div", { className: "mt-4 space-y-2", children: items.map((item) => (_jsxs("div", { className: "rounded-lg border border-ink/10 bg-white p-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: `h-2.5 w-2.5 rounded-full ${item.ok ? 'bg-emerald-600' : 'bg-amber-500'}` }), _jsx("p", { className: "font-black text-ink", children: item.label })] }), _jsx("p", { className: "mt-1 text-sm font-semibold leading-6 text-ink/75", children: item.detail })] }, item.label))) }), _jsxs("div", { className: "mt-4 grid gap-2", children: [lowConfidence.length > 0 && (_jsx("button", { className: "secondary-button w-full", onClick: onReview, children: "Review weak blocks" })), emptyPages.map((page) => (_jsxs("button", { className: "secondary-button w-full", onClick: () => onGoPage(page), children: ["Open empty page ", page] }, page)))] }), _jsxs("p", { className: "mt-4 text-sm font-semibold leading-6 text-ink/75", children: ["Current page has ", currentPageBlocks.length, " block", currentPageBlocks.length === 1 ? '' : 's', "."] })] }));
}
async function downloadAuthenticated(url, filename) {
    const { data } = await http.get(url.replace(http.defaults.baseURL || '', ''), { responseType: 'blob' });
    const href = URL.createObjectURL(data);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(href);
}
function stripHtml(value = '') {
    return value.replace(/<[^>]*>/g, '').trim();
}
function isUnreadableFallback(note) {
    return stripHtml(note?.extractedText || '').toLowerCase().startsWith('no readable text was found');
}
function fallbackBlocksFromText(text = '') {
    return stripHtml(text)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((content, index) => ({
        localId: `fallback-${index}`,
        type: index === 0 ? 'title' : 'paragraph',
        content,
        confidence: 0.85,
        page: 1
    }));
}
function blocksFromNote(note) {
    const source = note?.structuredBlocks?.length ? note.structuredBlocks : fallbackBlocksFromText(note?.extractedText || '');
    return source.map((block, index) => ({
        localId: `${block.page || 1}-${index}-${block.type}-${String(block.content || '').slice(0, 16)}`,
        type: blockTypes.includes(block.type) ? block.type : 'paragraph',
        content: String(block.content || ''),
        confidence: typeof block.confidence === 'number' ? block.confidence : 0.9,
        page: Math.max(1, Number(block.page || 1))
    }));
}
function blocksToPlainText(blocks) {
    const pages = pagesFromBlocks(blocks);
    return pages
        .map((page) => `Page ${page}\n${blocks.filter((block) => block.page === page).map((block) => block.content).join('\n')}`)
        .join('\n\n');
}
function cleanBlocksForSave(blocks) {
    return blocks
        .filter((block) => block.content.trim())
        .map(({ type, content, confidence, page }) => ({ type, content: content.trim(), confidence, page }));
}
function pagesFromBlocks(blocks) {
    const pages = Array.from(new Set(blocks.map((block) => block.page || 1)));
    return pages.length ? pages.sort((a, b) => a - b) : [1];
}
function parseTable(content) {
    return content
        .split(/\r?\n/)
        .map((row) => row.trim())
        .filter(Boolean)
        .map((row) => {
        const delimiter = row.includes('|') || row.includes('\t') || /\s{2,}/.test(row) ? /\s*\|\s*|\t|\s{2,}/ : /\s+/;
        return row.split(delimiter).map((cell) => cell.trim()).filter(Boolean);
    })
        .filter((row) => row.length > 1);
}
function OriginalPreview({ blob, page, compact = false }) {
    const [url, setUrl] = useState('');
    useEffect(() => {
        if (!blob)
            return undefined;
        const nextUrl = URL.createObjectURL(blob);
        setUrl(nextUrl);
        return () => URL.revokeObjectURL(nextUrl);
    }, [blob]);
    const pdfUrl = url ? `${url}#page=${page}&view=FitH` : '';
    return (_jsxs("div", { className: "surface sticky top-4 overflow-hidden", children: [_jsxs("div", { className: "flex items-center gap-2 border-b border-ink/15 bg-mist px-4 py-3", children: [_jsx(ImageIcon, { className: "text-brand", size: 18 }), _jsxs("div", { children: [_jsx("p", { className: "font-black text-ink", children: "Original upload" }), _jsxs("p", { className: "text-xs font-bold uppercase text-ink/70", children: ["Synced to page ", page] })] })] }), _jsxs("div", { className: `${compact ? 'max-h-[520px]' : 'max-h-[760px]'} overflow-auto bg-ink/5 p-3`, children: [!url && _jsx("p", { className: "rounded-lg bg-white p-4 text-sm font-semibold text-ink", children: "Original preview is loading." }), url && blob?.type === 'application/pdf' && (_jsx("object", { data: pdfUrl, type: "application/pdf", className: `${compact ? 'h-[500px]' : 'h-[720px]'} w-full rounded-lg border border-ink/10 bg-white`, children: _jsx("a", { className: "font-bold text-brand", href: pdfUrl, target: "_blank", rel: "noreferrer", children: "Open original PDF" }) }, pdfUrl)), url && blob?.type !== 'application/pdf' && (_jsx("img", { src: url, alt: "Original uploaded note", className: "mx-auto max-h-[720px] rounded-lg border border-ink/10 bg-white object-contain shadow-sm" }))] })] }));
}
function PagePreview({ blocks, page, title }) {
    const pageBlocks = blocks.filter((block) => block.page === page);
    const hasTitle = pageBlocks.some((block) => block.type === 'title');
    let orderedIndex = 0;
    let stepIndex = 0;
    return (_jsxs("article", { className: "a4-page", children: [_jsxs("div", { className: "a4-header", children: [_jsxs("div", { children: [_jsx("p", { className: "text-[10px] font-black uppercase text-brand", children: "PenBot AI converted document" }), _jsx("p", { className: "mt-1 max-w-[28rem] truncate text-sm font-black text-ink", children: title || 'Untitled note' })] }), _jsxs("span", { className: "rounded-md border border-brand/20 bg-mist px-2 py-1 text-xs font-black text-brand", children: ["Page ", page] })] }), _jsxs("div", { className: "a4-body", children: [!hasTitle && page === 1 && _jsx("h1", { className: "doc-title", children: title || 'Untitled note' }), !pageBlocks.length && _jsx("p", { className: "doc-paragraph", children: "No converted blocks on this page yet." }), pageBlocks.map((block) => {
                        if (block.type === 'title')
                            return _jsx("h1", { className: "doc-title", children: block.content }, block.localId);
                        if (block.type === 'heading')
                            return _jsx("h2", { className: "doc-heading", children: block.content }, block.localId);
                        if (block.type === 'subheading')
                            return _jsx("h3", { className: "doc-subheading", children: block.content }, block.localId);
                        if (block.type === 'bullet')
                            return _jsxs("div", { className: "doc-bullet", children: [_jsx("span", {}), " ", _jsx("p", { children: block.content })] }, block.localId);
                        if (block.type === 'numbered')
                            return _jsxs("div", { className: "doc-numbered", children: [_jsx("span", { children: ++orderedIndex }), _jsx("p", { children: block.content })] }, block.localId);
                        if (block.type === 'step')
                            return _jsxs("div", { className: "doc-step", children: [_jsxs("span", { children: ["Step ", ++stepIndex] }), _jsx("p", { children: block.content })] }, block.localId);
                        if (block.type === 'definition')
                            return _jsxs("div", { className: "doc-callout", children: [_jsx("p", { children: "Definition" }), _jsx("div", { children: block.content })] }, block.localId);
                        if (block.type === 'theorem')
                            return _jsxs("div", { className: "doc-callout doc-theorem", children: [_jsx("p", { children: "Theorem / Rule" }), _jsx("div", { children: block.content })] }, block.localId);
                        if (block.type === 'important')
                            return _jsxs("div", { className: "doc-callout doc-important", children: [_jsx("p", { children: "Important" }), _jsx("div", { children: block.content })] }, block.localId);
                        if (block.type === 'example')
                            return _jsxs("div", { className: "doc-callout doc-example", children: [_jsx("p", { children: "Example" }), _jsx("div", { children: block.content })] }, block.localId);
                        if (block.type === 'objective')
                            return _jsxs("div", { className: "doc-callout doc-objective", children: [_jsx("p", { children: "Objective" }), _jsx("div", { children: block.content })] }, block.localId);
                        if (block.type === 'materials')
                            return _jsxs("div", { className: "doc-callout doc-materials", children: [_jsx("p", { children: "Materials / Apparatus" }), _jsx("div", { children: block.content })] }, block.localId);
                        if (block.type === 'observation')
                            return _jsxs("div", { className: "doc-callout doc-observation", children: [_jsx("p", { children: "Observation" }), _jsx("div", { children: block.content })] }, block.localId);
                        if (block.type === 'result')
                            return _jsxs("div", { className: "doc-callout doc-result", children: [_jsx("p", { children: "Result" }), _jsx("div", { children: block.content })] }, block.localId);
                        if (block.type === 'conclusion')
                            return _jsxs("div", { className: "doc-callout doc-conclusion", children: [_jsx("p", { children: "Conclusion" }), _jsx("div", { children: block.content })] }, block.localId);
                        if (block.type === 'exam_tip')
                            return _jsxs("div", { className: "doc-callout doc-exam-tip", children: [_jsx("p", { children: "Exam tip" }), _jsx("div", { children: block.content })] }, block.localId);
                        if (block.type === 'question' || block.type === 'answer')
                            return _jsxs("div", { className: block.type === 'question' ? 'doc-qa doc-question' : 'doc-qa doc-answer', children: [_jsx("span", { children: block.type === 'question' ? 'Q' : 'A' }), _jsx("p", { children: block.content })] }, block.localId);
                        if (block.type === 'table') {
                            const rows = parseTable(block.content);
                            return (_jsxs("div", { className: "doc-table-wrap", children: [_jsx("p", { children: "Table" }), _jsx("table", { className: "doc-table", children: _jsx("tbody", { children: rows.map((row, rowIndex) => (_jsx("tr", { children: row.map((cell, cellIndex) => rowIndex === 0 ? _jsx("th", { children: cell }, cellIndex) : _jsx("td", { children: cell }, cellIndex)) }, `${block.localId}-${rowIndex}`))) }) })] }, block.localId));
                        }
                        if (block.type === 'formula')
                            return _jsxs("div", { className: "doc-formula", children: [_jsx("p", { children: "Formula" }), _jsx("div", { children: block.content })] }, block.localId);
                        if (block.type === 'code')
                            return _jsx("pre", { className: "doc-code", children: block.content }, block.localId);
                        return _jsx("p", { className: "doc-paragraph", children: block.content }, block.localId);
                    })] }), _jsxs("div", { className: "a4-footer", children: [_jsx("span", { children: "Edited and exported with PenBot AI" }), _jsx("span", { children: new Date().toLocaleDateString() })] })] }));
}
function BlockEditor({ blocks, page, reviewOnly, onChange, onAdd, onDelete }) {
    const pageBlocks = blocks.filter((block) => block.page === page && (!reviewOnly || (block.confidence || 0) < 0.8));
    return (_jsxs("div", { className: "surface p-4", children: [_jsxs("div", { className: "mb-4 flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-black uppercase text-brand", children: "Editable blocks" }), _jsxs("h3", { className: "text-xl font-black text-ink", children: ["Page ", page] })] }), _jsxs("button", { className: "primary-button", onClick: () => onAdd(page), children: [_jsx(Plus, { size: 18 }), "Add block"] })] }), _jsxs("div", { className: "space-y-3", children: [!pageBlocks.length && _jsx("p", { className: "rounded-lg bg-mist p-4 text-sm font-bold text-ink", children: "No blocks match this view." }), pageBlocks.map((block) => {
                        const lowConfidence = (block.confidence || 0) < 0.8;
                        return (_jsxs("div", { className: `rounded-lg border bg-white p-3 shadow-sm ${lowConfidence ? 'border-amber-300 ring-2 ring-amber-100' : 'border-ink/15'}`, children: [_jsxs("div", { className: "mb-3 flex flex-wrap items-center gap-2", children: [_jsx("select", { className: "field min-w-0 flex-1 py-2 text-sm sm:max-w-44 sm:flex-none", value: block.type, onChange: (event) => onChange(block.localId, { type: event.target.value }), children: blockTypes.map((type) => _jsx("option", { value: type, children: type }, type)) }), _jsxs("span", { className: lowConfidence ? 'badge bg-amber-100 text-amber-800' : 'badge bg-emerald-100 text-emerald-800', children: [Math.round((block.confidence || 0) * 100), "%"] }), lowConfidence && _jsx("span", { className: "badge bg-amber-100 text-amber-800", children: "Needs review" }), _jsx("button", { className: "icon-button sm:ml-auto", onClick: () => onAdd(page, block.localId), title: "Add block after this one", children: _jsx(Plus, { size: 16 }) }), _jsx("button", { className: "icon-button text-coral", onClick: () => onDelete(block.localId), title: "Delete block", children: _jsx(Trash2, { size: 16 }) })] }), _jsx("textarea", { className: "field min-h-24 resize-y leading-7", value: block.content, onChange: (event) => onChange(block.localId, { content: event.target.value }) })] }, block.localId));
                    })] })] }));
}
export function EditorPage() {
    const { id = '' } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [blocks, setBlocks] = useState([]);
    const [title, setTitle] = useState('Untitled note');
    const [activePage, setActivePage] = useState(1);
    const [reviewOnly, setReviewOnly] = useState(false);
    const [mobilePanel, setMobilePanel] = useState('edit');
    const [dirty, setDirty] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const [wrong, setWrong] = useState('');
    const [corrected, setCorrected] = useState('');
    const [message, setMessage] = useState('');
    const [showEdit, setShowEdit] = useState(true);
    const noteQuery = useQuery({
        queryKey: ['note', id],
        queryFn: () => notesApi.get(id).then((r) => r.data),
        enabled: Boolean(id),
        refetchInterval: (query) => ['queued', 'processing'].includes(query.state.data?.status) ? 3000 : false
    });
    const originalQuery = useQuery({
        queryKey: ['note-original', id],
        queryFn: () => notesApi.original(id).then((r) => r.data),
        enabled: Boolean(id)
    });
    const data = noteQuery.data;
    const isBusy = ['queued', 'processing'].includes(data?.status);
    const canRetry = Boolean(data && (data.status === 'failed' || isUnreadableFallback(data)));
    const pages = useMemo(() => pagesFromBlocks(blocks), [blocks]);
    const lowConfidenceCount = blocks.filter((block) => (block.confidence || 0) < 0.8).length;
    useEffect(() => {
        if (!data || dirty)
            return;
        const nextBlocks = blocksFromNote(data);
        setTitle(data.title || nextBlocks.find((block) => block.type === 'title')?.content || 'Untitled note');
        setBlocks(nextBlocks);
        setActivePage(pagesFromBlocks(nextBlocks)[0] || 1);
    }, [data, dirty]);
    useEffect(() => {
        const beforeUnload = (event) => {
            if (!dirty)
                return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', beforeUnload);
        return () => window.removeEventListener('beforeunload', beforeUnload);
    }, [dirty]);
    const saveBlocks = useMutation({
        mutationFn: () => {
            const cleaned = cleanBlocksForSave(blocks);
            return notesApi.update(id, { title: title.trim() || 'Untitled note', structuredBlocks: cleaned, extractedText: blocksToPlainText(blocks) });
        },
        onSuccess: () => {
            setDirty(false);
            setLastSavedAt(new Date());
            setMessage('Saved');
            queryClient.invalidateQueries({ queryKey: ['note', id] });
            queryClient.invalidateQueries({ queryKey: ['notes'] });
        }
    });
    useEffect(() => {
        if (!dirty || isBusy || saveBlocks.isPending)
            return undefined;
        const timer = window.setTimeout(() => saveBlocks.mutate(), 3500);
        return () => window.clearTimeout(timer);
    }, [dirty, blocks, title, isBusy, saveBlocks.isPending]);
    const summarize = useMutation({ mutationFn: () => notesApi.summary(id) });
    const flashcards = useMutation({ mutationFn: () => notesApi.flashcards(id) });
    const correction = useMutation({
        mutationFn: () => notesApi.correction(id, { wrong, corrected }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['note', id] });
            queryClient.invalidateQueries({ queryKey: ['notes'] });
            setWrong('');
            setCorrected('');
            setDirty(false);
            setMessage('Correction applied to this note and saved for future OCR.');
        }
    });
    const retryOcr = useMutation({
        mutationFn: () => notesApi.retryOcr(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['note', id] });
            queryClient.invalidateQueries({ queryKey: ['notes'] });
            setMessage('OCR retry queued.');
        }
    });
    const deleteNote = useMutation({
        mutationFn: () => notesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notes'] });
            navigate('/dashboard');
        }
    });
    function requestDelete() {
        if (window.confirm('Delete this note and its original upload? This cannot be undone.')) {
            deleteNote.mutate();
        }
    }
    function updateBlock(id, patch) {
        setBlocks((current) => current.map((block) => block.localId === id ? { ...block, ...patch } : block));
        setDirty(true);
    }
    function addBlock(page, afterId) {
        const newBlock = {
            localId: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            type: 'paragraph',
            content: 'New block',
            confidence: 1,
            page
        };
        setBlocks((current) => {
            if (!afterId)
                return [...current, newBlock];
            const index = current.findIndex((block) => block.localId === afterId);
            if (index === -1)
                return [...current, newBlock];
            return [...current.slice(0, index + 1), newBlock, ...current.slice(index + 1)];
        });
        setDirty(true);
    }
    function deleteBlock(id) {
        setBlocks((current) => current.filter((block) => block.localId !== id));
        setDirty(true);
    }
    function goPage(direction) {
        const index = pages.indexOf(activePage);
        const nextPage = pages[Math.max(0, Math.min(pages.length - 1, index + direction))];
        setActivePage(nextPage || activePage);
    }
    if (noteQuery.isLoading)
        return _jsx("div", { className: "surface p-6", children: "Loading note..." });
    if (noteQuery.isError || !data)
        return _jsx("div", { className: "surface border-coral/30 bg-coral/10 p-6 font-medium text-coral", children: "Note not found or backend unavailable." });
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "surface flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs(Link, { to: "/dashboard", className: "inline-flex items-center gap-2 text-sm font-semibold text-brand", children: [_jsx(ArrowLeft, { size: 16 }), "Back"] }), _jsx("input", { className: "mt-2 w-full rounded-md border border-transparent bg-transparent px-0 text-2xl font-black text-ink outline-none transition focus:border-brand/30 focus:bg-white focus:px-3 sm:text-3xl", value: title, onChange: (event) => {
                                    setTitle(event.target.value);
                                    setDirty(true);
                                }, "aria-label": "Note title" }), _jsxs("p", { className: "mt-1 text-sm font-bold text-ink", children: ["Status: ", data.status, isBusy ? ' - OCR is still running.' : '', dirty ? ' - unsaved changes' : lastSavedAt ? ` - saved ${lastSavedAt.toLocaleTimeString()}` : ''] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end", children: [canRetry && (_jsxs("button", { onClick: () => retryOcr.mutate(), disabled: retryOcr.isPending || isBusy, className: "primary-button", children: [_jsx(RotateCcw, { size: 18, className: retryOcr.isPending ? 'animate-spin' : '' }), retryOcr.isPending ? 'Retrying...' : 'Retry OCR'] })), _jsxs("button", { onClick: () => saveBlocks.mutate(), disabled: saveBlocks.isPending || isBusy || !dirty, className: "primary-button", children: [_jsx(Save, { size: 18 }), saveBlocks.isPending ? 'Saving...' : 'Save all pages'] }), _jsxs("button", { onClick: () => noteQuery.refetch(), disabled: noteQuery.isFetching, className: "secondary-button", children: [_jsx(RefreshCw, { size: 18, className: noteQuery.isFetching ? 'animate-spin' : '' }), noteQuery.isFetching ? 'Refreshing...' : 'Refresh'] }), _jsxs("button", { onClick: requestDelete, disabled: deleteNote.isPending, className: "secondary-button text-coral", children: [_jsx(Trash, { size: 18 }), deleteNote.isPending ? 'Deleting...' : 'Delete'] })] })] }), data.status === 'failed' && (_jsxs("div", { className: "surface border-coral/30 bg-coral/10 p-4", children: [_jsx("p", { className: "font-black text-coral", children: "OCR failed" }), _jsx("p", { className: "mt-1 text-sm font-semibold leading-6 text-ink", children: data.ocrError || 'Upload a clearer file, crop the page, improve contrast, or retry conversion.' })] })), _jsxs("div", { className: "surface flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between", children: [_jsxs("div", { className: "grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:flex sm:flex-wrap", children: [_jsxs("button", { className: "secondary-button", onClick: () => goPage(-1), disabled: pages.indexOf(activePage) <= 0, children: [_jsx(ChevronLeft, { size: 18 }), "Prev"] }), _jsx("select", { className: "field min-w-0", value: activePage, onChange: (event) => setActivePage(Number(event.target.value)), children: pages.map((page) => _jsxs("option", { value: page, children: ["Page ", page] }, page)) }), _jsxs("button", { className: "secondary-button", onClick: () => goPage(1), disabled: pages.indexOf(activePage) >= pages.length - 1, children: ["Next", _jsx(ChevronRight, { size: 18 })] })] }), _jsxs("button", { className: reviewOnly ? 'primary-button' : 'secondary-button', onClick: () => setReviewOnly((value) => !value), children: [_jsx(Filter, { size: 18 }), "Needs review ", lowConfidenceCount ? `(${lowConfidenceCount})` : ''] })] }), _jsx("div", { className: "surface grid grid-cols-3 gap-2 p-2 xl:hidden", children: ['blocks', 'original', 'edit'].map((panel) => (_jsx("button", { onClick: () => setMobilePanel(panel), className: mobilePanel === panel ? 'primary-button px-2 text-sm capitalize' : 'secondary-button px-2 text-sm capitalize', children: panel }, panel))) }), _jsxs("div", { className: "grid gap-5 xl:grid-cols-[300px_minmax(360px,0.9fr)_minmax(460px,1.1fr)]", children: [_jsxs("aside", { className: `${mobilePanel === 'blocks' ? 'block' : 'hidden'} space-y-4 xl:block`, children: [_jsx(ReviewChecklist, { blocks: blocks, pages: pages, activePage: activePage, dirty: dirty, isBusy: isBusy, onGoPage: (page) => {
                                    setActivePage(page);
                                    setMobilePanel('edit');
                                }, onReview: () => {
                                    setReviewOnly(true);
                                    setMobilePanel('edit');
                                } }), _jsxs("div", { className: "surface p-5", children: [_jsx("h3", { className: "font-black text-ink", children: "Page blocks" }), _jsx("div", { className: "mt-4 max-h-[620px] space-y-3 overflow-auto pr-1", children: blocks.filter((block) => block.page === activePage).map((block) => (_jsxs("button", { onClick: () => setReviewOnly(false), className: `block w-full rounded-md border bg-white p-3 text-left shadow-sm ${block.confidence && block.confidence < 0.8 ? 'border-amber-300' : 'border-ink/15'}`, children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-2 text-xs", children: [_jsxs("span", { className: "font-black uppercase text-brand", children: [block.type, " p", block.page] }), _jsxs("span", { className: block.confidence && block.confidence < 0.8 ? 'font-bold text-amber-700' : 'font-bold text-emerald-700', children: [Math.round((block.confidence || 0) * 100), "%"] })] }), _jsx("p", { className: "line-clamp-3 text-sm font-medium leading-6 text-ink", children: block.content })] }, block.localId))) })] }), _jsxs("div", { className: "surface p-5", children: [_jsx("h4", { className: "font-black text-ink", children: "Manual correction" }), _jsx("p", { className: "mt-1 text-sm font-semibold leading-6 text-ink/75", children: "Fix a repeated OCR mistake in this note and teach PenBot for the next retry." }), _jsxs("div", { className: "mt-3 space-y-2", children: [_jsx("input", { className: "field", placeholder: "Wrong word", value: wrong, onChange: (e) => setWrong(e.target.value) }), _jsx("input", { className: "field", placeholder: "Correct word", value: corrected, onChange: (e) => setCorrected(e.target.value) }), _jsx("button", { onClick: () => correction.mutate(), disabled: !wrong || !corrected || correction.isPending, className: "primary-button w-full", children: correction.isPending ? 'Applying...' : 'Apply correction' })] })] })] }), _jsx("aside", { className: "hidden xl:block", children: _jsx(OriginalPreview, { blob: originalQuery.data, page: activePage }) }), _jsxs("section", { className: `${mobilePanel === 'edit' || mobilePanel === 'original' ? 'block' : 'hidden'} space-y-4 xl:block`, children: [_jsx("div", { className: `${mobilePanel === 'original' ? 'block' : 'hidden'} xl:hidden`, children: _jsx(OriginalPreview, { blob: originalQuery.data, page: activePage, compact: true }) }), _jsxs("div", { className: `${mobilePanel === 'edit' ? 'block' : 'hidden'} xl:block`, children: [_jsxs("button", { type: "button", onClick: () => setShowEdit((prev) => !prev), className: "surface flex w-full items-center justify-between border border-ink/10 px-4 py-3 text-left font-black text-ink", children: [_jsx("span", { children: "Edit converted blocks" }), showEdit ? _jsx(ChevronUp, { size: 18, className: "text-brand" }) : _jsx(ChevronDown, { size: 18, className: "text-brand" })] }), _jsx("div", { className: `overflow-hidden transition-all duration-300 ${showEdit ? 'mt-3 max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`, children: _jsx(BlockEditor, { blocks: blocks, page: activePage, reviewOnly: reviewOnly, onChange: updateBlock, onAdd: addBlock, onDelete: deleteBlock }) })] }), _jsx("div", { className: `${mobilePanel === 'edit' ? 'block' : 'hidden'} xl:block`, children: _jsx(PagePreview, { blocks: blocks, page: activePage, title: title }) }), _jsxs("div", { className: `${mobilePanel === 'edit' ? 'grid' : 'hidden'} surface grid-cols-2 gap-2 p-3 sm:flex sm:flex-wrap xl:flex`, children: [_jsxs("button", { onClick: () => summarize.mutate(), disabled: summarize.isPending || isBusy || dirty, className: "secondary-button", children: [_jsx(Sparkles, { size: 18 }), "Summary"] }), _jsxs("button", { onClick: () => flashcards.mutate(), disabled: flashcards.isPending || isBusy || dirty, className: "secondary-button", children: [_jsx(Brain, { size: 18 }), "Flashcards"] }), _jsxs("button", { onClick: () => downloadAuthenticated(notesApi.exportPdf(id), `note-${id}.pdf`), disabled: isBusy || dirty, className: "secondary-button", children: [_jsx(FileDown, { size: 18 }), "PDF"] }), _jsxs("button", { onClick: () => downloadAuthenticated(notesApi.exportDocx(id), `note-${id}.docx`), disabled: isBusy || dirty, className: "secondary-button", children: [_jsx(Download, { size: 18 }), "DOCX"] }), _jsx("button", { onClick: () => downloadAuthenticated(notesApi.exportMarkdown(id), `note-${id}.md`), disabled: isBusy || dirty, className: "secondary-button", children: "MD" }), _jsx("button", { onClick: () => downloadAuthenticated(notesApi.exportTxt(id), `note-${id}.txt`), disabled: isBusy || dirty, className: "secondary-button", children: "TXT" })] }), _jsxs("div", { className: mobilePanel === 'edit' ? 'block' : 'hidden xl:block', children: [message && _jsx("p", { className: "text-sm font-semibold text-emerald-700", children: message }), dirty && _jsx("p", { className: "text-sm font-semibold text-amber-700", children: "Autosave will run shortly. Save before exporting." })] }), _jsxs("div", { className: `${mobilePanel === 'edit' ? 'grid' : 'hidden'} gap-4 lg:grid-cols-2 xl:grid`, children: [summarize.data && (_jsxs("div", { className: "surface p-5", children: [_jsx("h4", { className: "font-black", children: "Summary" }), _jsx("p", { className: "mt-2 text-sm font-medium leading-6 text-ink", children: summarize.data.data.summary }), _jsx("ul", { className: "mt-3 list-disc space-y-1 pl-5 text-sm font-medium text-ink", children: summarize.data.data.keyPoints.map((point) => _jsx("li", { children: point }, point)) })] })), flashcards.data && (_jsxs("div", { className: "surface p-5", children: [_jsx("h4", { className: "font-black text-black", children: "Flashcards" }), _jsx("div", { className: "mt-3 grid gap-2", children: flashcards.data.data.flashcards.map((card) => (_jsxs("div", { className: "rounded-md border border-ink/10 bg-paper/70 p-3 text-sm", children: [_jsx("p", { className: "font-bold text-brand", children: card.q }), _jsx("p", { className: "mt-1 font-medium text-ink", children: card.a })] }, card.q))) })] }))] })] })] })] }));
}

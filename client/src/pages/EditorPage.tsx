import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  FileDown,
  Filter,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Trash,
  Trash2
} from 'lucide-react';
import { notesApi } from '@/api/notes';
import { http } from '@/api/http';

const blockTypes = ['title', 'heading', 'subheading', 'paragraph', 'bullet', 'numbered', 'step', 'definition', 'theorem', 'important', 'example', 'objective', 'materials', 'observation', 'result', 'conclusion', 'exam_tip', 'question', 'answer', 'table', 'formula', 'code'] as const;
type BlockType = typeof blockTypes[number];
type EditableBlock = {
  localId: string;
  type: BlockType;
  content: string;
  confidence?: number;
  page: number;
};
type MobilePanel = 'blocks' | 'original' | 'edit';

function ReviewChecklist({
  blocks,
  pages,
  activePage,
  dirty,
  isBusy,
  onGoPage,
  onReview
}: {
  blocks: EditableBlock[];
  pages: number[];
  activePage: number;
  dirty: boolean;
  isBusy: boolean;
  onGoPage: (page: number) => void;
  onReview: () => void;
}) {
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

  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase text-brand">Review checklist</p>
          <h3 className="mt-1 text-xl font-black text-ink">{exportReady ? 'Ready to export' : 'Needs review'}</h3>
        </div>
        <span className={exportReady ? 'badge bg-emerald-100 text-emerald-800' : 'badge bg-amber-100 text-amber-800'}>
          {exportReady ? 'Ready' : 'Review'}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-ink/10 bg-white p-3">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${item.ok ? 'bg-emerald-600' : 'bg-amber-500'}`} />
              <p className="font-black text-ink">{item.label}</p>
            </div>
            <p className="mt-1 text-sm font-semibold leading-6 text-ink/75">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2">
        {lowConfidence.length > 0 && (
          <button className="secondary-button w-full" onClick={onReview}>
            Review weak blocks
          </button>
        )}
        {emptyPages.map((page) => (
          <button key={page} className="secondary-button w-full" onClick={() => onGoPage(page)}>
            Open empty page {page}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm font-semibold leading-6 text-ink/75">
        Current page has {currentPageBlocks.length} block{currentPageBlocks.length === 1 ? '' : 's'}.
      </p>
    </div>
  );
}

async function downloadAuthenticated(url: string, filename: string) {
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

function isUnreadableFallback(note: any) {
  return stripHtml(note?.extractedText || '').toLowerCase().startsWith('no readable text was found');
}

function fallbackBlocksFromText(text = ''): EditableBlock[] {
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

function blocksFromNote(note: any): EditableBlock[] {
  const source = note?.structuredBlocks?.length ? note.structuredBlocks : fallbackBlocksFromText(note?.extractedText || '');
  return source.map((block: any, index: number) => ({
    localId: `${block.page || 1}-${index}-${block.type}-${String(block.content || '').slice(0, 16)}`,
    type: blockTypes.includes(block.type) ? block.type : 'paragraph',
    content: String(block.content || ''),
    confidence: typeof block.confidence === 'number' ? block.confidence : 0.9,
    page: Math.max(1, Number(block.page || 1))
  }));
}

function blocksToPlainText(blocks: EditableBlock[]) {
  const pages = pagesFromBlocks(blocks);
  return pages
    .map((page) => `Page ${page}\n${blocks.filter((block) => block.page === page).map((block) => block.content).join('\n')}`)
    .join('\n\n');
}

function cleanBlocksForSave(blocks: EditableBlock[]) {
  return blocks
    .filter((block) => block.content.trim())
    .map(({ type, content, confidence, page }) => ({ type, content: content.trim(), confidence, page }));
}

function pagesFromBlocks(blocks: EditableBlock[]) {
  const pages = Array.from(new Set(blocks.map((block) => block.page || 1)));
  return pages.length ? pages.sort((a, b) => a - b) : [1];
}

function parseTable(content: string) {
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

function OriginalPreview({ blob, page, compact = false }: { blob?: Blob; page: number; compact?: boolean }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!blob) return undefined;
    const nextUrl = URL.createObjectURL(blob);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [blob]);

  const pdfUrl = url ? `${url}#page=${page}&view=FitH` : '';

  return (
    <div className="surface sticky top-4 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-ink/15 bg-mist px-4 py-3">
        <ImageIcon className="text-brand" size={18} />
        <div>
          <p className="font-black text-ink">Original upload</p>
          <p className="text-xs font-bold uppercase text-ink/70">Synced to page {page}</p>
        </div>
      </div>
      <div className={`${compact ? 'max-h-[520px]' : 'max-h-[760px]'} overflow-auto bg-ink/5 p-3`}>
        {!url && <p className="rounded-lg bg-white p-4 text-sm font-semibold text-ink">Original preview is loading.</p>}
        {url && blob?.type === 'application/pdf' && (
          <object key={pdfUrl} data={pdfUrl} type="application/pdf" className={`${compact ? 'h-[500px]' : 'h-[720px]'} w-full rounded-lg border border-ink/10 bg-white`}>
            <a className="font-bold text-brand" href={pdfUrl} target="_blank" rel="noreferrer">Open original PDF</a>
          </object>
        )}
        {url && blob?.type !== 'application/pdf' && (
          <img src={url} alt="Original uploaded note" className="mx-auto max-h-[720px] rounded-lg border border-ink/10 bg-white object-contain shadow-sm" />
        )}
      </div>
    </div>
  );
}

function PagePreview({ blocks, page, title }: { blocks: EditableBlock[]; page: number; title: string }) {
  const pageBlocks = blocks.filter((block) => block.page === page);
  const hasTitle = pageBlocks.some((block) => block.type === 'title');
  let orderedIndex = 0;
  let stepIndex = 0;
  return (
    <article className="a4-page">
      <div className="a4-header">
        <div>
          <p className="text-[10px] font-black uppercase text-brand">PenBot AI converted document</p>
          <p className="mt-1 max-w-[28rem] truncate text-sm font-black text-ink">{title || 'Untitled note'}</p>
        </div>
        <span className="rounded-md border border-brand/20 bg-mist px-2 py-1 text-xs font-black text-brand">Page {page}</span>
      </div>
      <div className="a4-body">
        {!hasTitle && page === 1 && <h1 className="doc-title">{title || 'Untitled note'}</h1>}
        {!pageBlocks.length && <p className="doc-paragraph">No converted blocks on this page yet.</p>}
        {pageBlocks.map((block) => {
          if (block.type === 'title') return <h1 key={block.localId} className="doc-title">{block.content}</h1>;
          if (block.type === 'heading') return <h2 key={block.localId} className="doc-heading">{block.content}</h2>;
          if (block.type === 'subheading') return <h3 key={block.localId} className="doc-subheading">{block.content}</h3>;
          if (block.type === 'bullet') return <div key={block.localId} className="doc-bullet"><span /> <p>{block.content}</p></div>;
          if (block.type === 'numbered') return <div key={block.localId} className="doc-numbered"><span>{++orderedIndex}</span><p>{block.content}</p></div>;
          if (block.type === 'step') return <div key={block.localId} className="doc-step"><span>Step {++stepIndex}</span><p>{block.content}</p></div>;
          if (block.type === 'definition') return <div key={block.localId} className="doc-callout"><p>Definition</p><div>{block.content}</div></div>;
          if (block.type === 'theorem') return <div key={block.localId} className="doc-callout doc-theorem"><p>Theorem / Rule</p><div>{block.content}</div></div>;
          if (block.type === 'important') return <div key={block.localId} className="doc-callout doc-important"><p>Important</p><div>{block.content}</div></div>;
          if (block.type === 'example') return <div key={block.localId} className="doc-callout doc-example"><p>Example</p><div>{block.content}</div></div>;
          if (block.type === 'objective') return <div key={block.localId} className="doc-callout doc-objective"><p>Objective</p><div>{block.content}</div></div>;
          if (block.type === 'materials') return <div key={block.localId} className="doc-callout doc-materials"><p>Materials / Apparatus</p><div>{block.content}</div></div>;
          if (block.type === 'observation') return <div key={block.localId} className="doc-callout doc-observation"><p>Observation</p><div>{block.content}</div></div>;
          if (block.type === 'result') return <div key={block.localId} className="doc-callout doc-result"><p>Result</p><div>{block.content}</div></div>;
          if (block.type === 'conclusion') return <div key={block.localId} className="doc-callout doc-conclusion"><p>Conclusion</p><div>{block.content}</div></div>;
          if (block.type === 'exam_tip') return <div key={block.localId} className="doc-callout doc-exam-tip"><p>Exam tip</p><div>{block.content}</div></div>;
          if (block.type === 'question' || block.type === 'answer') return <div key={block.localId} className={block.type === 'question' ? 'doc-qa doc-question' : 'doc-qa doc-answer'}><span>{block.type === 'question' ? 'Q' : 'A'}</span><p>{block.content}</p></div>;
          if (block.type === 'table') {
            const rows = parseTable(block.content);
            return (
              <div key={block.localId} className="doc-table-wrap">
                <p>Table</p>
                <table className="doc-table">
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={`${block.localId}-${rowIndex}`}>
                        {row.map((cell, cellIndex) => rowIndex === 0 ? <th key={cellIndex}>{cell}</th> : <td key={cellIndex}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          if (block.type === 'formula') return <div key={block.localId} className="doc-formula"><p>Formula</p><div>{block.content}</div></div>;
          if (block.type === 'code') return <pre key={block.localId} className="doc-code">{block.content}</pre>;
          return <p key={block.localId} className="doc-paragraph">{block.content}</p>;
        })}
      </div>
      <div className="a4-footer">
        <span>Edited and exported with PenBot AI</span>
        <span>{new Date().toLocaleDateString()}</span>
      </div>
    </article>
  );
}

function BlockEditor({
  blocks,
  page,
  reviewOnly,
  onChange,
  onAdd,
  onDelete
}: {
  blocks: EditableBlock[];
  page: number;
  reviewOnly: boolean;
  onChange: (id: string, patch: Partial<EditableBlock>) => void;
  onAdd: (page: number, afterId?: string) => void;
  onDelete: (id: string) => void;
}) {
  const pageBlocks = blocks.filter((block) => block.page === page && (!reviewOnly || (block.confidence || 0) < 0.8));

  return (
    <div className="surface p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase text-brand">Editable blocks</p>
          <h3 className="text-xl font-black text-ink">Page {page}</h3>
        </div>
        <button className="primary-button" onClick={() => onAdd(page)}>
          <Plus size={18} />
          Add block
        </button>
      </div>

      <div className="space-y-3">
        {!pageBlocks.length && <p className="rounded-lg bg-mist p-4 text-sm font-bold text-ink">No blocks match this view.</p>}
        {pageBlocks.map((block) => {
          const lowConfidence = (block.confidence || 0) < 0.8;
          return (
            <div key={block.localId} className={`rounded-lg border bg-white p-3 shadow-sm ${lowConfidence ? 'border-amber-300 ring-2 ring-amber-100' : 'border-ink/15'}`}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <select className="field min-w-0 flex-1 py-2 text-sm sm:max-w-44 sm:flex-none" value={block.type} onChange={(event) => onChange(block.localId, { type: event.target.value as BlockType })}>
                  {blockTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <span className={lowConfidence ? 'badge bg-amber-100 text-amber-800' : 'badge bg-emerald-100 text-emerald-800'}>
                  {Math.round((block.confidence || 0) * 100)}%
                </span>
                {lowConfidence && <span className="badge bg-amber-100 text-amber-800">Needs review</span>}
                <button className="icon-button sm:ml-auto" onClick={() => onAdd(page, block.localId)} title="Add block after this one"><Plus size={16} /></button>
                <button className="icon-button text-coral" onClick={() => onDelete(block.localId)} title="Delete block"><Trash2 size={16} /></button>
              </div>
              <textarea
                className="field min-h-24 resize-y leading-7"
                value={block.content}
                onChange={(event) => onChange(block.localId, { content: event.target.value })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EditorPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [blocks, setBlocks] = useState<EditableBlock[]>([]);
  const [title, setTitle] = useState('Untitled note');
  const [activePage, setActivePage] = useState(1);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('edit');
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
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
    queryFn: () => notesApi.original(id).then((r) => r.data as Blob),
    enabled: Boolean(id)
  });

  const data = noteQuery.data;
  const isBusy = ['queued', 'processing'].includes(data?.status);
  const canRetry = Boolean(data && (data.status === 'failed' || isUnreadableFallback(data)));
  const pages = useMemo(() => pagesFromBlocks(blocks), [blocks]);
  const lowConfidenceCount = blocks.filter((block) => (block.confidence || 0) < 0.8).length;

  useEffect(() => {
    if (!data || dirty) return;
    const nextBlocks = blocksFromNote(data);
    setTitle(data.title || nextBlocks.find((block) => block.type === 'title')?.content || 'Untitled note');
    setBlocks(nextBlocks);
    setActivePage(pagesFromBlocks(nextBlocks)[0] || 1);
  }, [data, dirty]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
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
    if (!dirty || isBusy || saveBlocks.isPending) return undefined;
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

  function updateBlock(id: string, patch: Partial<EditableBlock>) {
    setBlocks((current) => current.map((block) => block.localId === id ? { ...block, ...patch } : block));
    setDirty(true);
  }

  function addBlock(page: number, afterId?: string) {
    const newBlock: EditableBlock = {
      localId: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: 'paragraph',
      content: 'New block',
      confidence: 1,
      page
    };
    setBlocks((current) => {
      if (!afterId) return [...current, newBlock];
      const index = current.findIndex((block) => block.localId === afterId);
      if (index === -1) return [...current, newBlock];
      return [...current.slice(0, index + 1), newBlock, ...current.slice(index + 1)];
    });
    setDirty(true);
  }

  function deleteBlock(id: string) {
    setBlocks((current) => current.filter((block) => block.localId !== id));
    setDirty(true);
  }

  function goPage(direction: -1 | 1) {
    const index = pages.indexOf(activePage);
    const nextPage = pages[Math.max(0, Math.min(pages.length - 1, index + direction))];
    setActivePage(nextPage || activePage);
  }

  if (noteQuery.isLoading) return <div className="surface p-6">Loading note...</div>;
  if (noteQuery.isError || !data) return <div className="surface border-coral/30 bg-coral/10 p-6 font-medium text-coral">Note not found or backend unavailable.</div>;

  return (
    <div className="space-y-6">
      <div className="surface flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
            <ArrowLeft size={16} />
            Back
          </Link>
          <input
            className="mt-2 w-full rounded-md border border-transparent bg-transparent px-0 text-2xl font-black text-ink outline-none transition focus:border-brand/30 focus:bg-white focus:px-3 sm:text-3xl"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setDirty(true);
            }}
            aria-label="Note title"
          />
          <p className="mt-1 text-sm font-bold text-ink">
            Status: {data.status}{isBusy ? ' - OCR is still running.' : ''}
            {dirty ? ' - unsaved changes' : lastSavedAt ? ` - saved ${lastSavedAt.toLocaleTimeString()}` : ''}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
          {canRetry && (
            <button onClick={() => retryOcr.mutate()} disabled={retryOcr.isPending || isBusy} className="primary-button">
              <RotateCcw size={18} className={retryOcr.isPending ? 'animate-spin' : ''} />
              {retryOcr.isPending ? 'Retrying...' : 'Retry OCR'}
            </button>
          )}
          <button onClick={() => saveBlocks.mutate()} disabled={saveBlocks.isPending || isBusy || !dirty} className="primary-button">
            <Save size={18} />
            {saveBlocks.isPending ? 'Saving...' : 'Save all pages'}
          </button>
          <button onClick={() => noteQuery.refetch()} disabled={noteQuery.isFetching} className="secondary-button">
            <RefreshCw size={18} className={noteQuery.isFetching ? 'animate-spin' : ''} />
            {noteQuery.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
          <button onClick={requestDelete} disabled={deleteNote.isPending} className="secondary-button text-coral">
            <Trash size={18} />
            {deleteNote.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {data.status === 'failed' && (
        <div className="surface border-coral/30 bg-coral/10 p-4">
          <p className="font-black text-coral">OCR failed</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-ink">
            {data.ocrError || 'Upload a clearer file, crop the page, improve contrast, or retry conversion.'}
          </p>
        </div>
      )}

      <div className="surface flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:flex sm:flex-wrap">
          <button className="secondary-button" onClick={() => goPage(-1)} disabled={pages.indexOf(activePage) <= 0}><ChevronLeft size={18} />Prev</button>
          <select className="field min-w-0" value={activePage} onChange={(event) => setActivePage(Number(event.target.value))}>
            {pages.map((page) => <option key={page} value={page}>Page {page}</option>)}
          </select>
          <button className="secondary-button" onClick={() => goPage(1)} disabled={pages.indexOf(activePage) >= pages.length - 1}>Next<ChevronRight size={18} /></button>
        </div>
        <button className={reviewOnly ? 'primary-button' : 'secondary-button'} onClick={() => setReviewOnly((value) => !value)}>
          <Filter size={18} />
          Needs review {lowConfidenceCount ? `(${lowConfidenceCount})` : ''}
        </button>
      </div>

      <div className="surface grid grid-cols-3 gap-2 p-2 xl:hidden">
        {(['blocks', 'original', 'edit'] as const).map((panel) => (
          <button
            key={panel}
            onClick={() => setMobilePanel(panel)}
            className={mobilePanel === panel ? 'primary-button px-2 text-sm capitalize' : 'secondary-button px-2 text-sm capitalize'}
          >
            {panel}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[300px_minmax(360px,0.9fr)_minmax(460px,1.1fr)]">
        <aside className={`${mobilePanel === 'blocks' ? 'block' : 'hidden'} space-y-4 xl:block`}>
          <ReviewChecklist
            blocks={blocks}
            pages={pages}
            activePage={activePage}
            dirty={dirty}
            isBusy={isBusy}
            onGoPage={(page) => {
              setActivePage(page);
              setMobilePanel('edit');
            }}
            onReview={() => {
              setReviewOnly(true);
              setMobilePanel('edit');
            }}
          />

          <div className="surface p-5">
            <h3 className="font-black text-ink">Page blocks</h3>
            <div className="mt-4 max-h-[620px] space-y-3 overflow-auto pr-1">
              {blocks.filter((block) => block.page === activePage).map((block) => (
                <button
                  key={block.localId}
                  onClick={() => setReviewOnly(false)}
                  className={`block w-full rounded-md border bg-white p-3 text-left shadow-sm ${block.confidence && block.confidence < 0.8 ? 'border-amber-300' : 'border-ink/15'}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                    <span className="font-black uppercase text-brand">{block.type} p{block.page}</span>
                    <span className={block.confidence && block.confidence < 0.8 ? 'font-bold text-amber-700' : 'font-bold text-emerald-700'}>
                      {Math.round((block.confidence || 0) * 100)}%
                    </span>
                  </div>
                  <p className="line-clamp-3 text-sm font-medium leading-6 text-ink">{block.content}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="surface p-5">
            <h4 className="font-black text-ink">Manual correction</h4>
            <p className="mt-1 text-sm font-semibold leading-6 text-ink/75">Fix a repeated OCR mistake in this note and teach PenBot for the next retry.</p>
            <div className="mt-3 space-y-2">
              <input className="field" placeholder="Wrong word" value={wrong} onChange={(e) => setWrong(e.target.value)} />
              <input className="field" placeholder="Correct word" value={corrected} onChange={(e) => setCorrected(e.target.value)} />
              <button onClick={() => correction.mutate()} disabled={!wrong || !corrected || correction.isPending} className="primary-button w-full">
                {correction.isPending ? 'Applying...' : 'Apply correction'}
              </button>
            </div>
          </div>
        </aside>

        <aside className="hidden xl:block">
          <OriginalPreview blob={originalQuery.data} page={activePage} />
        </aside>

        <section className={`${mobilePanel === 'edit' || mobilePanel === 'original' ? 'block' : 'hidden'} space-y-4 xl:block`}>
          <div className={`${mobilePanel === 'original' ? 'block' : 'hidden'} xl:hidden`}>
            <OriginalPreview blob={originalQuery.data} page={activePage} compact />
          </div>
         <div className={`${mobilePanel === 'edit' ? 'block' : 'hidden'} xl:block`}>
  <button
    type="button"
    onClick={() => setShowEdit((prev) => !prev)}
    className="surface flex w-full items-center justify-between border border-ink/10 px-4 py-3 text-left font-black text-ink"
  >
    <span>Edit converted blocks</span>
    {showEdit ? <ChevronUp size={18} className="text-brand" /> : <ChevronDown size={18} className="text-brand" />}
  </button>

  <div
    className={`overflow-hidden transition-all duration-300 ${
      showEdit ? 'mt-3 max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
    }`}
  >
    <BlockEditor
      blocks={blocks}
      page={activePage}
      reviewOnly={reviewOnly}
      onChange={updateBlock}
      onAdd={addBlock}
      onDelete={deleteBlock}
    />
  </div>
</div>
          <div className={`${mobilePanel === 'edit' ? 'block' : 'hidden'} xl:block`}>
            <PagePreview blocks={blocks} page={activePage} title={title} />
          </div>

          <div className={`${mobilePanel === 'edit' ? 'grid' : 'hidden'} surface grid-cols-2 gap-2 p-3 sm:flex sm:flex-wrap xl:flex`}>
            <button onClick={() => summarize.mutate()} disabled={summarize.isPending || isBusy || dirty} className="secondary-button"><Sparkles size={18} />Summary</button>
            <button onClick={() => flashcards.mutate()} disabled={flashcards.isPending || isBusy || dirty} className="secondary-button"><Brain size={18} />Flashcards</button>
            <button onClick={() => downloadAuthenticated(notesApi.exportPdf(id), `note-${id}.pdf`)} disabled={isBusy || dirty} className="secondary-button"><FileDown size={18} />PDF</button>
            <button onClick={() => downloadAuthenticated(notesApi.exportDocx(id), `note-${id}.docx`)} disabled={isBusy || dirty} className="secondary-button"><Download size={18} />DOCX</button>
            <button onClick={() => downloadAuthenticated(notesApi.exportMarkdown(id), `note-${id}.md`)} disabled={isBusy || dirty} className="secondary-button">MD</button>
            <button onClick={() => downloadAuthenticated(notesApi.exportTxt(id), `note-${id}.txt`)} disabled={isBusy || dirty} className="secondary-button">TXT</button>
          </div>
          <div className={mobilePanel === 'edit' ? 'block' : 'hidden xl:block'}>
            {message && <p className="text-sm font-semibold text-emerald-700">{message}</p>}
            {dirty && <p className="text-sm font-semibold text-amber-700">Autosave will run shortly. Save before exporting.</p>}
          </div>

          <div className={`${mobilePanel === 'edit' ? 'grid' : 'hidden'} gap-4 lg:grid-cols-2 xl:grid`}>
            {summarize.data && (
              <div className="surface p-5">
                <h4 className="font-black">Summary</h4>
                <p className="mt-2 text-sm font-medium leading-6 text-ink">{summarize.data.data.summary}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm font-medium text-ink">
                  {summarize.data.data.keyPoints.map((point: string) => <li key={point}>{point}</li>)}
                </ul>
              </div>
            )}

            {flashcards.data && (
              <div className="surface p-5">
                <h4 className="font-black text-black">Flashcards</h4>
                <div className="mt-3 grid gap-2">
                  {flashcards.data.data.flashcards.map((card: any) => (
                    <div key={card.q} className="rounded-md border border-ink/10 bg-paper/70 p-3 text-sm">
                      <p className="font-bold text-brand">{card.q}</p>
                      <p className="mt-1 font-medium text-ink">{card.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

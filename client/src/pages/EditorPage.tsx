import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { ArrowLeft, BookOpen, Brain, Download, FileDown, RefreshCw, Save, Sparkles } from 'lucide-react';
import { NoteEditor } from '@/editor/NoteEditor';
import { notesApi } from '@/api/notes';
import { http } from '@/api/http';

async function downloadAuthenticated(url: string, filename: string) {
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

  if (noteQuery.isLoading) return <div className="surface p-6">Loading note...</div>;
  if (noteQuery.isError || !data) return <div className="surface border-coral/30 bg-coral/10 p-6 font-medium text-coral">Note not found or backend unavailable.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
            <ArrowLeft size={16} />
            Back
          </Link>
          <h2 className="mt-2 text-3xl font-black">Note editor</h2>
          <p className="mt-1 text-sm text-ink/60">Status: {data.status}{isBusy ? ' - OCR is still running.' : ''}</p>
        </div>
        <button onClick={() => noteQuery.refetch()} className="secondary-button">
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {data.status === 'failed' && <div className="surface border-coral/30 bg-coral/10 p-4 font-medium text-coral">OCR failed. Upload a clearer file or check the AI service logs.</div>}

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <div className="surface p-5">
            <div className="flex items-center gap-2">
              <BookOpen className="text-brand" size={20} />
              <h3 className="font-black">OCR blocks</h3>
            </div>
            <div className="mt-4 max-h-[620px] space-y-3 overflow-auto pr-1">
              {(data.structuredBlocks || []).length === 0 && <p className="text-sm text-ink/55">Blocks will appear after OCR completes.</p>}
              {(data.structuredBlocks || []).map((block: any, index: number) => (
                <div key={`${block.content}-${index}`} className="rounded-md border border-ink/10 bg-paper/70 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold uppercase text-brand">{block.type}</span>
                    <span className={block.confidence < 0.8 ? 'font-bold text-amber-700' : 'font-bold text-emerald-700'}>
                      {Math.round((block.confidence || 0) * 100)}%
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-ink/75">{block.content}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface p-5">
            <h4 className="font-black">Correction feedback</h4>
            <div className="mt-3 space-y-2">
              <input className="field" placeholder="Wrong word" value={wrong} onChange={(e) => setWrong(e.target.value)} />
              <input className="field" placeholder="Correct word" value={corrected} onChange={(e) => setCorrected(e.target.value)} />
              <button onClick={() => correction.mutate()} disabled={!wrong || !corrected || correction.isPending} className="primary-button w-full">Learn</button>
            </div>
            {correction.isSuccess && <p className="mt-3 text-sm font-medium text-emerald-700">Correction saved.</p>}
          </div>
        </aside>

        <section className="space-y-4">
          <NoteEditor content={data.extractedText || ''} onChange={setHtml} />
          <div className="surface grid grid-cols-2 gap-2 p-3 sm:flex sm:flex-wrap">
            <button onClick={() => save.mutate()} disabled={save.isPending || isBusy} className="primary-button">
              <Save size={18} />
              {save.isPending ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => summarize.mutate()} disabled={summarize.isPending || isBusy} className="secondary-button"><Sparkles size={18} />Summary</button>
            <button onClick={() => flashcards.mutate()} disabled={flashcards.isPending || isBusy} className="secondary-button"><Brain size={18} />Flashcards</button>
            <button onClick={() => downloadAuthenticated(notesApi.exportPdf(id), `note-${id}.pdf`)} disabled={isBusy} className="secondary-button"><FileDown size={18} />PDF</button>
            <button onClick={() => downloadAuthenticated(notesApi.exportDocx(id), `note-${id}.docx`)} disabled={isBusy} className="secondary-button"><Download size={18} />DOCX</button>
            <button onClick={() => downloadAuthenticated(notesApi.exportMarkdown(id), `note-${id}.md`)} disabled={isBusy} className="secondary-button">MD</button>
            <button onClick={() => downloadAuthenticated(notesApi.exportTxt(id), `note-${id}.txt`)} disabled={isBusy} className="secondary-button">TXT</button>
          </div>
          {message && <p className="text-sm font-semibold text-emerald-700">{message}</p>}

          <div className="grid gap-4 lg:grid-cols-2">
            {summarize.data && (
              <div className="surface p-5">
                <h4 className="font-black">Summary</h4>
                <p className="mt-2 text-sm leading-6 text-ink/70">{summarize.data.data.summary}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink/65">
                  {summarize.data.data.keyPoints.map((point: string) => <li key={point}>{point}</li>)}
                </ul>
              </div>
            )}

            {flashcards.data && (
              <div className="surface p-5">
                <h4 className="font-black">Flashcards</h4>
                <div className="mt-3 grid gap-2">
                  {flashcards.data.data.flashcards.map((card: any) => (
                    <div key={card.q} className="rounded-md border border-ink/10 bg-paper/70 p-3 text-sm">
                      <p className="font-bold text-brand">{card.q}</p>
                      <p className="mt-1 text-ink/65">{card.a}</p>
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

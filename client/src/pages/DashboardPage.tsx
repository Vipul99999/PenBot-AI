import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock3, FileText, Loader2, Plus, Search, UploadCloud } from 'lucide-react';
import { notesApi } from '@/api/notes';

const statusMeta: Record<string, { label: string; className: string; icon: typeof Clock3 }> = {
  queued: { label: 'Queued', className: 'bg-amber-200 text-amber-950', icon: Clock3 },
  processing: { label: 'Processing', className: 'bg-sky-200 text-sky-950', icon: Loader2 },
  done: { label: 'Ready', className: 'bg-emerald-200 text-emerald-950', icon: CheckCircle2 },
  failed: { label: 'Failed', className: 'bg-red-200 text-red-950', icon: AlertCircle }
};

function stripHtml(value = '') {
  return value.replace(/<[^>]*>/g, '').trim();
}

function notePreview(note: any) {
  if (note.status === 'failed') return note.ocrError || 'OCR failed. Open this note to retry conversion.';
  return stripHtml(note.extractedText).slice(0, 170) || note.originalFile;
}

export function DashboardPage() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['notes'],
    queryFn: () => notesApi.list().then((r) => r.data),
    refetchInterval: (query) => query.state.data?.some((note: any) => ['queued', 'processing'].includes(note.status)) ? 3000 : false
  });

  const ready = data.filter((note: any) => note.status === 'done').length;
  const processing = data.filter((note: any) => ['queued', 'processing'].includes(note.status)).length;

  return (
    <div className="space-y-6">
      <div className="surface flex flex-wrap items-end justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-black uppercase text-brand">Overview</p>
          <h2 className="mt-1 text-3xl font-black text-ink">My Notes</h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ink/80">
            Track OCR progress, open converted notes, search your notebook, and export clean study files.
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
          <Link to="/dashboard/search" className="secondary-button">
            <Search size={18} />
            Search
          </Link>
          <Link to="/dashboard/upload" className="primary-button">
            <Plus size={18} />
            Upload
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ['Total notes', data.length, FileText],
          ['Ready to edit', ready, CheckCircle2],
          ['In OCR', processing, Loader2]
        ].map(([label, value, Icon]) => {
          const TypedIcon = Icon as typeof FileText;
          return (
            <div key={String(label)} className="surface p-5 ring-1 ring-white">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-ink">{String(label)}</p>
                <TypedIcon className="text-brand" size={20} />
              </div>
              <p className="mt-4 text-3xl font-black text-ink">{String(value)}</p>
            </div>
          );
        })}
      </div>

      {isLoading && <div className="surface p-6">Loading notes...</div>}
      {isError && <div className="surface border-coral/30 bg-coral/10 p-6 font-medium text-coral">Could not load notes. Check the backend connection.</div>}

      {!isLoading && !isError && data.length === 0 && (
        <div className="surface grid gap-6 p-8 ring-1 ring-white md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h3 className="text-xl font-black text-ink">Start with your first handwritten page</h3>
            <p className="mt-2 max-w-xl font-medium text-ink/80">Upload a PDF or image and PenBot will create an editable note with OCR blocks.</p>
          </div>
          <Link to="/dashboard/upload" className="primary-button">
            <UploadCloud size={18} />
            Upload note
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {data.map((note: any) => {
          const status = statusMeta[note.status] || statusMeta.queued;
          const StatusIcon = status.icon;
          return (
            <Link to={`/dashboard/editor/${note._id}`} className="surface block p-5 ring-1 ring-white transition hover:-translate-y-0.5 hover:shadow-lg" key={note._id}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className={`badge ${status.className}`}>
                  <StatusIcon size={14} className={note.status === 'processing' ? 'animate-spin' : ''} />
                  {status.label}
                </span>
                <span className="text-xs font-bold text-ink/70">{new Date(note.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="min-h-16 text-sm font-medium leading-6 text-ink">{notePreview(note)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(note.tags?.length ? note.tags : ['UNTAGGED']).slice(0, 3).map((tag: string) => (
                  <span key={tag} className="badge bg-mist text-ink">{tag}</span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

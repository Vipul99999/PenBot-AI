import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock3, FileText, Loader2, Plus, Search, UploadCloud } from 'lucide-react';
import { notesApi } from '@/api/notes';

const statusMeta: Record<string, { label: string; className: string; icon: typeof Clock3 }> = {
  queued: { label: 'Queued', className: 'bg-amber-100 text-amber-800', icon: Clock3 },
  processing: { label: 'Processing', className: 'bg-sky-100 text-sky-800', icon: Loader2 },
  done: { label: 'Ready', className: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-800', icon: AlertCircle }
};

function stripHtml(value = '') {
  return value.replace(/<[^>]*>/g, '').trim();
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase text-brand">Overview</p>
          <h2 className="mt-1 text-3xl font-black">My Notes</h2>
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
            <div key={String(label)} className="surface p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink/60">{String(label)}</p>
                <TypedIcon className="text-brand" size={20} />
              </div>
              <p className="mt-4 text-3xl font-black">{String(value)}</p>
            </div>
          );
        })}
      </div>

      {isLoading && <div className="surface p-6">Loading notes...</div>}
      {isError && <div className="surface border-coral/30 bg-coral/10 p-6 font-medium text-coral">Could not load notes. Check the backend connection.</div>}

      {!isLoading && !isError && data.length === 0 && (
        <div className="surface grid gap-6 p-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h3 className="text-xl font-black">Start with your first handwritten page</h3>
            <p className="mt-2 max-w-xl text-ink/60">Upload a PDF or image and PenBot will create an editable note with OCR blocks.</p>
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
            <Link to={`/dashboard/editor/${note._id}`} className="surface block p-5 transition hover:-translate-y-0.5 hover:shadow-md" key={note._id}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className={`badge ${status.className}`}>
                  <StatusIcon size={14} className={note.status === 'processing' ? 'animate-spin' : ''} />
                  {status.label}
                </span>
                <span className="text-xs font-medium text-ink/45">{new Date(note.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="min-h-16 text-sm leading-6 text-ink/75">{stripHtml(note.extractedText).slice(0, 170) || note.originalFile}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(note.tags?.length ? note.tags : ['UNTAGGED']).slice(0, 3).map((tag: string) => (
                  <span key={tag} className="badge bg-mist text-brand">{tag}</span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

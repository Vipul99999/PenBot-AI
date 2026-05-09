import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileSearch, Search } from 'lucide-react';
import { notesApi } from '@/api/notes';

function stripHtml(value = '') {
  return value.replace(/<[^>]*>/g, '').trim();
}

function noteTitle(note: any) {
  return note.title || note.structuredBlocks?.find((block: any) => block.type === 'title')?.content || 'Untitled note';
}

export function SearchPage() {
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const { data = [], isFetching, isError } = useQuery({
    queryKey: ['search', submitted],
    queryFn: () => notesApi.search(submitted).then((r) => r.data),
    enabled: submitted.length > 0
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(q.trim());
  };

  return (
    <div className="space-y-6">
      <div className="surface p-5">
        <p className="text-sm font-black uppercase text-brand">Find</p>
        <h2 className="mt-1 text-3xl font-black text-ink">Search notes</h2>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ink/80">
          Search converted text, formulas, tags, and study topics across your notebook.
        </p>
      </div>

      <form onSubmit={submit} className="surface flex flex-col gap-3 p-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/70" size={18} />
          <input className="field pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search topics, formulas, tags..." />
        </div>
        <button className="primary-button" disabled={!q.trim() || isFetching}>
          <FileSearch size={18} />
          {isFetching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {isError && <div className="surface border-coral/30 bg-coral/10 p-4 font-medium text-coral">Search failed. Try another keyword.</div>}
      {submitted && !isFetching && data.length === 0 && <div className="surface p-6 font-semibold text-ink">No matching notes found.</div>}

      <div className="grid gap-3">
        {data.map((note: any) => (
          <Link to={`/dashboard/editor/${note._id}`} key={note._id} className="surface block p-5 transition hover:shadow-lg">
            <h3 className="mb-2 text-lg font-black text-ink">{noteTitle(note)}</h3>
            <p className="text-sm font-medium leading-6 text-ink">{stripHtml(note.extractedText).slice(0, 240) || note.originalFile}</p>
            {!!note.tags?.length && (
              <div className="mt-3 flex flex-wrap gap-2">
                {note.tags.map((tag: string) => <span key={tag} className="badge bg-mist text-ink">{tag}</span>)}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

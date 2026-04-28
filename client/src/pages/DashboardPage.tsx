import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { notesApi } from '@/api/notes';

export function DashboardPage() {
  const { data } = useQuery({ queryKey: ['notes'], queryFn: () => notesApi.list().then((r) => r.data) });

  return (
    <div>
      <h2 className="text-2xl mb-4">My Notes</h2>
      <div className="grid gap-3">
        {(data || []).map((note: any) => (
          <Link to={`/dashboard/editor/${note._id}`} className="glass p-4" key={note._id}>
            <p>{note.extractedText?.slice(0, 100) || note.originalFile}</p>
            <p className="text-xs text-slate-300">Status: {note.status}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

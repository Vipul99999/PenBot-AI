import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { notesApi } from '@/api/notes';
import { Card } from '@/components/ui/Card';

export function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['notes'],
    queryFn: () => notesApi.list().then((r) => r.data)
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">My Notes</h2>
      {isLoading ? <Card>Loading notes...</Card> : null}
      {isError ? <Card>Failed to load notes. Check backend/auth token.</Card> : null}
      <div className="grid gap-3">
        {(data || []).map((note: any) => (
          <Link to={`/dashboard/editor/${note._id}`} className="glass p-4 hover:border-brand transition" key={note._id}>
            <p className="font-medium">{note.extractedText?.slice(0, 120) || note.originalFile}</p>
            <p className="text-xs text-slate-300 mt-1">Status: {note.status}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

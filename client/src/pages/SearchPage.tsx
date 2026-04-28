import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notesApi } from '@/api/notes';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function SearchPage() {
  const [q, setQ] = useState('');
  const { data, refetch, isFetching, error } = useQuery({
    queryKey: ['search', q],
    queryFn: () => notesApi.search(q).then((r) => r.data),
    enabled: false
  });

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Search Notes</h2>
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search keywords..." />
        <Button onClick={() => refetch()} loading={isFetching}>Search</Button>
      </div>
      {error ? <div className="glass p-3 text-red-300">Search failed. Try a non-empty query.</div> : null}
      <div className="space-y-2">
        {(data || []).map((n: any) => (
          <div key={n._id} className="glass p-3">{n.extractedText?.slice(0, 160)}</div>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notesApi } from '@/api/notes';

export function SearchPage() {
  const [q, setQ] = useState('tcp');
  const { data, refetch } = useQuery({ queryKey: ['search', q], queryFn: () => notesApi.search(q).then((r) => r.data), enabled: false });

  return (
    <div className="space-y-4">
      <div className="flex gap-2"><input className="p-2 text-black" value={q} onChange={(e)=>setQ(e.target.value)} /><button className="bg-brand px-4" onClick={()=>refetch()}>Search</button></div>
      <div className="space-y-2">{(data || []).map((n:any)=><div key={n._id} className="glass p-3">{n.extractedText?.slice(0, 120)}</div>)}</div>
    </div>
  );
}

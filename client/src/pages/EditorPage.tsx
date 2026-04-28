import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { NoteEditor } from '@/editor/NoteEditor';
import { notesApi } from '@/api/notes';
import { http } from '@/api/http';

async function downloadAuthenticated(url: string, filename: string) {
  const token = localStorage.getItem('token');
  const { data } = await http.get(url.replace(http.defaults.baseURL || '', ''), {
    responseType: 'blob',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  const href = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}

export function EditorPage() {
  const { id = '' } = useParams();
  const { data } = useQuery({ queryKey: ['note', id], queryFn: () => notesApi.get(id).then((r) => r.data), enabled: Boolean(id) });
  const [html, setHtml] = useState('');
  const [wrong, setWrong] = useState('');
  const [corrected, setCorrected] = useState('');
  const save = useMutation({ mutationFn: () => notesApi.update(id, { extractedText: html }) });
  const summarize = useMutation({ mutationFn: () => notesApi.summary(id) });
  const flashcards = useMutation({ mutationFn: () => notesApi.flashcards(id) });
  const correction = useMutation({ mutationFn: () => notesApi.correction(id, { wrong, corrected }) });

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="glass p-4">
        <h3>Original / Confidence</h3>
        {(data?.structuredBlocks || []).map((b: any, i: number) => (
          <p key={i} className={b.confidence < 0.8 ? 'text-amber-300' : ''}>{b.content} <span className="text-xs">({Math.round((b.confidence || 0) * 100)}%)</span></p>
        ))}
      </div>
      <div className="space-y-3">
        <NoteEditor content={data?.extractedText || ''} onChange={setHtml} />
        <div className="space-x-2 flex flex-wrap gap-2">
          <button onClick={() => save.mutate()} className="bg-brand px-4 py-2 rounded">Save</button>
          <button onClick={() => summarize.mutate()} className="bg-emerald-600 px-4 py-2 rounded">Summary</button>
          <button onClick={() => flashcards.mutate()} className="bg-cyan-600 px-4 py-2 rounded">Flashcards</button>
          <button onClick={() => downloadAuthenticated(notesApi.exportPdf(id), `note-${id}.pdf`)} className="bg-purple-600 px-4 py-2 rounded">PDF</button>
          <button onClick={() => downloadAuthenticated(notesApi.exportDocx(id), `note-${id}.docx`)} className="bg-purple-600 px-4 py-2 rounded">DOCX</button>
          <button onClick={() => downloadAuthenticated(notesApi.exportMarkdown(id), `note-${id}.md`)} className="bg-purple-600 px-4 py-2 rounded">MD</button>
          <button onClick={() => downloadAuthenticated(notesApi.exportTxt(id), `note-${id}.txt`)} className="bg-purple-600 px-4 py-2 rounded">TXT</button>
        </div>
        <div className="glass p-3 space-y-2">
          <h4>Personalized OCR learning</h4>
          <div className="flex gap-2">
            <input className="p-2 text-black" placeholder="Wrong word" value={wrong} onChange={(e) => setWrong(e.target.value)} />
            <input className="p-2 text-black" placeholder="Correct word" value={corrected} onChange={(e) => setCorrected(e.target.value)} />
            <button onClick={() => correction.mutate()} className="bg-orange-600 px-3 rounded">Learn</button>
          </div>
          {correction.isSuccess && <p className="text-green-300 text-sm">Correction saved.</p>}
        </div>
        {summarize.data && <pre className="glass p-2 text-sm">{JSON.stringify(summarize.data.data, null, 2)}</pre>}
        {flashcards.data && <pre className="glass p-2 text-sm">{JSON.stringify(flashcards.data.data, null, 2)}</pre>}
      </div>
    </div>
  );
}

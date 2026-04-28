import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { NoteEditor } from '@/editor/NoteEditor';
import { notesApi } from '@/api/notes';
import { http } from '@/api/http';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

async function downloadAuthenticated(url: string, filename: string) {
  const token = localStorage.getItem('token');
  const relative = url.replace(http.defaults.baseURL || '', '');
  const { data } = await http.get(relative, {
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
  const { data, isLoading } = useQuery({ queryKey: ['note', id], queryFn: () => notesApi.get(id).then((r) => r.data), enabled: Boolean(id) });
  const [html, setHtml] = useState('');
  const [wrong, setWrong] = useState('');
  const [corrected, setCorrected] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (data?.extractedText) setHtml(data.extractedText);
  }, [data?.extractedText]);

  const save = useMutation({
    mutationFn: () => notesApi.update(id, { extractedText: html }),
    onSuccess: () => setMessage('Saved successfully.')
  });
  const summarize = useMutation({ mutationFn: () => notesApi.summary(id) });
  const flashcards = useMutation({ mutationFn: () => notesApi.flashcards(id) });
  const correction = useMutation({
    mutationFn: () => notesApi.correction(id, { wrong, corrected }),
    onSuccess: () => {
      setWrong('');
      setCorrected('');
      setMessage('Correction saved. It will be used on future OCR runs.');
    }
  });

  if (isLoading) return <Card>Loading note...</Card>;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <h3 className="font-semibold mb-2">Original / Confidence</h3>
        {(data?.structuredBlocks || []).map((b: any, i: number) => (
          <p key={i} className={b.confidence < 0.8 ? 'text-amber-300' : ''}>
            {b.content} <span className="text-xs">({Math.round((b.confidence || 0) * 100)}%)</span>
          </p>
        ))}
      </Card>

      <div className="space-y-3">
        <NoteEditor content={html} onChange={setHtml} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save.mutate()} loading={save.isPending}>Save</Button>
          <Button onClick={() => summarize.mutate()} loading={summarize.isPending} className="bg-emerald-600">Summary</Button>
          <Button onClick={() => flashcards.mutate()} loading={flashcards.isPending} className="bg-cyan-600">Flashcards</Button>
          <Button onClick={() => downloadAuthenticated(notesApi.exportPdf(id), `note-${id}.pdf`)} className="bg-purple-600">PDF</Button>
          <Button onClick={() => downloadAuthenticated(notesApi.exportDocx(id), `note-${id}.docx`)} className="bg-purple-600">DOCX</Button>
          <Button onClick={() => downloadAuthenticated(notesApi.exportMarkdown(id), `note-${id}.md`)} className="bg-purple-600">MD</Button>
          <Button onClick={() => downloadAuthenticated(notesApi.exportTxt(id), `note-${id}.txt`)} className="bg-purple-600">TXT</Button>
        </div>

        <Card>
          <h4 className="font-semibold">Personalized OCR learning</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            <Input placeholder="Wrong word" value={wrong} onChange={(e) => setWrong(e.target.value)} className="max-w-44" />
            <Input placeholder="Correct word" value={corrected} onChange={(e) => setCorrected(e.target.value)} className="max-w-44" />
            <Button onClick={() => correction.mutate()} loading={correction.isPending} className="bg-orange-600">Learn</Button>
          </div>
        </Card>

        {message ? <Card>{message}</Card> : null}
        {summarize.data ? <pre className="glass p-2 text-sm whitespace-pre-wrap">{JSON.stringify(summarize.data.data, null, 2)}</pre> : null}
        {flashcards.data ? <pre className="glass p-2 text-sm whitespace-pre-wrap">{JSON.stringify(flashcards.data.data, null, 2)}</pre> : null}
      </div>
    </div>
  );
}

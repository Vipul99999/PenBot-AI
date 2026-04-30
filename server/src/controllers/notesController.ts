import { Response } from 'express';
import { z } from 'zod';
import { Note } from '../models/Note';
import { AuthRequest } from '../middleware/auth';
import { enqueueOCR } from '../queues/ocrQueue';
import { aiClient } from '../services/aiClient';

const correctionSchema = z.object({ wrong: z.string().min(1), corrected: z.string().min(1) });
const updateNoteSchema = z.object({
  extractedText: z.string().optional(),
  structuredBlocks: z
    .array(
      z.object({
        type: z.enum(['title', 'heading', 'subheading', 'paragraph', 'bullet', 'table', 'code', 'formula']),
        content: z.string(),
        confidence: z.number().min(0).max(1).optional()
      })
    )
    .optional(),
  tags: z.array(z.string()).optional(),
  summary: z.string().optional(),
  flashcards: z.array(z.object({ q: z.string(), a: z.string() })).optional()
});

export async function uploadNote(req: AuthRequest, res: Response) {
  if (!req.file) return res.status(400).json({ message: 'File required' });
  const note = await Note.create({
    userId: req.userId,
    originalFile: req.file.path,
    status: 'queued'
  });

  await enqueueOCR(note.id, req.file.path, String(req.userId));
  res.status(202).json(note);
}

export async function listNotes(req: AuthRequest, res: Response) {
  const notes = await Note.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(notes);
}

export async function getNote(req: AuthRequest, res: Response) {
  const note = await Note.findOne({ _id: req.params.id, userId: req.userId });
  if (!note) return res.status(404).json({ message: 'Not found' });
  res.json(note);
}

export async function getNoteStatus(req: AuthRequest, res: Response) {
  const note = await Note.findOne({ _id: req.params.id, userId: req.userId }).select('status');
  if (!note) return res.status(404).json({ message: 'Not found' });
  res.json({ status: note.status });
}

export async function updateNote(req: AuthRequest, res: Response) {
  const parsed = updateNoteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const note = await Note.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, parsed.data, { new: true });
  if (!note) return res.status(404).json({ message: 'Not found' });
  res.json(note);
}

export async function deleteNote(req: AuthRequest, res: Response) {
  const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!note) return res.status(404).json({ message: 'Not found' });
  res.status(204).send();
}

export async function searchNotes(req: AuthRequest, res: Response) {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ message: 'Query q is required' });
  const notes = await Note.find({ userId: req.userId, $text: { $search: q } });
  res.json(notes);
}

export async function addCorrection(req: AuthRequest, res: Response) {
  const parsed = correctionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const note = await Note.findOne({ _id: req.params.id, userId: req.userId });
  if (!note) return res.status(404).json({ message: 'Not found' });

  note.corrections.push({ ...parsed.data, createdAt: new Date() });
  await note.save();

  await aiClient.post('/ocr/learn-correction', {
    userId: req.userId,
    wrong: parsed.data.wrong,
    corrected: parsed.data.corrected
  });

  res.status(201).json({ message: 'Correction saved' });
}

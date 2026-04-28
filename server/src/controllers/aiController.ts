import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Note } from '../models/Note';
import { aiClient } from '../services/aiClient';

export async function generateSummary(req: AuthRequest, res: Response) {
  const note = await Note.findOne({ _id: req.params.id, userId: req.userId });
  if (!note) return res.status(404).json({ message: 'Not found' });

  const { data } = await aiClient.post('/nlp/summary', { text: note.extractedText });
  note.summary = data.summary;
  await note.save();
  res.json({ summary: note.summary, keyPoints: data.keyPoints });
}

export async function generateFlashcards(req: AuthRequest, res: Response) {
  const note = await Note.findOne({ _id: req.params.id, userId: req.userId });
  if (!note) return res.status(404).json({ message: 'Not found' });

  const { data } = await aiClient.post('/nlp/flashcards', { text: note.extractedText });
  note.flashcards = data.flashcards;
  await note.save();
  res.json({ flashcards: note.flashcards });
}

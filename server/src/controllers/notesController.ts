import { Response } from 'express';
import path from 'node:path';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Note } from '../models/Note';
import { AuthRequest } from '../middleware/auth';
import { enqueueOCR } from '../queues/ocrQueue';
import { aiClient } from '../services/aiClient';
import { deleteStoredFile, openStoredFileStream, saveUpload } from '../services/fileStore';
import { env } from '../config/env';

const correctionSchema = z.object({ wrong: z.string().min(1), corrected: z.string().min(1) });
const ocrModeSchema = z.enum(['fast', 'balanced', 'high_accuracy']);
const documentTemplateSchema = z.enum(['study_notes', 'lab_report', 'exam_revision', 'formula_sheet', 'qa_worksheet']);
const updateNoteSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  extractedText: z.string().optional(),
  structuredBlocks: z
    .array(
      z.object({
        type: z.enum(['title', 'heading', 'subheading', 'paragraph', 'bullet', 'numbered', 'step', 'definition', 'theorem', 'important', 'example', 'objective', 'materials', 'observation', 'result', 'conclusion', 'exam_tip', 'question', 'answer', 'table', 'code', 'formula']),
        content: z.string(),
        confidence: z.number().min(0).max(1).optional(),
        page: z.number().int().min(1).optional()
      })
    )
    .optional(),
  tags: z.array(z.string()).optional(),
  summary: z.string().optional(),
  flashcards: z.array(z.object({ q: z.string(), a: z.string() })).optional()
});

function applyCorrection(text: string, wrong: string, corrected: string) {
  if (!text) return text;
  const escaped = wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escaped, 'gi'), corrected);
}

export async function uploadNote(req: AuthRequest, res: Response) {
  if (!req.file) return res.status(400).json({ message: 'File required' });
  const userObjectId = new Types.ObjectId(String(req.userId));
  const usage = await Note.aggregate([
    { $match: { userId: userObjectId } },
    { $group: { _id: '$userId', total: { $sum: '$originalSize' } } }
  ]);
  const currentBytes = usage[0]?.total || 0;
  const maxBytes = env.maxUserStorageMb * 1024 * 1024;
  if (currentBytes + req.file.size > maxBytes) {
    return res.status(413).json({ message: `Storage limit reached. Delete old notes or increase MAX_USER_STORAGE_MB.` });
  }
  const storedFile = await saveUpload(req.file);
  let scanQuality: any = {};
  try {
    scanQuality = req.body.scanQuality ? JSON.parse(String(req.body.scanQuality)) : {};
  } catch {
    scanQuality = {};
  }
  const ocrMode = ocrModeSchema.safeParse(req.body.ocrMode).success ? req.body.ocrMode : 'balanced';
  const documentTemplate = documentTemplateSchema.safeParse(req.body.documentTemplate).success ? req.body.documentTemplate : 'study_notes';
  const maxPdfPages = Math.max(1, Math.min(100, Number(req.body.maxPdfPages || 25)));
  const note = await Note.create({
    userId: req.userId,
    title: path.parse(storedFile.filename).name || 'Untitled note',
    fileId: storedFile.fileId,
    originalFilename: storedFile.filename,
    originalMimeType: storedFile.mimetype,
    originalSize: storedFile.size,
    scanQualityScore: typeof scanQuality.score === 'number' ? scanQuality.score : undefined,
    scanQualityWarnings: Array.isArray(scanQuality.suggestions) ? scanQuality.suggestions.slice(0, 6) : [],
    ocrMode,
    documentTemplate,
    maxPdfPages,
    status: 'queued'
  });

  await enqueueOCR(note.id, String(req.userId));
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
  const note = await Note.findOne({ _id: req.params.id, userId: req.userId }).select('status ocrError');
  if (!note) return res.status(404).json({ message: 'Not found' });
  res.json({ status: note.status, ocrError: note.ocrError });
}

export async function previewOriginal(req: AuthRequest, res: Response) {
  const note = await Note.findOne({ _id: req.params.id, userId: req.userId }).select('fileId originalFile originalFilename originalMimeType originalSize');
  if (!note) return res.status(404).json({ message: 'Not found' });

  if (note.fileId) {
    res.setHeader('Content-Type', note.originalMimeType || 'application/octet-stream');
    if (note.originalSize) res.setHeader('Content-Length', String(note.originalSize));
    res.setHeader('Content-Disposition', `inline; filename="${note.originalFilename || 'upload'}"`);
    openStoredFileStream(note.fileId).on('error', () => res.status(404).end()).pipe(res);
    return;
  }

  const uploadRoot = path.resolve('uploads');
  const filePath = path.resolve(note.originalFile || '');
  const isInsideUploads = filePath === uploadRoot || filePath.startsWith(`${uploadRoot}${path.sep}`);
  if (!isInsideUploads) return res.status(403).json({ message: 'Invalid file path' });

  res.sendFile(filePath);
}

export async function retryOCR(req: AuthRequest, res: Response) {
  const note = await Note.findOne({ _id: req.params.id, userId: req.userId });
  if (!note) return res.status(404).json({ message: 'Not found' });

  note.status = 'queued';
  note.ocrError = '';
  note.extractedText = '';
  note.structuredBlocks = [];
  note.tags = [];
  note.retryCount = (note.retryCount || 0) + 1;
  await note.save();

  await enqueueOCR(note.id, String(req.userId));
  res.status(202).json(note);
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
  await deleteStoredFile(note.fileId);
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
  note.extractedText = applyCorrection(note.extractedText, parsed.data.wrong, parsed.data.corrected);
  note.structuredBlocks = note.structuredBlocks.map((block) => ({
    ...block,
    content: applyCorrection(block.content, parsed.data.wrong, parsed.data.corrected)
  }));
  await note.save();

  await aiClient.post('/ocr/learn-correction', {
    userId: req.userId,
    wrong: parsed.data.wrong,
    corrected: parsed.data.corrected
  });

  res.status(201).json({ message: 'Correction applied', note });
}

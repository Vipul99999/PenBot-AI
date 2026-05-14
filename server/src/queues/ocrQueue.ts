import FormData from 'form-data';
import { aiClient } from '../services/aiClient';
import { Note } from '../models/Note';
import { readStoredFile } from '../services/fileStore';

type OCRJob = {
  noteId: string;
  userId: string;
};

let workerRunning = false;
let workerTimer: NodeJS.Timeout | null = null;
let workerStarted = false;

function titleFromOcr(data: any, fallback: string) {
  const blocks = Array.isArray(data?.structuredBlocks) ? data.structuredBlocks : [];
  const titleBlock = blocks.find((block: any) => block?.type === 'title' && String(block?.content || '').trim());
  const firstBlock = blocks.find((block: any) => String(block?.content || '').trim());
  const candidate = String(titleBlock?.content || firstBlock?.content || '').trim();
  return candidate ? candidate.slice(0, 120) : fallback;
}

function averageConfidence(blocks: any[]) {
  const values = blocks.map((block) => Number(block?.confidence)).filter((value) => Number.isFinite(value));
  if (!values.length) return undefined;
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 100) / 100;
}

export async function enqueueOCR(noteId: string, userId: string) {
  void noteId;
  void userId;
  kickOcrWorker();
}

export async function recoverInterruptedOcrJobs() {
  await Note.updateMany(
    { status: 'processing' },
    {
      $set: { status: 'queued', ocrError: 'OCR was interrupted by a server restart and has been queued again.' },
      $unset: { processingStartedAt: 1 }
    }
  );
}

export function startOcrWorker() {
  if (workerStarted) return;
  workerStarted = true;
  workerTimer = setInterval(kickOcrWorker, 5000);
  kickOcrWorker();
}

export function stopOcrWorker() {
  if (workerTimer) clearInterval(workerTimer);
  workerTimer = null;
  workerStarted = false;
}

function kickOcrWorker() {
  if (workerRunning) return;
  workerRunning = true;
  void processNextQueuedNote()
    .catch((error) => console.error('OCR worker failed', error))
    .finally(() => {
      workerRunning = false;
    });
}

async function processNextQueuedNote() {
  const note = await Note.findOneAndUpdate(
    { status: 'queued' },
    { status: 'processing', ocrError: '', processingStartedAt: new Date() },
    { sort: { createdAt: 1 }, new: true }
  ).select('title userId fileId originalFile originalFilename originalMimeType');

  if (!note) return;
  await processNote({ noteId: note.id, userId: String(note.userId) }).catch(async (error) => {
    console.error(`OCR failed for note ${note.id}`, error);
    const message = error?.response?.data?.detail || error?.message || 'OCR failed. Try a clearer upload.';
    await Note.findByIdAndUpdate(note.id, {
      $set: {
        status: 'failed',
        ocrError: message,
        structuredBlocks: [],
        tags: []
      },
      $unset: { processingStartedAt: 1 }
    });
  });
}

async function processNote({ noteId, userId }: OCRJob) {
  const startedAt = Date.now();
  const note = await Note.findById(noteId).select('title fileId originalFile originalFilename originalMimeType ocrMode documentTemplate maxPdfPages');
  if (!note) throw new Error('Note not found');
  const storedFile = await readStoredFile(note.fileId, note.originalFile);

  const form = new FormData();
  form.append('noteId', noteId);
  form.append('userId', userId);
  form.append('ocrMode', note.ocrMode || 'balanced');
  form.append('documentTemplate', note.documentTemplate || 'study_notes');
  form.append('maxPdfPages', String(note.maxPdfPages || 25));
  form.append('file', storedFile.buffer, {
    filename: storedFile.filename,
    contentType: storedFile.mimetype
  });

  const { data } = await aiClient.post('/ocr/process', form, { headers: form.getHeaders() });

  await Note.findByIdAndUpdate(noteId, {
    $set: {
      title: titleFromOcr(data, note.title || storedFile.filename),
      extractedText: data.extractedText,
      structuredBlocks: data.structuredBlocks,
      tags: data.tags,
      ocrEngine: data.engine || 'local',
      ocrConfidence: averageConfidence(Array.isArray(data.structuredBlocks) ? data.structuredBlocks : []),
      ocrDurationMs: Date.now() - startedAt,
      status: 'done',
      ocrError: ''
    },
    $unset: { processingStartedAt: 1 }
  });
}

import fs from 'node:fs';
import { Job, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import FormData from 'form-data';
import { env } from '../config/env';
import { aiClient } from '../services/aiClient';
import { Note } from '../models/Note';

const connection = process.env.NODE_ENV === 'test' ? null : new IORedis(env.redisUrl, { maxRetriesPerRequest: null });

export const ocrQueue = connection ? new Queue('ocr-jobs', { connection }) : null;

export async function enqueueOCR(noteId: string, filePath: string, userId: string) {
  if (!ocrQueue) {
    runFallbackOCR({ noteId, filePath, userId });
    return;
  }

  try {
    await ocrQueue.add('process-note', { noteId, filePath, userId }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
  } catch {
    runFallbackOCR({ noteId, filePath, userId });
  }
}

function runFallbackOCR(payload: { noteId: string; filePath: string; userId: string }) {
  void processNote(payload).catch(async () => {
    await Note.findByIdAndUpdate(payload.noteId, { status: 'failed' });
  });
}

async function processNote({ noteId, filePath, userId }: { noteId: string; filePath: string; userId: string }) {
  await Note.findByIdAndUpdate(noteId, { status: 'processing' });

  const form = new FormData();
  form.append('noteId', noteId);
  form.append('userId', userId);
  form.append('file', fs.createReadStream(filePath));

  const { data } = await aiClient.post('/ocr/process', form, { headers: form.getHeaders() });

  await Note.findByIdAndUpdate(noteId, {
    extractedText: data.extractedText,
    structuredBlocks: data.structuredBlocks,
    tags: data.tags,
    status: 'done'
  });
}

export const ocrWorker = connection
  ? new Worker(
      'ocr-jobs',
      async (job: Job) => {
        await processNote(job.data as { noteId: string; filePath: string; userId: string });
      },
      { connection }
    )
  : null;

ocrWorker?.on('failed', async (job) => {
  if (job?.data?.noteId) {
    await Note.findByIdAndUpdate(job.data.noteId, { status: 'failed' });
  }
});

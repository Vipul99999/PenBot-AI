import { Job, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { aiClient } from '../services/aiClient';
import { Note } from '../models/Note';

const connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });

export const ocrQueue = new Queue('ocr-jobs', { connection });

export async function enqueueOCR(noteId: string, filePath: string, userId: string) {
  await ocrQueue.add('process-note', { noteId, filePath, userId }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
}

export const ocrWorker = new Worker(
  'ocr-jobs',
  async (job: Job) => {
    const { noteId, filePath, userId } = job.data as { noteId: string; filePath: string; userId: string };
    await Note.findByIdAndUpdate(noteId, { status: 'processing' });

    const { data } = await aiClient.post('/ocr/process', { filePath, noteId, userId });

    await Note.findByIdAndUpdate(noteId, {
      extractedText: data.extractedText,
      structuredBlocks: data.structuredBlocks,
      tags: data.tags,
      status: 'done'
    });
  },
  { connection }
);

ocrWorker.on('failed', async (job) => {
  if (job?.data?.noteId) {
    await Note.findByIdAndUpdate(job.data.noteId, { status: 'failed' });
  }
});

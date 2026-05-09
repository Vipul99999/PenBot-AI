import { Router } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { aiClient } from '../services/aiClient';

const router = Router();

router.get('/readiness', async (_req, res) => {
  const ai = {
    ok: false,
    url: env.aiServiceUrl,
    detail: 'AI service is unreachable',
    ocr: null as unknown
  };

  try {
    const { data } = await aiClient.get('/health', { timeout: 5000 });
    ai.ok = Boolean(data?.ok);
    ai.detail = data?.app || 'AI service responded';
    ai.ocr = data?.ocr || null;
  } catch (error: any) {
    ai.detail = error?.message || ai.detail;
  }

  const mongoReady = mongoose.connection.readyState === 1;

  res.json({
    ok: mongoReady && ai.ok,
    server: { ok: true, app: 'PenBot AI Server' },
    database: {
      ok: mongoReady,
      provider: 'MongoDB',
      storage: 'GridFS originals + note metadata',
      state: mongoose.connection.readyState
    },
    ai,
    costMode: 'Free local-first OCR. Paid/external OCR is optional and disabled unless configured.'
  });
});

export default router;

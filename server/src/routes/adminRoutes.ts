import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { Note } from '../models/Note';
import { deleteStoredFile } from '../services/fileStore';

const router = Router();
router.use(authMiddleware, adminMiddleware);

router.get('/ocr/jobs', async (_req, res) => {
  const jobs = await Note.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .select('title status ocrError ocrEngine ocrConfidence ocrDurationMs retryCount scanQualityScore scanQualityWarnings originalFilename originalSize originalMimeType createdAt processingStartedAt userId');
  res.json(jobs);
});

router.get('/ocr/stats', async (_req, res) => {
  const [byStatus, totals] = await Promise.all([
    Note.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Note.aggregate([
      {
        $group: {
          _id: null,
          totalStorage: { $sum: '$originalSize' },
          avgConfidence: { $avg: '$ocrConfidence' },
          avgDurationMs: { $avg: '$ocrDurationMs' },
          retries: { $sum: '$retryCount' }
        }
      }
    ])
  ]);

  res.json({
    byStatus: Object.fromEntries(byStatus.map((item) => [item._id, item.count])),
    totals: totals[0] || { totalStorage: 0, avgConfidence: 0, avgDurationMs: 0, retries: 0 }
  });
});

router.post('/cleanup/failed', async (req, res) => {
  const days = Math.max(1, Number(req.query.days || 30));
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const notes = await Note.find({ status: 'failed', createdAt: { $lt: cutoff } }).select('fileId');
  for (const note of notes) {
    await deleteStoredFile(note.fileId);
    await note.deleteOne();
  }
  res.json({ deleted: notes.length, olderThanDays: days });
});

export default router;

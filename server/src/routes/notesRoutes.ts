import { Router } from 'express';
import { addCorrection, deleteNote, getNote, getNoteStatus, listNotes, previewOriginal, retryOCR, searchNotes, updateNote, uploadNote } from '../controllers/notesController';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();
router.use(authMiddleware);
router.post('/upload', upload.single('file'), uploadNote);
router.get('/', listNotes);
router.get('/search', searchNotes);
router.get('/:id/original', previewOriginal);
router.get('/:id', getNote);
router.get('/:id/status', getNoteStatus);
router.post('/:id/retry-ocr', retryOCR);
router.put('/:id', updateNote);
router.post('/:id/corrections', addCorrection);
router.delete('/:id', deleteNote);

export default router;

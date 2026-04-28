import { Router } from 'express';
import { generateFlashcards, generateSummary } from '../controllers/aiController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);
router.post('/summary/:id', generateSummary);
router.post('/flashcards/:id', generateFlashcards);

export default router;

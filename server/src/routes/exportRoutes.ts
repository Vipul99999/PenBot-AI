import { Router } from 'express';
import { exportDocx, exportMarkdown, exportPdf, exportTxt } from '../controllers/exportController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);
router.get('/pdf/:id', exportPdf);
router.get('/docx/:id', exportDocx);
router.get('/markdown/:id', exportMarkdown);
router.get('/txt/:id', exportTxt);

export default router;

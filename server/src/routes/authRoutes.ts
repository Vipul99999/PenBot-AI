import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { deleteAccount, deleteMyData, forgotPassword, login, logout, me, register, resetPassword, updateSettings } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
const resetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', resetLimiter, forgotPassword);
router.post('/reset-password', resetLimiter, resetPassword);
router.post('/logout', logout);
router.get('/me', authMiddleware, me);
router.put('/settings', authMiddleware, updateSettings);
router.delete('/data', authMiddleware, deleteMyData);
router.delete('/account', authMiddleware, deleteAccount);

export default router;

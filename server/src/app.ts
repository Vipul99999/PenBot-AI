import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes';
import notesRoutes from './routes/notesRoutes';
import aiRoutes from './routes/aiRoutes';
import exportRoutes from './routes/exportRoutes';
import { errorMiddleware } from './middleware/error';
import { env } from './config/env';

export const app = express();
app.use(helmet());
app.use(cors({ origin: env.clientUrl }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.get('/health', (_req, res) => res.json({ ok: true, app: 'PenBot AI Server' }));
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/export', exportRoutes);

app.use(errorMiddleware);

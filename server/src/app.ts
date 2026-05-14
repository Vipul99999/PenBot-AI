import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes';
import notesRoutes from './routes/notesRoutes';
import aiRoutes from './routes/aiRoutes';
import exportRoutes from './routes/exportRoutes';
import systemRoutes from './routes/systemRoutes';
import adminRoutes from './routes/adminRoutes';
import { errorMiddleware } from './middleware/error';
import { env } from './config/env';

export const app = express();
app.set('trust proxy', env.trustProxy);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.clientUrls.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true
}));
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && !env.clientUrls.includes(origin)) {
    return res.status(403).json({ message: 'Request origin is not allowed.' });
  }
  return next();
});
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.get('/health', (_req, res) => res.json({ ok: true, app: 'PenBot AI Server' }));
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorMiddleware);

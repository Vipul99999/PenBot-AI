import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: 'user' | 'admin';
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  const [scheme, headerToken] = authHeader.split(' ');
  const token = scheme === 'Bearer' ? headerToken : req.cookies?.penbot_token;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, env.jwtSecret) as { id: string; role?: 'user' | 'admin' };
    if (!payload.id) return res.status(401).json({ message: 'Invalid token' });
    req.userId = payload.id;
    req.userRole = payload.role || 'user';
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
}

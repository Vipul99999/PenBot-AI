import { NextFunction, Request, Response } from 'express';
import multer from 'multer';

export function errorMiddleware(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ message: err.message });
  }
  if (err.message === 'Invalid file type') {
    return res.status(400).json({ message: 'Only JPG, PNG, and PDF uploads are supported.' });
  }
  if (err.message === 'Origin is not allowed by CORS') {
    return res.status(403).json({ message: 'Request origin is not allowed.' });
  }
  res.status(500).json({ message: 'Internal server error' });
}

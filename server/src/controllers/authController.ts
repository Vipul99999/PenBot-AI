import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { z } from 'zod';
import { User } from '../models/User';
import { env } from '../config/env';
import { AuthRequest } from '../middleware/auth';

const registerSchema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(6) });
const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string().min(20), password: z.string().min(6) });

function issueToken(userId: string) {
  return jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: '7d' });
}

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const existing = await User.findOne({ email: parsed.data.email });
  if (existing) return res.status(409).json({ message: 'Email already exists' });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await User.create({ ...parsed.data, passwordHash });
  const token = issueToken(user.id);

  return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = issueToken(user.id);
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
}

export async function me(req: AuthRequest, res: Response) {
  const user = await User.findById(req.userId).select('-passwordHash -resetTokenHash -resetTokenExpiresAt');
  return res.json(user);
}

export async function forgotPassword(req: Request, res: Response) {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const user = await User.findOne({ email: parsed.data.email });
  if (!user) return res.json({ message: 'If the email exists, a reset link has been generated.' });

  const rawToken = crypto.randomBytes(24).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.resetTokenHash = resetTokenHash;
  user.resetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 20);
  await user.save();

  return res.json({
    message: 'Password reset token generated. Integrate email provider in production.',
    resetToken: rawToken
  });
}

export async function resetPassword(req: Request, res: Response) {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const tokenHash = crypto.createHash('sha256').update(parsed.data.token).digest('hex');
  const user = await User.findOne({
    resetTokenHash: tokenHash,
    resetTokenExpiresAt: { $gt: new Date() }
  });

  if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

  user.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  user.resetTokenHash = undefined;
  user.resetTokenExpiresAt = undefined;
  await user.save();

  return res.json({ message: 'Password reset successful' });
}

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { z } from 'zod';
import { User } from '../models/User';
import { env } from '../config/env';
import { AuthRequest } from '../middleware/auth';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password is too long.')
  .regex(/[A-Z]/, 'Password needs at least one uppercase letter.')
  .regex(/[a-z]/, 'Password needs at least one lowercase letter.')
  .regex(/[0-9]/, 'Password needs at least one number.');
const emailSchema = z.string().trim().toLowerCase().email();
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  password: passwordSchema
});
const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
const forgotSchema = z.object({ email: emailSchema });
const resetSchema = z.object({ token: z.string().min(20), password: passwordSchema });
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MS = 1000 * 60 * 15;

function issueToken(userId: string) {
  return jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: '7d' });
}

function publicUser(user: any) {
  return { id: user.id, name: user.name, email: user.email };
}

function fieldMessage(error: z.ZodError) {
  return error.issues[0]?.message || 'Check your details and try again.';
}

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: fieldMessage(parsed.error), fields: parsed.error.flatten().fieldErrors });

  const existing = await User.findOne({ email: parsed.data.email });
  if (existing) return res.status(409).json({ message: 'Email already exists' });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await User.create({ name: parsed.data.name, email: parsed.data.email, passwordHash });
  const token = issueToken(user.id);

  return res.status(201).json({ token, user: publicUser(user) });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter a valid email and password.' });

  const { email, password } = parsed.data;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(423).json({ message: 'Account temporarily locked. Try again in 15 minutes.' });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCK_MS);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();
  const token = issueToken(user.id);
  return res.json({ token, user: publicUser(user) });
}

export async function me(req: AuthRequest, res: Response) {
  const user = await User.findById(req.userId).select('name email createdAt lastLoginAt');
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json(user);
}

export async function forgotPassword(req: Request, res: Response) {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Enter a valid email address.' });

  const user = await User.findOne({ email: parsed.data.email });
  if (!user) return res.json({ message: 'If the email exists, a reset link has been generated.' });

  const rawToken = crypto.randomBytes(24).toString('hex');
  const resetTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.resetTokenHash = resetTokenHash;
  user.resetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 20);
  await user.save();

  const response: Record<string, string> = { message: 'If the email exists, a reset link has been generated.' };
  if (env.nodeEnv !== 'production') response.resetToken = rawToken;
  return res.json(response);
}

export async function resetPassword(req: Request, res: Response) {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: fieldMessage(parsed.error), fields: parsed.error.flatten().fieldErrors });

  const tokenHash = crypto.createHash('sha256').update(parsed.data.token).digest('hex');
  const user = await User.findOne({
    resetTokenHash: tokenHash,
    resetTokenExpiresAt: { $gt: new Date() }
  });

  if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

  user.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  user.resetTokenHash = undefined;
  user.resetTokenExpiresAt = undefined;
  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  await user.save();

  return res.json({ message: 'Password reset successful' });
}

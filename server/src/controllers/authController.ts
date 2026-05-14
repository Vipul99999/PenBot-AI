import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { z } from 'zod';
import { User } from '../models/User';
import { Note } from '../models/Note';
import { env } from '../config/env';
import { AuthRequest } from '../middleware/auth';
import { sendPasswordResetEmail } from '../services/emailService';
import { deleteStoredFile } from '../services/fileStore';

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
const settingsSchema = z.object({
  defaultExportFormat: z.enum(['pdf', 'docx', 'markdown', 'txt']).optional(),
  ocrMode: z.enum(['fast', 'balanced', 'high_accuracy']).optional(),
  documentTemplate: z.enum(['study_notes', 'lab_report', 'exam_revision', 'formula_sheet', 'qa_worksheet']).optional(),
  maxPdfPages: z.number().int().min(1).max(100).optional()
});
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MS = 1000 * 60 * 15;

function issueToken(userId: string, role: 'user' | 'admin') {
  return jwt.sign({ id: userId, role }, env.jwtSecret, { expiresIn: '7d' });
}

function publicUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'user',
    settings: {
      defaultExportFormat: user.defaultExportFormat || 'pdf',
      ocrMode: user.ocrMode || 'balanced',
      documentTemplate: user.documentTemplate || 'study_notes',
      maxPdfPages: user.maxPdfPages || 25
    }
  };
}

function authResponse(token: string, user: any) {
  const response: Record<string, any> = { user: publicUser(user) };
  if (env.nodeEnv !== 'production') response.token = token;
  return response;
}

function fieldMessage(error: z.ZodError) {
  return error.issues[0]?.message || 'Check your details and try again.';
}

function setAuthCookie(res: Response, token: string) {
  res.cookie('penbot_token', token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSecure ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  });
}

function clearAuthCookie(res: Response) {
  res.clearCookie('penbot_token', {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSecure ? 'none' : 'lax'
  });
}

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: fieldMessage(parsed.error), fields: parsed.error.flatten().fieldErrors });

  const existing = await User.findOne({ email: parsed.data.email });
  if (existing) return res.status(409).json({ message: 'Email already exists' });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const role = env.adminEmails.includes(parsed.data.email) ? 'admin' : 'user';
  const user = await User.create({ name: parsed.data.name, email: parsed.data.email, passwordHash, role });
  const token = issueToken(user.id, user.role);
  setAuthCookie(res, token);

  return res.status(201).json(authResponse(token, user));
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
  if (env.adminEmails.includes(user.email) && user.role !== 'admin') {
    user.role = 'admin';
    await user.save();
  }
  const token = issueToken(user.id, user.role);
  setAuthCookie(res, token);
  return res.json(authResponse(token, user));
}

export async function me(req: AuthRequest, res: Response) {
  const user = await User.findById(req.userId).select('name email role defaultExportFormat ocrMode documentTemplate maxPdfPages createdAt lastLoginAt');
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json(publicUser(user));
}

export async function updateSettings(req: AuthRequest, res: Response) {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: fieldMessage(parsed.error), fields: parsed.error.flatten().fieldErrors });
  const user = await User.findByIdAndUpdate(req.userId, parsed.data, { new: true }).select('name email role defaultExportFormat ocrMode documentTemplate maxPdfPages');
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json(publicUser(user));
}

async function removeUserNotes(userId?: string) {
  const notes = await Note.find({ userId }).select('fileId');
  for (const note of notes) await deleteStoredFile(note.fileId);
  await Note.deleteMany({ userId });
  return notes.length;
}

export async function deleteMyData(req: AuthRequest, res: Response) {
  const deletedNotes = await removeUserNotes(req.userId);
  return res.json({ deletedNotes });
}

export async function deleteAccount(req: AuthRequest, res: Response) {
  const deletedNotes = await removeUserNotes(req.userId);
  await User.findByIdAndDelete(req.userId);
  clearAuthCookie(res);
  return res.json({ deletedNotes, message: 'Account deleted' });
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
  await sendPasswordResetEmail(user.email, rawToken);

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

export async function logout(_req: Request, res: Response) {
  clearAuthCookie(res);
  return res.json({ message: 'Logged out' });
}

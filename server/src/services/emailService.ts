import nodemailer from 'nodemailer';
import { env } from '../config/env';

export function emailConfigured() {
  return Boolean(env.smtpHost && env.smtpUser && env.smtpPass);
}

export async function sendPasswordResetEmail(email: string, token: string) {
  if (!emailConfigured()) return false;

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: { user: env.smtpUser, pass: env.smtpPass }
  });

  const resetUrl = `${env.clientUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
  await transporter.sendMail({
    from: env.smtpFrom,
    to: email,
    subject: 'Reset your PenBot AI password',
    text: `Reset your PenBot AI password: ${resetUrl}\n\nThis link expires in 20 minutes.`,
    html: `<p>Reset your PenBot AI password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 20 minutes.</p>`
  });
  return true;
}

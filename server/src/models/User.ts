import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  resetTokenHash?: string;
  resetTokenExpiresAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  role: 'user' | 'admin';
  defaultExportFormat: 'pdf' | 'docx' | 'markdown' | 'txt';
  ocrMode: 'fast' | 'balanced' | 'high_accuracy';
  documentTemplate: 'study_notes' | 'lab_report' | 'exam_revision' | 'formula_sheet' | 'qa_worksheet';
  maxPdfPages: number;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    resetTokenHash: { type: String },
    resetTokenExpiresAt: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    lastLoginAt: { type: Date },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    defaultExportFormat: { type: String, enum: ['pdf', 'docx', 'markdown', 'txt'], default: 'pdf' },
    ocrMode: { type: String, enum: ['fast', 'balanced', 'high_accuracy'], default: 'balanced' },
    documentTemplate: { type: String, enum: ['study_notes', 'lab_report', 'exam_revision', 'formula_sheet', 'qa_worksheet'], default: 'study_notes' },
    maxPdfPages: { type: Number, default: 25, min: 1, max: 100 }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const User = mongoose.model<IUser>('User', userSchema);

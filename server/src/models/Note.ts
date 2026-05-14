import mongoose, { Document, Schema, Types } from 'mongoose';

interface Block {
  type:
    | 'title'
    | 'heading'
    | 'subheading'
    | 'paragraph'
    | 'bullet'
    | 'numbered'
    | 'step'
    | 'definition'
    | 'theorem'
    | 'important'
    | 'example'
    | 'objective'
    | 'materials'
    | 'observation'
    | 'result'
    | 'conclusion'
    | 'exam_tip'
    | 'question'
    | 'answer'
    | 'table'
    | 'code'
    | 'formula';
  content: string;
  confidence?: number;
  page?: number;
}

interface Flashcard {
  q: string;
  a: string;
}

interface Correction {
  wrong: string;
  corrected: string;
  createdAt: Date;
}

export interface INote extends Document {
  userId: Types.ObjectId;
  title: string;
  originalFile?: string;
  fileId?: Types.ObjectId;
  originalFilename?: string;
  originalMimeType?: string;
  originalSize?: number;
  extractedText: string;
  structuredBlocks: Block[];
  summary: string;
  flashcards: Flashcard[];
  tags: string[];
  corrections: Correction[];
  status: 'queued' | 'processing' | 'done' | 'failed';
  ocrError?: string;
  processingStartedAt?: Date;
  ocrEngine?: string;
  ocrConfidence?: number;
  ocrDurationMs?: number;
  scanQualityScore?: number;
  scanQualityWarnings: string[];
  retryCount: number;
  ocrMode?: 'fast' | 'balanced' | 'high_accuracy';
  documentTemplate?: 'study_notes' | 'lab_report' | 'exam_revision' | 'formula_sheet' | 'qa_worksheet';
  maxPdfPages?: number;
  createdAt: Date;
}

const noteSchema = new Schema<INote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'Untitled note', trim: true },
    originalFile: { type: String },
    fileId: { type: Schema.Types.ObjectId },
    originalFilename: { type: String },
    originalMimeType: { type: String },
    originalSize: { type: Number },
    extractedText: { type: String, default: '' },
    structuredBlocks: [
      {
        type: {
          type: String,
          enum: ['title', 'heading', 'subheading', 'paragraph', 'bullet', 'numbered', 'step', 'definition', 'theorem', 'important', 'example', 'objective', 'materials', 'observation', 'result', 'conclusion', 'exam_tip', 'question', 'answer', 'table', 'code', 'formula'],
          required: true
        },
        content: { type: String, required: true },
        confidence: { type: Number },
        page: { type: Number, default: 1 }
      }
    ],
    summary: { type: String, default: '' },
    flashcards: [{ q: String, a: String }],
    tags: [{ type: String }],
    corrections: [{ wrong: String, corrected: String, createdAt: { type: Date, default: Date.now } }],
    status: { type: String, enum: ['queued', 'processing', 'done', 'failed'], default: 'queued' },
    ocrError: { type: String, default: '' },
    processingStartedAt: { type: Date },
    ocrEngine: { type: String },
    ocrConfidence: { type: Number },
    ocrDurationMs: { type: Number },
    scanQualityScore: { type: Number },
    scanQualityWarnings: [{ type: String }],
    retryCount: { type: Number, default: 0 },
    ocrMode: { type: String, enum: ['fast', 'balanced', 'high_accuracy'], default: 'balanced' },
    documentTemplate: { type: String, enum: ['study_notes', 'lab_report', 'exam_revision', 'formula_sheet', 'qa_worksheet'], default: 'study_notes' },
    maxPdfPages: { type: Number, default: 25 }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

noteSchema.index({ userId: 1, createdAt: -1 });
noteSchema.index({ title: 'text', extractedText: 'text', tags: 'text' });

export const Note = mongoose.model<INote>('Note', noteSchema);

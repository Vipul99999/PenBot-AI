import mongoose, { Document, Schema } from 'mongoose';

interface Block {
  type: 'title' | 'heading' | 'subheading' | 'paragraph' | 'bullet' | 'table' | 'code' | 'formula';
  content: string;
  confidence?: number;
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
  userId: string;
  originalFile: string;
  extractedText: string;
  structuredBlocks: Block[];
  summary: string;
  flashcards: Flashcard[];
  tags: string[];
  corrections: Correction[];
  status: 'queued' | 'processing' | 'done' | 'failed';
  createdAt: Date;
}

const noteSchema = new Schema<INote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalFile: { type: String, required: true },
    extractedText: { type: String, default: '' },
    structuredBlocks: [
      {
        type: {
          type: String,
          enum: ['title', 'heading', 'subheading', 'paragraph', 'bullet', 'table', 'code', 'formula'],
          required: true
        },
        content: { type: String, required: true },
        confidence: { type: Number }
      }
    ],
    summary: { type: String, default: '' },
    flashcards: [{ q: String, a: String }],
    tags: [{ type: String }],
    corrections: [{ wrong: String, corrected: String, createdAt: { type: Date, default: Date.now } }],
    status: { type: String, enum: ['queued', 'processing', 'done', 'failed'], default: 'queued' }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

noteSchema.index({ userId: 1, createdAt: -1 });
noteSchema.index({ extractedText: 'text', tags: 'text' });

export const Note = mongoose.model<INote>('Note', noteSchema);

import FormData from 'form-data';
import { aiClient } from '../services/aiClient';
import { Note } from '../models/Note';
import { readStoredFile } from '../services/fileStore';

type OCRJob = {
  noteId: string;
  userId: string;
};

export async function enqueueOCR(noteId: string, userId: string) {
  runOCRInBackground({ noteId, userId });
}

function runOCRInBackground(payload: OCRJob) {
  void processNote(payload).catch(async (error) => {
    console.error(`OCR failed for note ${payload.noteId}`, error);
    const message = error?.response?.data?.detail || error?.message || 'OCR failed. Try a clearer upload.';
    await Note.findByIdAndUpdate(payload.noteId, {
      status: 'failed',
      ocrError: message,
      structuredBlocks: [],
      tags: []
    });
  });
}

async function processNote({ noteId, userId }: OCRJob) {
  await Note.findByIdAndUpdate(noteId, { status: 'processing', ocrError: '' });
  const note = await Note.findById(noteId).select('fileId originalFile originalFilename originalMimeType');
  if (!note) throw new Error('Note not found');
  const storedFile = await readStoredFile(note.fileId, note.originalFile);

  const form = new FormData();
  form.append('noteId', noteId);
  form.append('userId', userId);
  form.append('file', storedFile.buffer, {
    filename: storedFile.filename,
    contentType: storedFile.mimetype
  });

  const { data } = await aiClient.post('/ocr/process', form, { headers: form.getHeaders() });

  await Note.findByIdAndUpdate(noteId, {
    extractedText: data.extractedText,
    structuredBlocks: data.structuredBlocks,
    tags: data.tags,
    status: 'done',
    ocrError: ''
  });
}

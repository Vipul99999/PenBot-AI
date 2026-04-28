import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph } from 'docx';
import { AuthRequest } from '../middleware/auth';
import { Note } from '../models/Note';

async function getOwnedNote(req: AuthRequest) {
  return Note.findOne({ _id: req.params.id, userId: req.userId });
}

export async function exportPdf(req: AuthRequest, res: Response) {
  const note = await getOwnedNote(req);
  if (!note) return res.status(404).json({ message: 'Not found' });

  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=note-${note.id}.pdf`);
  doc.pipe(res);
  doc.fontSize(14).text(note.extractedText || 'No extracted text');
  doc.end();
}

export async function exportDocx(req: AuthRequest, res: Response) {
  const note = await getOwnedNote(req);
  if (!note) return res.status(404).json({ message: 'Not found' });

  const doc = new Document({ sections: [{ properties: {}, children: [new Paragraph(note.extractedText || 'No extracted text')] }] });
  const buffer = await Packer.toBuffer(doc);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename=note-${note.id}.docx`);
  res.send(buffer);
}

export async function exportMarkdown(req: AuthRequest, res: Response) {
  const note = await getOwnedNote(req);
  if (!note) return res.status(404).json({ message: 'Not found' });
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename=note-${note.id}.md`);
  res.send(`# PenBot AI Note\n\n${note.extractedText || ''}`);
}

export async function exportTxt(req: AuthRequest, res: Response) {
  const note = await getOwnedNote(req);
  if (!note) return res.status(404).json({ message: 'Not found' });
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename=note-${note.id}.txt`);
  res.send(note.extractedText || '');
}

import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph } from 'docx';
import { AuthRequest } from '../middleware/auth';
import { Note } from '../models/Note';

async function getOwnedNote(req: AuthRequest) {
  return Note.findOne({ _id: req.params.id, userId: req.userId });
}

function noteText(note: Awaited<ReturnType<typeof getOwnedNote>>) {
  const html = note?.extractedText || 'No extracted text';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h[1-6]|li|div)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function exportPdf(req: AuthRequest, res: Response) {
  const note = await getOwnedNote(req);
  if (!note) return res.status(404).json({ message: 'Not found' });

  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=note-${note.id}.pdf`);
  doc.pipe(res);
  doc.fontSize(18).text('PenBot AI Note', { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(noteText(note));
  doc.end();
}

export async function exportDocx(req: AuthRequest, res: Response) {
  const note = await getOwnedNote(req);
  if (!note) return res.status(404).json({ message: 'Not found' });

  const doc = new Document({ sections: [{ properties: {}, children: noteText(note).split('\n').map((line) => new Paragraph(line)) }] });
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
  res.send(`# PenBot AI Note\n\n${noteText(note)}\n`);
}

export async function exportTxt(req: AuthRequest, res: Response) {
  const note = await getOwnedNote(req);
  if (!note) return res.status(404).json({ message: 'Not found' });
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename=note-${note.id}.txt`);
  res.send(noteText(note));
}

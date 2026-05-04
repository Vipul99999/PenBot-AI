import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import { AuthRequest } from '../middleware/auth';
import { Note } from '../models/Note';

type ExportBlock = {
  type: string;
  content: string;
  confidence?: number;
  page?: number;
};

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

function blocksFromNote(note: NonNullable<Awaited<ReturnType<typeof getOwnedNote>>>): ExportBlock[] {
  if (note.structuredBlocks?.length) return note.structuredBlocks;
  return noteText(note)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((content, index) => ({ type: index === 0 ? 'title' : 'paragraph', content, confidence: 0.9, page: 1 }));
}

function pagesFromBlocks(note: NonNullable<Awaited<ReturnType<typeof getOwnedNote>>>) {
  const pages = new Map<number, ExportBlock[]>();
  blocksFromNote(note).forEach((block) => {
    const page = Math.max(1, Number(block.page || 1));
    const items = pages.get(page) || [];
    items.push(block);
    pages.set(page, items);
  });
  return [...pages.entries()].sort(([a], [b]) => a - b);
}

function markdownForBlock(block: ReturnType<typeof blocksFromNote>[number]) {
  if (block.type === 'title') return `# ${block.content}`;
  if (block.type === 'heading') return `## ${block.content}`;
  if (block.type === 'subheading') return `### ${block.content}`;
  if (block.type === 'bullet') return `- ${block.content}`;
  if (block.type === 'definition') return `> **Definition:** ${block.content}`;
  if (block.type === 'question') return `**Q:** ${block.content}`;
  if (block.type === 'answer') return `**A:** ${block.content}`;
  if (block.type === 'formula') return `\`${block.content}\``;
  if (block.type === 'code') return `\`\`\`\n${block.content}\n\`\`\``;
  return block.content;
}

function markdownFromBlocks(note: NonNullable<Awaited<ReturnType<typeof getOwnedNote>>>) {
  const pages = pagesFromBlocks(note);
  return pages
    .map(([page, blocks]) => {
      const pageHeading = pages.length > 1 ? `<!-- Page ${page} -->\n\n` : '';
      return pageHeading + blocks.map(markdownForBlock).join('\n\n');
    })
    .join('\n\n');
}

function drawPdfBlock(doc: PDFKit.PDFDocument, block: ReturnType<typeof blocksFromNote>[number]) {
  if (block.type === 'title') {
    doc.moveDown(0.4).fontSize(22).fillColor('#2f174f').text(block.content, { align: 'center' });
    doc.moveDown(0.3).strokeColor('#d9c8ff').moveTo(72, doc.y).lineTo(540, doc.y).stroke().moveDown(0.8);
    return;
  }
  if (block.type === 'heading' || block.type === 'subheading') {
    doc.moveDown(0.6).fontSize(block.type === 'heading' ? 16 : 13).fillColor('#7c3aed').text(block.content);
    doc.moveDown(0.2);
    return;
  }
  if (block.type === 'bullet') {
    doc.fontSize(11).fillColor('#20172f').text(`- ${block.content}`, { indent: 16, lineGap: 4 });
    return;
  }
  if (block.type === 'definition') {
    doc.moveDown(0.3).roundedRect(72, doc.y, 468, 42, 6).fillAndStroke('#fff7cc', '#ead36e');
    doc.fillColor('#2f174f').fontSize(10).text('Definition', 84, doc.y - 33);
    doc.fillColor('#20172f').fontSize(11).text(block.content, 84, doc.y + 2, { width: 440 });
    doc.moveDown(1.4);
    return;
  }
  if (block.type === 'question' || block.type === 'answer') {
    doc.fontSize(11).fillColor(block.type === 'question' ? '#7c3aed' : '#20172f').text(`${block.type === 'question' ? 'Q' : 'A'}: ${block.content}`, { lineGap: 4 });
    return;
  }
  if (block.type === 'formula') {
    doc.moveDown(0.2).fontSize(12).fillColor('#111827').text(block.content, { align: 'center' }).moveDown(0.2);
    return;
  }
  if (block.type === 'code') {
    doc.font('Courier').fontSize(10).fillColor('#111827').text(block.content, { lineGap: 3 });
    doc.font('Helvetica');
    return;
  }
  doc.fontSize(11).fillColor('#20172f').text(block.content, { lineGap: 5 });
}

function docxParagraphForBlock(block: ReturnType<typeof blocksFromNote>[number]) {
  if (block.type === 'title') {
    return new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: block.content, bold: true, color: '2F174F' })]
    });
  }
  if (block.type === 'heading' || block.type === 'subheading') {
    return new Paragraph({
      heading: block.type === 'heading' ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
      spacing: { before: 220, after: 120 },
      children: [new TextRun({ text: block.content, bold: true, color: '7C3AED' })]
    });
  }
  if (block.type === 'bullet') return new Paragraph({ bullet: { level: 0 }, children: [new TextRun(block.content)] });
  if (block.type === 'definition') {
    return new Paragraph({
      spacing: { before: 120, after: 120 },
      children: [new TextRun({ text: 'Definition: ', bold: true, color: '7C3AED' }), new TextRun(block.content)]
    });
  }
  if (block.type === 'question') return new Paragraph({ children: [new TextRun({ text: 'Q: ', bold: true, color: '7C3AED' }), new TextRun({ text: block.content, bold: true })] });
  if (block.type === 'answer') return new Paragraph({ children: [new TextRun({ text: 'A: ', bold: true }), new TextRun(block.content)] });
  if (block.type === 'formula' || block.type === 'code') {
    return new Paragraph({ alignment: block.type === 'formula' ? AlignmentType.CENTER : AlignmentType.LEFT, children: [new TextRun({ text: block.content, font: 'Courier New' })] });
  }
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun(block.content)] });
}

export async function exportPdf(req: AuthRequest, res: Response) {
  const note = await getOwnedNote(req);
  if (!note) return res.status(404).json({ message: 'Not found' });

  const doc = new PDFDocument({ margin: 72, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=note-${note.id}.pdf`);
  doc.pipe(res);
  pagesFromBlocks(note).forEach(([page, blocks], pageIndex) => {
    if (pageIndex > 0) doc.addPage();
    doc.fontSize(9).fillColor('#7c3aed').text('PenBot AI converted notebook', { align: 'right' });
    doc.fontSize(9).fillColor('#6b6475').text(`Page ${page}`, { align: 'right' });
    blocks.forEach((block) => drawPdfBlock(doc, block));
  });
  doc.end();
}

export async function exportDocx(req: AuthRequest, res: Response) {
  const note = await getOwnedNote(req);
  if (!note) return res.status(404).json({ message: 'Not found' });

  const doc = new Document({
    sections: pagesFromBlocks(note).map(([page, blocks]) => ({
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: `PenBot AI converted notebook - Page ${page}`, color: '7C3AED', bold: true, size: 18 })]
        }),
        ...blocks.map(docxParagraphForBlock)
      ]
    }))
  });
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
  res.send(`${markdownFromBlocks(note)}\n`);
}

export async function exportTxt(req: AuthRequest, res: Response) {
  const note = await getOwnedNote(req);
  if (!note) return res.status(404).json({ message: 'Not found' });
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename=note-${note.id}.txt`);
  res.send(pagesFromBlocks(note).map(([page, blocks]) => `Page ${page}\n${blocks.map((block) => block.content).join('\n')}`).join('\n\n'));
}

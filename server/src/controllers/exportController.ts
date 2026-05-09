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

function safeFilename(value: string) {
  return (value || 'note')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80)
    .toLowerCase() || 'note';
}

function parseTableRows(content: string) {
  return content
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const delimiter = row.includes('|') || row.includes('\t') || /\s{2,}/.test(row) ? /\s*\|\s*|\t|\s{2,}/ : /\s+/;
      return row.split(delimiter).map((cell) => cell.trim()).filter(Boolean);
    })
    .filter((row) => row.length > 1);
}

function markdownForBlock(block: ReturnType<typeof blocksFromNote>[number]) {
  if (block.type === 'title') return `# ${block.content}`;
  if (block.type === 'heading') return `## ${block.content}`;
  if (block.type === 'subheading') return `### ${block.content}`;
  if (block.type === 'bullet') return `- ${block.content}`;
  if (block.type === 'numbered') return `1. ${block.content}`;
  if (block.type === 'step') return `**Step:** ${block.content}`;
  if (block.type === 'definition') return `> **Definition:** ${block.content}`;
  if (block.type === 'theorem') return `> **Theorem / Rule:** ${block.content}`;
  if (block.type === 'important') return `> **Important:** ${block.content}`;
  if (block.type === 'example') return `> **Example:** ${block.content}`;
  if (block.type === 'objective') return `> **Objective:** ${block.content}`;
  if (block.type === 'materials') return `> **Materials / Apparatus:** ${block.content}`;
  if (block.type === 'observation') return `> **Observation:** ${block.content}`;
  if (block.type === 'result') return `> **Result:** ${block.content}`;
  if (block.type === 'conclusion') return `> **Conclusion:** ${block.content}`;
  if (block.type === 'exam_tip') return `> **Exam tip:** ${block.content}`;
  if (block.type === 'question') return `**Q:** ${block.content}`;
  if (block.type === 'answer') return `**A:** ${block.content}`;
  if (block.type === 'table') return block.content;
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

function ensurePdfSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > doc.page.height - 72) doc.addPage();
}

function drawPdfHeader(doc: PDFKit.PDFDocument, noteTitle: string, page: number) {
  doc.save();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#ffffff');
  doc.rect(0, 0, doc.page.width, 54).fill('#f7f4ea');
  doc.fillColor('#0f766e').font('Helvetica-Bold').fontSize(8).text('PENBOT AI CONVERTED DOCUMENT', 54, 18, { continued: false });
  doc.fillColor('#18212f').fontSize(10).text(noteTitle, 54, 31, { width: 360, ellipsis: true });
  doc.roundedRect(486, 18, 54, 20, 4).strokeColor('#99d2ca').stroke();
  doc.fillColor('#0f766e').fontSize(8).text(`PAGE ${page}`, 498, 24);
  doc.strokeColor('#d9e7e3').moveTo(54, 54).lineTo(540, 54).stroke();
  doc.restore();
  doc.y = 82;
}

function drawPdfFooter(doc: PDFKit.PDFDocument) {
  doc.save();
  doc.strokeColor('#d9e7e3').moveTo(54, 762).lineTo(540, 762).stroke();
  doc.fillColor('#8a948f').font('Helvetica-Bold').fontSize(7).text('Edited and exported with PenBot AI', 54, 772);
  doc.restore();
}

function drawPdfBlock(doc: PDFKit.PDFDocument, block: ReturnType<typeof blocksFromNote>[number]) {
  if (block.type === 'title') {
    ensurePdfSpace(doc, 76);
    doc.moveDown(0.2).font('Helvetica-Bold').fontSize(22).fillColor('#18212f').text(block.content, 72, doc.y, { align: 'center', width: 450 });
    doc.moveDown(0.4).strokeColor('#99d2ca').lineWidth(1.5).moveTo(120, doc.y).lineTo(492, doc.y).stroke().moveDown(0.8);
    return;
  }
  if (block.type === 'heading' || block.type === 'subheading') {
    const height = doc.heightOfString(block.content, { width: 420 }) + 18;
    ensurePdfSpace(doc, height + 12);
    if (block.type === 'heading') {
      doc.roundedRect(72, doc.y, 468, height, 5).fill('#e8f2ef');
      doc.fillColor('#0f766e').rect(72, doc.y, 4, height).fill();
      doc.fillColor('#18212f').font('Helvetica-Bold').fontSize(15).text(block.content, 88, doc.y + 9, { width: 430 });
      doc.y += height + 8;
    } else {
      doc.moveDown(0.4).font('Helvetica-Bold').fontSize(12).fillColor('#0f766e').text(block.content, 72, doc.y, { width: 468 }).moveDown(0.2);
    }
    return;
  }
  if (block.type === 'bullet') {
    const height = Math.max(28, doc.heightOfString(block.content, { width: 420 }) + 12);
    ensurePdfSpace(doc, height);
    doc.roundedRect(82, doc.y, 458, height, 4).fill('#f1f8f6');
    doc.circle(96, doc.y + 15, 3).fill('#0f766e');
    doc.fillColor('#18212f').font('Helvetica').fontSize(10.5).text(block.content, 108, doc.y + 8, { width: 410, lineGap: 4 });
    doc.y += height + 5;
    return;
  }
  if (block.type === 'numbered' || block.type === 'step') {
    const label = block.type === 'step' ? 'STEP' : 'ITEM';
    const height = Math.max(40, doc.heightOfString(block.content, { width: 392 }) + 18);
    ensurePdfSpace(doc, height + 7);
    doc.roundedRect(72, doc.y, 468, height, 6).fillAndStroke('#f1f8f6', '#99d2ca');
    doc.fillColor('#0f766e').font('Helvetica-Bold').fontSize(8).text(label, 88, doc.y + 12);
    doc.fillColor('#18212f').font('Helvetica-Bold').fontSize(10.5).text(block.content, 126, doc.y + 10, { width: 380, lineGap: 4 });
    doc.y += height + 7;
    return;
  }
  if (['definition', 'theorem', 'important', 'example', 'objective', 'materials', 'observation', 'result', 'conclusion', 'exam_tip'].includes(block.type)) {
    const labels: Record<string, string> = {
      definition: 'DEFINITION',
      theorem: 'THEOREM / RULE',
      important: 'IMPORTANT',
      example: 'EXAMPLE',
      objective: 'OBJECTIVE',
      materials: 'MATERIALS / APPARATUS',
      observation: 'OBSERVATION',
      result: 'RESULT',
      conclusion: 'CONCLUSION',
      exam_tip: 'EXAM TIP'
    };
    const fills: Record<string, string> = {
      definition: '#fff7d6',
      theorem: '#eef2ff',
      important: '#fef2f2',
      example: '#ecfdf5',
      objective: '#eff6ff',
      materials: '#f8fafc',
      observation: '#ecfeff',
      result: '#f5f3ff',
      conclusion: '#e8f2ef',
      exam_tip: '#fff7ed'
    };
    const strokes: Record<string, string> = {
      definition: '#e7c84a',
      theorem: '#a5b4fc',
      important: '#fca5a5',
      example: '#86efac',
      objective: '#7dd3fc',
      materials: '#94a3b8',
      observation: '#67e8f9',
      result: '#c4b5fd',
      conclusion: '#0f766e',
      exam_tip: '#fdba74'
    };
    const height = Math.max(52, doc.heightOfString(block.content, { width: 420 }) + 30);
    ensurePdfSpace(doc, height + 8);
    doc.roundedRect(72, doc.y, 468, height, 6).fillAndStroke(fills[block.type] || '#fff7d6', strokes[block.type] || '#e7c84a');
    doc.fillColor('#0f766e').font('Helvetica-Bold').fontSize(8).text(labels[block.type] || 'NOTE', 88, doc.y + 10);
    doc.fillColor('#18212f').font('Helvetica').fontSize(10.5).text(block.content, 88, doc.y + 25, { width: 420, lineGap: 4 });
    doc.y += height + 8;
    return;
  }
  if (block.type === 'question' || block.type === 'answer') {
    const height = Math.max(42, doc.heightOfString(block.content, { width: 392 }) + 18);
    ensurePdfSpace(doc, height + 7);
    const bg = block.type === 'question' ? '#ffffff' : '#ecfdf5';
    const border = block.type === 'question' ? '#99d2ca' : '#a7f3d0';
    doc.roundedRect(72, doc.y, 468, height, 6).fillAndStroke(bg, border);
    doc.circle(94, doc.y + 20, 12).fill(block.type === 'question' ? '#0f766e' : '#047857');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9).text(block.type === 'question' ? 'Q' : 'A', 90, doc.y + 16);
    doc.fillColor('#18212f').font('Helvetica-Bold').fontSize(10.5).text(block.content, 118, doc.y + 12, { width: 392, lineGap: 4 });
    doc.y += height + 7;
    return;
  }
  if (block.type === 'formula') {
    ensurePdfSpace(doc, 54);
    doc.roundedRect(102, doc.y, 390, 46, 6).fillAndStroke('#ecfdf5', '#99d2ca');
    doc.fillColor('#0f766e').font('Helvetica-Bold').fontSize(8).text('FORMULA', 118, doc.y + 9);
    doc.fillColor('#18212f').font('Courier-Bold').fontSize(12).text(block.content, 118, doc.y + 23, { width: 358, align: 'center' });
    doc.y += 54;
    return;
  }
  if (block.type === 'table') {
    const rows = parseTableRows(block.content);
    const cellHeight = 22;
    const colCount = Math.max(1, ...rows.map((row) => row.length));
    const colWidth = 468 / colCount;
    const height = Math.max(34, rows.length * cellHeight + 22);
    ensurePdfSpace(doc, height + 8);
    doc.fillColor('#0f766e').font('Helvetica-Bold').fontSize(8).text('TABLE', 72, doc.y);
    doc.y += 14;
    rows.forEach((row, rowIndex) => {
      row.forEach((cell, cellIndex) => {
        const x = 72 + cellIndex * colWidth;
        const y = doc.y;
        doc.rect(x, y, colWidth, cellHeight).fillAndStroke(rowIndex === 0 ? '#e8f2ef' : '#ffffff', '#d9e7e3');
        doc.fillColor('#18212f').font(rowIndex === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).text(cell, x + 4, y + 6, { width: colWidth - 8, ellipsis: true });
      });
      doc.y += cellHeight;
    });
    doc.y += 8;
    return;
  }
  if (block.type === 'code') {
    const height = doc.heightOfString(block.content, { width: 420 }) + 24;
    ensurePdfSpace(doc, height + 8);
    doc.roundedRect(72, doc.y, 468, height, 6).fill('#18212f');
    doc.font('Courier').fontSize(9).fillColor('#ffffff').text(block.content, 88, doc.y + 12, { width: 430, lineGap: 3 });
    doc.font('Helvetica');
    doc.y += height + 8;
    return;
  }
  const height = doc.heightOfString(block.content, { width: 468, lineGap: 5 });
  ensurePdfSpace(doc, height + 10);
  doc.font('Helvetica').fontSize(10.5).fillColor('#18212f').text(block.content, 72, doc.y, { width: 468, lineGap: 5 });
  doc.moveDown(0.5);
}

function docxParagraphForBlock(block: ReturnType<typeof blocksFromNote>[number]) {
  if (block.type === 'title') {
    return new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: block.content, bold: true, color: '18212F', size: 36 })]
    });
  }
  if (block.type === 'heading' || block.type === 'subheading') {
    return new Paragraph({
      heading: block.type === 'heading' ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
      spacing: { before: 220, after: 120 },
      children: [new TextRun({ text: block.content, bold: true, color: block.type === 'heading' ? '18212F' : '0F766E' })]
    });
  }
  if (block.type === 'bullet') return new Paragraph({ bullet: { level: 0 }, children: [new TextRun(block.content)] });
  if (block.type === 'numbered') return new Paragraph({ numbering: { reference: 'default-numbering', level: 0 }, children: [new TextRun(block.content)] });
  if (block.type === 'step') return new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: 'Step: ', bold: true, color: '0F766E' }), new TextRun(block.content)] });
  if (['definition', 'theorem', 'important', 'example', 'objective', 'materials', 'observation', 'result', 'conclusion', 'exam_tip'].includes(block.type)) {
    const labels: Record<string, string> = {
      definition: 'Definition',
      theorem: 'Theorem / Rule',
      important: 'Important',
      example: 'Example',
      objective: 'Objective',
      materials: 'Materials / Apparatus',
      observation: 'Observation',
      result: 'Result',
      conclusion: 'Conclusion',
      exam_tip: 'Exam tip'
    };
    const label = labels[block.type] || 'Note';
    return new Paragraph({
      spacing: { before: 120, after: 120 },
      children: [new TextRun({ text: `${label}: `, bold: true, color: '0F766E' }), new TextRun(block.content)]
    });
  }
  if (block.type === 'question') return new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: 'Q: ', bold: true, color: '0F766E' }), new TextRun({ text: block.content, bold: true })] });
  if (block.type === 'answer') return new Paragraph({ children: [new TextRun({ text: 'A: ', bold: true }), new TextRun(block.content)] });
  if (block.type === 'formula' || block.type === 'code') {
    return new Paragraph({ alignment: block.type === 'formula' ? AlignmentType.CENTER : AlignmentType.LEFT, children: [new TextRun({ text: block.content, font: 'Courier New' })] });
  }
  if (block.type === 'table') return new Paragraph({ spacing: { before: 120, after: 120 }, children: [new TextRun({ text: block.content, font: 'Courier New' })] });
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun(block.content)] });
}

export async function exportPdf(req: AuthRequest, res: Response) {
  const note = await getOwnedNote(req);
  if (!note) return res.status(404).json({ message: 'Not found' });

  const doc = new PDFDocument({ margin: 72, size: 'A4', bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${safeFilename(note.title)}-${note.id}.pdf`);
  doc.pipe(res);
  pagesFromBlocks(note).forEach(([page, blocks], pageIndex) => {
    if (pageIndex > 0) doc.addPage();
    drawPdfHeader(doc, note.title, page);
    if (!blocks.some((block) => block.type === 'title')) {
      drawPdfBlock(doc, { type: 'title', content: note.title, page });
    }
    blocks.forEach((block) => drawPdfBlock(doc, block));
    drawPdfFooter(doc);
  });
  doc.end();
}

export async function exportDocx(req: AuthRequest, res: Response) {
  const note = await getOwnedNote(req);
  if (!note) return res.status(404).json({ message: 'Not found' });

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT }]
        }
      ]
    },
    sections: pagesFromBlocks(note).map(([page, blocks]) => ({
      properties: {},
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 240 },
          children: [new TextRun({ text: `PenBot AI converted document - Page ${page}`, color: '0F766E', bold: true, size: 18 })]
        }),
        ...(blocks.some((block) => block.type === 'title') ? [] : [docxParagraphForBlock({ type: 'title', content: note.title, page })]),
        ...blocks.map(docxParagraphForBlock)
      ]
    }))
  });
  const buffer = await Packer.toBuffer(doc);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename=${safeFilename(note.title)}-${note.id}.docx`);
  res.send(buffer);
}

export async function exportMarkdown(req: AuthRequest, res: Response) {
  const note = await getOwnedNote(req);
  if (!note) return res.status(404).json({ message: 'Not found' });
  res.setHeader('Content-Type', 'text/markdown');
  res.setHeader('Content-Disposition', `attachment; filename=${safeFilename(note.title)}-${note.id}.md`);
  res.send(`${markdownFromBlocks(note)}\n`);
}

export async function exportTxt(req: AuthRequest, res: Response) {
  const note = await getOwnedNote(req);
  if (!note) return res.status(404).json({ message: 'Not found' });
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename=${safeFilename(note.title)}-${note.id}.txt`);
  res.send(pagesFromBlocks(note).map(([page, blocks]) => `Page ${page}\n${blocks.map((block) => block.content).join('\n')}`).join('\n\n'));
}

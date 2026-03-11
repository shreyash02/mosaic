import { jsPDF } from 'jspdf';
import { PDF_STYLES, CONTENT_WIDTH, needsPageBreak } from './pdfStyles';
import { loadCustomFont } from './fonts';
import type { PurposeSynthesis } from '../../types';

const FONT: 'lora' = 'lora';

interface SnapshotTheme {
  id: string;
  name: string;
  summary?: string;
  color?: string;
  idea_count: number;
}

interface SnapshotPdfInput {
  title: string;
  snapshotLabel: string;
  snapshotDate: string;
  snapshotUrl?: string;
  synthesis: PurposeSynthesis | null;
  synthesisPurposeLabel: string;
  themes: SnapshotTheme[];
  graphCanvas: HTMLCanvasElement | null;
}

export async function generateSnapshotPdf(input: SnapshotPdfInput): Promise<Blob> {
  const { title, snapshotLabel, snapshotDate, snapshotUrl, synthesis, synthesisPurposeLabel, themes, graphCanvas } = input;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  await loadCustomFont(doc, FONT);

  const x = PDF_STYLES.page.marginLeft;
  let y = PDF_STYLES.page.marginTop;

  // ── Title ──
  doc.setFontSize(PDF_STYLES.fonts.title.size);
  doc.setTextColor(PDF_STYLES.colors.text);
  doc.setFont(FONT, 'bold');
  const titleLines = doc.splitTextToSize(title, CONTENT_WIDTH);
  doc.text(titleLines, x, y);
  y += titleLines.length * 32 + 8;

  // Snapshot metadata
  doc.setFontSize(PDF_STYLES.fonts.small.size);
  doc.setTextColor(PDF_STYLES.colors.textMuted);
  doc.setFont(FONT, 'normal');
  const metaParts = [snapshotLabel, snapshotDate].filter(Boolean);
  doc.text(metaParts.join('  •  '), x, y);
  y += 18;

  // Snapshot link
  if (snapshotUrl) {
    doc.setFontSize(PDF_STYLES.fonts.small.size);
    doc.setTextColor(PDF_STYLES.colors.ratingBar);
    doc.setFont(FONT, 'normal');
    doc.textWithLink('View snapshot on Mosaic', x, y, { url: snapshotUrl });
    y += 20;
  }

  // Divider
  doc.setDrawColor(PDF_STYLES.colors.border);
  doc.setLineWidth(0.5);
  doc.line(x, y, x + CONTENT_WIDTH, y);
  y += 24;

  // ── Synthesis ──
  if (synthesis?.space_summary) {
    // Require space for heading + at least a few lines of summary
    doc.setFontSize(PDF_STYLES.fonts.body.size);
    doc.setFont(FONT, 'normal');
    const previewLines = doc.splitTextToSize(synthesis.space_summary, CONTENT_WIDTH);
    const minSummaryHeight = Math.min(previewLines.length, 3) * 20;
    if (needsPageBreak(y, 28 + minSummaryHeight + 30)) {
      doc.addPage();
      y = PDF_STYLES.page.marginTop;
    }

    doc.setFontSize(PDF_STYLES.fonts.heading1.size);
    doc.setTextColor(PDF_STYLES.colors.text);
    doc.setFont(FONT, 'bold');
    doc.text('Synthesis', x, y);

    // Purpose label
    if (synthesisPurposeLabel) {
      const synthTitleWidth = doc.getTextWidth('Synthesis');
      doc.setFontSize(PDF_STYLES.fonts.small.size);
      doc.setTextColor(PDF_STYLES.colors.textMuted);
      doc.setFont(FONT, 'normal');
      doc.text(synthesisPurposeLabel, x + synthTitleWidth + 10, y);
    }
    y += 28;

    doc.setFontSize(PDF_STYLES.fonts.body.size);
    doc.setTextColor(PDF_STYLES.colors.textSecondary);
    doc.setFont(FONT, 'normal');
    const summaryLines = doc.splitTextToSize(synthesis.space_summary, CONTENT_WIDTH);
    doc.text(summaryLines, x, y);
    y += summaryLines.length * 20 + 24;
  }

  // ── Theme Graph ──
  if (graphCanvas) {
    const canvasAspect = graphCanvas.height / graphCanvas.width;
    // Preserve aspect ratio — fit within content width and max height
    const maxHeight = 300;
    let imgWidth = CONTENT_WIDTH;
    let imgHeight = imgWidth * canvasAspect;
    if (imgHeight > maxHeight) {
      imgHeight = maxHeight;
      imgWidth = imgHeight / canvasAspect;
    }
    // Center the image if it's narrower than content width
    const imgX = x + (CONTENT_WIDTH - imgWidth) / 2;

    if (needsPageBreak(y, imgHeight + 30)) {
      doc.addPage();
      y = PDF_STYLES.page.marginTop;
    }

    doc.setFontSize(PDF_STYLES.fonts.heading1.size);
    doc.setTextColor(PDF_STYLES.colors.text);
    doc.setFont(FONT, 'bold');
    doc.text('Theme Map', x, y);
    y += 28;

    // Light background behind graph (full width)
    doc.setFillColor('#f1f5f9');
    doc.roundedRect(x, y, CONTENT_WIDTH, imgHeight, 4, 4, 'F');
    // Render canvas as-is, preserving native aspect ratio
    const imgData = graphCanvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', imgX, y, imgWidth, imgHeight);
    y += imgHeight + 24;
  }

  // ── Themes ──
  if (themes.length > 0) {
    // Require space for heading + at least the first theme card
    const firstThemeNotes = synthesis?.theme_notes?.[themes[0].id] || [];
    const firstThemeHeight = 50 + (themes[0].summary ? 20 : 0) + firstThemeNotes.length * 20;
    if (needsPageBreak(y, 30 + firstThemeHeight)) {
      doc.addPage();
      y = PDF_STYLES.page.marginTop;
    }

    doc.setFontSize(PDF_STYLES.fonts.heading1.size);
    doc.setTextColor(PDF_STYLES.colors.text);
    doc.setFont(FONT, 'bold');
    doc.text(`Themes (${themes.length})`, x, y);
    y += 30;

    for (const theme of themes) {
      // Estimate height needed for this theme card
      const notesForTheme = synthesis?.theme_notes?.[theme.id] || [];
      const estimatedHeight = 50 + (theme.summary ? 20 : 0) + notesForTheme.length * 20;

      if (needsPageBreak(y, estimatedHeight)) {
        doc.addPage();
        y = PDF_STYLES.page.marginTop;
      }

      // Color bar on the left
      const cardX = x + 8;
      const cardWidth = CONTENT_WIDTH - 8;
      const barColor = theme.color || '#94a3b8';
      doc.setFillColor(barColor);
      doc.roundedRect(x, y - 4, 4, 18, 2, 2, 'F');

      // Theme name
      doc.setFontSize(PDF_STYLES.fonts.heading3.size);
      doc.setTextColor(PDF_STYLES.colors.text);
      doc.setFont(FONT, 'bold');
      doc.text(theme.name, cardX, y + 10);
      y += 22;

      // Summary
      if (theme.summary) {
        doc.setFontSize(PDF_STYLES.fonts.small.size);
        doc.setTextColor(PDF_STYLES.colors.textSecondary);
        doc.setFont(FONT, 'normal');
        const summLines = doc.splitTextToSize(theme.summary, cardWidth - 8);
        doc.text(summLines, cardX, y);
        y += summLines.length * 16 + 4;
      }

      // Idea count
      doc.setFontSize(PDF_STYLES.fonts.caption.size);
      doc.setTextColor(PDF_STYLES.colors.textMuted);
      doc.setFont(FONT, 'normal');
      doc.text(`${theme.idea_count} ${theme.idea_count === 1 ? 'idea' : 'ideas'}`, cardX, y);
      y += 16;

      // Theme notes from synthesis
      if (notesForTheme.length > 0) {
        doc.setFontSize(PDF_STYLES.fonts.caption.size);
        doc.setTextColor(PDF_STYLES.colors.textMuted);
        doc.setFont(FONT, 'normal');

        for (const note of notesForTheme) {
          if (needsPageBreak(y, 24)) {
            doc.addPage();
            y = PDF_STYLES.page.marginTop;
          }

          // Bullet
          doc.setFillColor(PDF_STYLES.colors.textMuted);
          doc.circle(cardX + 4, y + 2, 1.5, 'F');

          doc.setFontSize(PDF_STYLES.fonts.small.size);
          doc.setTextColor(PDF_STYLES.colors.textSecondary);
          doc.setFont(FONT, 'normal');
          const noteLines = doc.splitTextToSize(note, cardWidth - 24);
          doc.text(noteLines, cardX + 14, y + 6);
          y += noteLines.length * 16 + 4;
        }
      }

      // Spacing between theme cards
      y += 14;

      // Subtle divider between themes
      doc.setDrawColor(PDF_STYLES.colors.border);
      doc.setLineWidth(0.3);
      doc.line(x, y - 6, x + CONTENT_WIDTH, y - 6);
    }
  }

  // ── Page footers ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = PDF_STYLES.page.height - 30;

    doc.setFontSize(PDF_STYLES.fonts.caption.size);
    doc.setTextColor(PDF_STYLES.colors.textMuted);
    doc.setFont(FONT, 'normal');
    doc.text('Generated by Mosaic', PDF_STYLES.page.marginLeft, footerY);
    doc.text(i.toString(), PDF_STYLES.page.width / 2, footerY, { align: 'center' });

    doc.setDrawColor(PDF_STYLES.colors.border);
    doc.setLineWidth(0.5);
    doc.line(
      PDF_STYLES.page.marginLeft,
      footerY - 10,
      PDF_STYLES.page.width - PDF_STYLES.page.marginRight,
      footerY - 10
    );
  }

  return doc.output('blob');
}

export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

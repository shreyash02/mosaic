import { jsPDF } from 'jspdf';
import type { Analysis, Conversation, ResponseWithQuestion } from '../../types';
import { PDF_STYLES, CONTENT_WIDTH, needsPageBreak } from './pdfStyles';
import { renderCoverPage } from './coverPage';
import { renderQuestionSection } from './questionPages';
import { loadCustomFont, isCustomFont } from './fonts';
import type { CustomFontFamily } from './fonts';

// Support both built-in and custom fonts
export type PDFFontFamily = 'helvetica' | 'times' | 'courier' | CustomFontFamily;

// Font display names for filenames
export const FONT_NAMES: Record<PDFFontFamily, string> = {
  helvetica: 'Helvetica',
  times: 'TimesNewRoman',
  courier: 'Courier',
  lora: 'Lora',
  ebgaramond: 'Garamond',
  librebaskerville: 'Georgia',
  caladea: 'Cambria',
};

export interface PDFExportOptions {
  includeSurprisingInsights: boolean;
  includeVerbatim: boolean;
  fontFamily?: PDFFontFamily;
}

export interface PDFGeneratorInput {
  analysis: Analysis;
  conversation: Conversation;
  responses?: ResponseWithQuestion[];
  options: PDFExportOptions;
}

export async function generateAnalysisPDF(input: PDFGeneratorInput): Promise<Blob> {
  const { analysis, conversation, responses, options } = input;
  const fontFamily = options.fontFamily || 'lora';

  // Initialize PDF document (A4 portrait)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  // Load custom font if needed
  if (isCustomFont(fontFamily)) {
    await loadCustomFont(doc, fontFamily);
  }

  // Generate analysis URL for the header link
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const analysisUrl = `${baseUrl}/analysis/${conversation.id}`;

  // 1. Render cover page - returns the Y position after content
  let currentY = renderCoverPage(doc, analysis, conversation, options, analysisUrl, fontFamily);

  // 2. Render question-by-question analysis (flows continuously)
  const totalQuestions = analysis.question_analyses?.length || 0;
  if (analysis.question_analyses && analysis.question_analyses.length > 0) {
    // Check if we need a new page for the questions section
    if (needsPageBreak(currentY, 150)) {
      doc.addPage();
      currentY = PDF_STYLES.page.marginTop;
    }

    // Section title
    doc.setFontSize(PDF_STYLES.fonts.heading1.size);
    doc.setTextColor(PDF_STYLES.colors.text);
    doc.setFont(fontFamily, 'bold');
    doc.text('Question Analysis', PDF_STYLES.page.marginLeft, currentY);
    currentY += 35;

    // Render each question (flowing continuously)
    for (let i = 0; i < analysis.question_analyses.length; i++) {
      const qa = analysis.question_analyses[i];
      currentY = await renderQuestionSection(doc, qa, i, totalQuestions, currentY, fontFamily);

      // Add spacing between questions
      currentY += 25;
    }
  }

  // 3. Render verbatim responses (if enabled and available)
  if (options.includeVerbatim && responses && responses.length > 0) {
    // Check if we need a new page
    if (needsPageBreak(currentY, 100)) {
      doc.addPage();
      currentY = PDF_STYLES.page.marginTop;
    } else {
      currentY += 20;
    }
    renderVerbatimSection(doc, responses, currentY, fontFamily);
  }

  // 4. Add page numbers and footer to all pages
  addPageFooters(doc, fontFamily);

  // Return as blob for download
  return doc.output('blob');
}

function renderVerbatimSection(
  doc: jsPDF,
  responses: ResponseWithQuestion[],
  startY: number,
  fontFamily: PDFFontFamily
): void {
  let y = startY;
  const x = PDF_STYLES.page.marginLeft;

  // Section header
  doc.setFontSize(PDF_STYLES.fonts.heading1.size);
  doc.setTextColor(PDF_STYLES.colors.text);
  doc.setFont(fontFamily, 'bold');
  doc.text('Verbatim Responses', x, y);
  y += 40;

  // Group responses by question
  const responsesByQuestion: Record<string, ResponseWithQuestion[]> = {};
  responses.forEach((response) => {
    if (!responsesByQuestion[response.question_id]) {
      responsesByQuestion[response.question_id] = [];
    }
    responsesByQuestion[response.question_id].push(response);
  });

  // Render each question's responses
  for (const [, questionResponses] of Object.entries(responsesByQuestion)) {
    // Check page break
    if (needsPageBreak(y, 100)) {
      doc.addPage();
      y = PDF_STYLES.page.marginTop;
    }

    // Question text
    const questionText = questionResponses[0]?.question_text || 'Unknown Question';
    doc.setFontSize(PDF_STYLES.fonts.heading3.size);
    doc.setTextColor(PDF_STYLES.colors.text);
    doc.setFont(fontFamily, 'bold');
    const questionLines = doc.splitTextToSize(questionText, CONTENT_WIDTH);
    doc.text(questionLines, x, y);
    y += questionLines.length * 22 + 14;

    // Render each response
    questionResponses.forEach((response, index) => {
      // Skip non-text responses
      if (!response.response_text) return;

      // Check page break
      if (needsPageBreak(y, 50)) {
        doc.addPage();
        y = PDF_STYLES.page.marginTop;
      }

      // Response number
      doc.setFontSize(PDF_STYLES.fonts.body.size);
      doc.setTextColor(PDF_STYLES.colors.textMuted);
      doc.setFont(fontFamily, 'bold');
      doc.text(`${index + 1}.`, x, y + 10);

      // Response text
      doc.setFontSize(PDF_STYLES.fonts.body.size);
      doc.setTextColor(PDF_STYLES.colors.textSecondary);
      doc.setFont(fontFamily, 'normal');
      const responseLines = doc.splitTextToSize(response.response_text, CONTENT_WIDTH - 25);
      doc.text(responseLines, x + 22, y + 10);
      y += responseLines.length * 20 + 14;
    });

    y += 20; // Space between questions
  }
}

function addPageFooters(doc: jsPDF, fontFamily: PDFFontFamily): void {
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    const footerY = PDF_STYLES.page.height - 30;

    doc.setFontSize(PDF_STYLES.fonts.caption.size);
    doc.setTextColor(PDF_STYLES.colors.textMuted);
    doc.setFont(fontFamily, 'normal');

    // Left side: Branding
    doc.text('Generated by Mosaic', PDF_STYLES.page.marginLeft, footerY);

    // Center: Page number only
    doc.text(
      i.toString(),
      PDF_STYLES.page.width / 2,
      footerY,
      { align: 'center' }
    );

    // Footer line
    doc.setDrawColor(PDF_STYLES.colors.border);
    doc.setLineWidth(0.5);
    doc.line(
      PDF_STYLES.page.marginLeft,
      footerY - 10,
      PDF_STYLES.page.width - PDF_STYLES.page.marginRight,
      footerY - 10
    );
  }
}

// Utility to create a safe filename
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

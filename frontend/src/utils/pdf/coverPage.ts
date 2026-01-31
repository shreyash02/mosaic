import type { jsPDF } from 'jspdf';
import type { Analysis, Conversation } from '../../types';
import { PDF_STYLES, CONTENT_WIDTH, needsPageBreak } from './pdfStyles';
import type { PDFExportOptions, PDFFontFamily } from './pdfGenerator';

export function renderCoverPage(
  doc: jsPDF,
  analysis: Analysis,
  conversation: Conversation,
  options: PDFExportOptions,
  analysisUrl?: string,
  fontFamily: PDFFontFamily = 'helvetica'
): number {
  let y = PDF_STYLES.page.marginTop;
  const x = PDF_STYLES.page.marginLeft;

  // Title: "{Conversation Title} - Analysis Report"
  doc.setFontSize(PDF_STYLES.fonts.title.size);
  doc.setTextColor(PDF_STYLES.colors.text);
  doc.setFont(fontFamily, 'bold');
  const fullTitle = `${conversation.title} - Analysis Report`;
  const titleLines = doc.splitTextToSize(fullTitle, CONTENT_WIDTH);
  doc.text(titleLines, x, y);
  y += titleLines.length * 32 + 12;

  // Analysis link (below title)
  if (analysisUrl) {
    doc.setFontSize(PDF_STYLES.fonts.small.size);
    doc.setTextColor(PDF_STYLES.colors.ratingBar); // Dark teal color
    doc.setFont(fontFamily, 'normal');
    const linkText = 'View analysis on Mosaic';
    doc.textWithLink(linkText, x, y, { url: analysisUrl });

    // Draw external link icon after text
    const textWidth = doc.getTextWidth(linkText);
    const iconX = x + textWidth + 4;
    const iconY = y - 6;
    const iconSize = 7;

    doc.setDrawColor(PDF_STYLES.colors.ratingBar);
    doc.setLineWidth(0.8);
    // Box
    doc.rect(iconX, iconY, iconSize, iconSize);
    // Arrow line (diagonal)
    doc.line(iconX + 2, iconY + iconSize - 2, iconX + iconSize - 1, iconY + 1);
    // Arrow head
    doc.line(iconX + iconSize - 1, iconY + 1, iconX + iconSize - 1, iconY + 3.5);
    doc.line(iconX + iconSize - 1, iconY + 1, iconX + iconSize - 3.5, iconY + 1);

    y += 20;
  }

  // Metadata: respondents count and dates
  doc.setFontSize(PDF_STYLES.fonts.small.size);
  doc.setTextColor(PDF_STYLES.colors.textMuted);
  doc.setFont(fontFamily, 'normal');

  const respondentCount = analysis.unique_participants ?? analysis.total_responses_analyzed;
  const metaParts: string[] = [`${respondentCount} respondents`];

  // Add date range if available
  if (analysis.conversation_activated_at) {
    const startDate = new Date(analysis.conversation_activated_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const endDate = analysis.conversation_closed_at
      ? new Date(analysis.conversation_closed_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'ongoing';
    metaParts.push(`${startDate} - ${endDate}`);
  }

  // Add analysis date
  const analysisDate = new Date(analysis.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  metaParts.push(`Analyzed: ${analysisDate}`);

  const metaText = metaParts.join('  •  ');
  doc.text(metaText, x, y);
  y += 28;

  // Divider line
  doc.setDrawColor(PDF_STYLES.colors.border);
  doc.setLineWidth(0.5);
  doc.line(x, y, x + CONTENT_WIDTH, y);
  y += 30;

  // Executive Summary section
  doc.setFontSize(PDF_STYLES.fonts.heading1.size);
  doc.setTextColor(PDF_STYLES.colors.text);
  doc.setFont(fontFamily, 'bold');
  doc.text('Executive Summary', x, y);
  y += 30;

  doc.setFontSize(PDF_STYLES.fonts.body.size);
  doc.setTextColor(PDF_STYLES.colors.textSecondary);
  doc.setFont(fontFamily, 'normal');
  const summaryLines = doc.splitTextToSize(analysis.overall_summary, CONTENT_WIDTH);
  doc.text(summaryLines, x, y);
  y += summaryLines.length * 22 + 30;

  // Surprising Insights (if enabled and available)
  if (options.includeSurprisingInsights && analysis.surprising_insights?.length) {
    y = renderSurprisingInsights(doc, analysis.surprising_insights, y, fontFamily);
  }

  return y;
}

function renderSurprisingInsights(
  doc: jsPDF,
  insights: Array<{ title: string; description: string }>,
  startY: number,
  fontFamily: PDFFontFamily
): number {
  let y = startY;
  const x = PDF_STYLES.page.marginLeft;

  // Check if we need a new page
  if (needsPageBreak(y, 120)) {
    doc.addPage();
    y = PDF_STYLES.page.marginTop;
  }

  // Section header
  doc.setFontSize(PDF_STYLES.fonts.heading1.size);
  doc.setTextColor(PDF_STYLES.colors.text);
  doc.setFont(fontFamily, 'bold');
  doc.text('What Surprised Us', x, y);
  y += 32;

  for (const insight of insights) {
    // Check page break for each insight
    if (needsPageBreak(y, 80)) {
      doc.addPage();
      y = PDF_STYLES.page.marginTop;
    }

    // Bullet point
    doc.setFillColor(PDF_STYLES.colors.textMuted);
    doc.circle(x + 4, y - 4, 3, 'F');

    // Insight title
    doc.setFontSize(PDF_STYLES.fonts.heading3.size);
    doc.setTextColor(PDF_STYLES.colors.text);
    doc.setFont(fontFamily, 'bold');
    doc.text(insight.title, x + 16, y);
    y += 20;

    // Insight description
    doc.setFontSize(PDF_STYLES.fonts.body.size);
    doc.setTextColor(PDF_STYLES.colors.textSecondary);
    doc.setFont(fontFamily, 'normal');
    const descLines = doc.splitTextToSize(insight.description, CONTENT_WIDTH - 16);
    doc.text(descLines, x + 16, y);
    y += descLines.length * 20 + 22;
  }

  return y;
}

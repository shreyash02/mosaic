import type { jsPDF } from 'jspdf';
import type { QuestionAnalysis } from '../../types';
import { PDF_STYLES, CONTENT_WIDTH, needsPageBreak } from './pdfStyles';
import type { PDFFontFamily } from './pdfGenerator';

// Cache for fetched images
const imageCache: Map<string, string> = new Map();

async function fetchImageAsBase64(url: string): Promise<string | null> {
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        imageCache.set(url, base64);
        resolve(base64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Renders a question section that flows continuously on the page.
 * Will add page breaks as needed for the content.
 * Ensures question header and beginning of content stay together.
 */
export async function renderQuestionSection(
  doc: jsPDF,
  qa: QuestionAnalysis,
  questionIndex: number,
  totalQuestions: number,
  startY: number,
  fontFamily: PDFFontFamily = 'helvetica'
): Promise<number> {
  let y = startY;
  const x = PDF_STYLES.page.marginLeft;

  // Calculate space needed for question header + start of content
  // This ensures the question and its content don't get split across pages
  doc.setFontSize(PDF_STYLES.fonts.heading2.size);
  const questionLines = doc.splitTextToSize(qa.question_text, CONTENT_WIDTH);
  const questionHeaderHeight = 26 + (questionLines.length * 20) + 16 + 28; // number + question + type

  // Calculate minimum content height based on question type
  let minContentHeight: number;
  switch (qa.question_type) {
    case 'rating':
      // Rating needs: Average box (80) + spacing (30) + Distribution title (28) + chart (160) + labels (30) = ~330pt
      minContentHeight = 330;
      break;
    case 'single_choice':
    case 'multiple_choice':
      // Poll needs at least first 2 choices visible
      minContentHeight = 140;
      break;
    case 'text':
    default:
      // Text needs summary heading + a few lines
      minContentHeight = 120;
      break;
  }

  const totalMinHeight = questionHeaderHeight + minContentHeight;

  // Check if we need a new page to keep question and content together
  if (needsPageBreak(y, totalMinHeight)) {
    doc.addPage();
    y = PDF_STYLES.page.marginTop;
  }

  // Question number badge
  doc.setFontSize(PDF_STYLES.fonts.small.size);
  doc.setTextColor(PDF_STYLES.colors.textMuted);
  doc.setFont(fontFamily, 'normal');
  doc.text(`Question ${questionIndex + 1} of ${totalQuestions}`, x, y);
  y += 26;

  // Question text
  doc.setFontSize(PDF_STYLES.fonts.heading2.size);
  doc.setTextColor(PDF_STYLES.colors.text);
  doc.setFont(fontFamily, 'bold');
  doc.text(questionLines, x, y);
  y += questionLines.length * 20 + 16;

  // Question image (if present)
  if (qa.question_image_url) {
    const imageData = await fetchImageAsBase64(qa.question_image_url);
    if (imageData) {
      const maxImageWidth = CONTENT_WIDTH * 0.6;
      const maxImageHeight = 150;

      // Add image (jsPDF will auto-scale to fit)
      try {
        doc.addImage(imageData, x, y, maxImageWidth, maxImageHeight, undefined, 'FAST');
        y += maxImageHeight + 16;
      } catch {
        // Skip if image fails to load
      }
    }
  }

  // Question type and response count (title case, not uppercase)
  doc.setFontSize(PDF_STYLES.fonts.small.size);
  doc.setTextColor(PDF_STYLES.colors.textMuted);
  doc.setFont(fontFamily, 'normal');
  const typeLabel = qa.question_type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  doc.text(`${typeLabel}  •  ${qa.response_count} responses`, x, y);
  y += 28;

  // Render based on question type
  switch (qa.question_type) {
    case 'text':
      y = renderTextQuestionAnalysis(doc, qa, y, fontFamily);
      break;
    case 'rating':
      y = renderRatingQuestionAnalysis(doc, qa, y, fontFamily);
      break;
    case 'single_choice':
    case 'multiple_choice':
      y = renderPollQuestionAnalysis(doc, qa, y, fontFamily);
      break;
  }

  return y;
}

function renderTextQuestionAnalysis(doc: jsPDF, qa: QuestionAnalysis, startY: number, fontFamily: PDFFontFamily): number {
  let y = startY;
  const x = PDF_STYLES.page.marginLeft;

  // If there's a summary, show it first
  // Note: Parent function already ensures space for question + summary start
  if (qa.summary) {
    doc.setFontSize(PDF_STYLES.fonts.heading3.size);
    doc.setTextColor(PDF_STYLES.colors.text);
    doc.setFont(fontFamily, 'bold');
    doc.text('Summary', x, y);
    y += 24;

    doc.setFontSize(PDF_STYLES.fonts.body.size);
    doc.setTextColor(PDF_STYLES.colors.textSecondary);
    doc.setFont(fontFamily, 'normal');
    const summaryLines = doc.splitTextToSize(qa.summary, CONTENT_WIDTH);
    doc.text(summaryLines, x, y);
    y += summaryLines.length * 20 + 24;
  }

  if (qa.themes && qa.themes.length > 0) {
    // Check page break
    if (needsPageBreak(y, 60)) {
      doc.addPage();
      y = PDF_STYLES.page.marginTop;
    }

    doc.setFontSize(PDF_STYLES.fonts.heading3.size);
    doc.setTextColor(PDF_STYLES.colors.text);
    doc.setFont(fontFamily, 'bold');
    doc.text('Themes', x, y);
    y += 26;

    // Render themes in full width (no boxes, no truncation)
    for (const theme of qa.themes) {
      y = renderThemeSection(doc, theme, y, fontFamily);
      y += 20; // Space between themes
    }
  } else if (!qa.summary) {
    doc.setFontSize(PDF_STYLES.fonts.body.size);
    doc.setTextColor(PDF_STYLES.colors.textMuted);
    doc.setFont(fontFamily, 'italic');
    doc.text('Not enough responses to generate analysis.', x, y);
    y += 20;
  }

  return y;
}

/**
 * Renders a theme section with full width and no truncation.
 */
function renderThemeSection(
  doc: jsPDF,
  theme: { theme: string; frequency: number; summary: string; key_points?: string[] },
  startY: number,
  fontFamily: PDFFontFamily
): number {
  let y = startY;
  const x = PDF_STYLES.page.marginLeft;

  // Check page break
  if (needsPageBreak(y, 80)) {
    doc.addPage();
    y = PDF_STYLES.page.marginTop;
  }

  // Theme title
  doc.setFontSize(PDF_STYLES.fonts.heading3.size);
  doc.setTextColor(PDF_STYLES.colors.text);
  doc.setFont(fontFamily, 'bold');
  const titleLines = doc.splitTextToSize(theme.theme, CONTENT_WIDTH);
  doc.text(titleLines, x, y);
  y += titleLines.length * 22 + 8;

  // Frequency
  doc.setFontSize(PDF_STYLES.fonts.small.size);
  doc.setTextColor(PDF_STYLES.colors.textMuted);
  doc.setFont(fontFamily, 'normal');
  doc.text(`${theme.frequency} responses`, x, y);
  y += 22;

  // Summary (full, no truncation)
  doc.setFontSize(PDF_STYLES.fonts.body.size);
  doc.setTextColor(PDF_STYLES.colors.textSecondary);
  const summaryLines = doc.splitTextToSize(theme.summary, CONTENT_WIDTH);

  // Check page break for long summaries
  if (needsPageBreak(y, summaryLines.length * 20 + 20)) {
    doc.addPage();
    y = PDF_STYLES.page.marginTop;
  }

  doc.text(summaryLines, x, y);
  y += summaryLines.length * 20 + 18;

  // Key points (full, no truncation)
  if (theme.key_points && theme.key_points.length > 0) {
    // Check page break
    if (needsPageBreak(y, 50)) {
      doc.addPage();
      y = PDF_STYLES.page.marginTop;
    }

    doc.setFontSize(PDF_STYLES.fonts.small.size);
    doc.setTextColor(PDF_STYLES.colors.textMuted);
    doc.setFont(fontFamily, 'bold');
    doc.text('Key Points:', x, y);
    y += 20;

    doc.setFont(fontFamily, 'normal');
    for (const point of theme.key_points) {
      // Check page break for each point
      if (needsPageBreak(y, 30)) {
        doc.addPage();
        y = PDF_STYLES.page.marginTop;
      }

      const pointLines = doc.splitTextToSize(`• ${point}`, CONTENT_WIDTH - 10);
      doc.text(pointLines, x, y);
      y += pointLines.length * 18 + 8;
    }
  }

  return y;
}

function renderRatingQuestionAnalysis(doc: jsPDF, qa: QuestionAnalysis, startY: number, fontFamily: PDFFontFamily): number {
  let y = startY;
  const x = PDF_STYLES.page.marginLeft;

  if (!qa.rating_stats) return y;

  // Note: Page break check is done in renderQuestionSection to keep question header with content

  // Average rating highlight box
  const boxWidth = 160;
  const boxHeight = 80;
  doc.setFillColor(PDF_STYLES.colors.primary);
  doc.roundedRect(x, y, boxWidth, boxHeight, 8, 8, 'F');

  // "Average Rating" label
  doc.setFontSize(PDF_STYLES.fonts.small.size);
  doc.setTextColor(PDF_STYLES.colors.white);
  doc.setFont(fontFamily, 'normal');
  doc.text('Average Rating', x + 14, y + 22);

  // Large average value
  doc.setFontSize(36);
  doc.setFont(fontFamily, 'bold');
  const avgText = qa.rating_stats.average.toFixed(1);
  const avgWidth = doc.getTextWidth(avgText); // Calculate width while font is still 36pt
  doc.text(avgText, x + 14, y + 58);

  // Scale indicator "/ 10" - positioned after the average value
  doc.setFontSize(14);
  doc.setFont(fontFamily, 'normal');
  doc.text('/ 10', x + 14 + avgWidth + 8, y + 58);

  // Min/Max on the right side
  doc.setTextColor(PDF_STYLES.colors.textMuted);
  doc.setFontSize(PDF_STYLES.fonts.body.size);
  doc.text(`Min: ${qa.rating_stats.min_value}`, x + boxWidth + 25, y + 28);
  doc.text(`Max: ${qa.rating_stats.max_value}`, x + boxWidth + 25, y + 46);
  doc.text(`Total: ${qa.rating_stats.total_responses}`, x + boxWidth + 25, y + 64);

  y += boxHeight + 30;

  // Distribution section with vertical bar chart
  doc.setFontSize(PDF_STYLES.fonts.heading3.size);
  doc.setTextColor(PDF_STYLES.colors.text);
  doc.setFont(fontFamily, 'bold');
  doc.text('Distribution', x, y);
  y += 28;

  // Vertical bar chart for ratings 0-10
  const chartHeight = 160;
  const chartWidth = CONTENT_WIDTH;
  const numBars = 11; // 0-10
  const barWidth = 30;
  const barGap = (chartWidth - (numBars * barWidth)) / (numBars + 1);
  const chartBaseY = y + chartHeight;

  // Draw bars for each rating value (0-10)
  for (let rating = 0; rating <= 10; rating++) {
    const count = qa.rating_stats.distribution[rating.toString()] || 0;
    const percentage = qa.rating_stats.total_responses > 0
      ? (count / qa.rating_stats.total_responses) * 100
      : 0;
    const barHeight = (percentage / 100) * chartHeight;

    const barX = x + barGap + rating * (barWidth + barGap);
    const barY = chartBaseY - barHeight;

    // Bar background (full height, light)
    doc.setFillColor(PDF_STYLES.colors.border);
    doc.roundedRect(barX, y, barWidth, chartHeight, 3, 3, 'F');

    // Bar fill (from bottom)
    if (barHeight > 0) {
      doc.setFillColor(PDF_STYLES.colors.ratingBar);
      doc.roundedRect(barX, barY, barWidth, barHeight, 3, 3, 'F');
    }

    // Rating label below bar
    doc.setFontSize(PDF_STYLES.fonts.small.size);
    doc.setTextColor(PDF_STYLES.colors.text);
    doc.setFont(fontFamily, 'bold');
    const labelX = barX + barWidth / 2;
    doc.text(rating.toString(), labelX, chartBaseY + 16, { align: 'center' });

    // Count above bar (if there's a value)
    if (count > 0) {
      doc.setFontSize(PDF_STYLES.fonts.caption.size);
      doc.setTextColor(PDF_STYLES.colors.textMuted);
      doc.setFont(fontFamily, 'normal');
      doc.text(count.toString(), labelX, barY - 5, { align: 'center' });
    }
  }

  y = chartBaseY + 30;

  return y;
}

function renderPollQuestionAnalysis(doc: jsPDF, qa: QuestionAnalysis, startY: number, fontFamily: PDFFontFamily): number {
  let y = startY;
  const x = PDF_STYLES.page.marginLeft;

  if (!qa.poll_stats) return y;

  // Sort by count descending
  const sortedChoices = [...qa.poll_stats.choices].sort((a, b) => b.count - a.count);

  const barMaxWidth = CONTENT_WIDTH - 100;

  for (const choice of sortedChoices) {
    // Check page break
    if (needsPageBreak(y, 60)) {
      doc.addPage();
      y = PDF_STYLES.page.marginTop;
    }

    // Choice label
    doc.setFontSize(PDF_STYLES.fonts.body.size);
    doc.setTextColor(PDF_STYLES.colors.text);
    doc.setFont(fontFamily, 'bold');
    const labelLines = doc.splitTextToSize(choice.label, CONTENT_WIDTH - 120);
    doc.text(labelLines, x, y + 12);

    // Stats on the right
    doc.setFont(fontFamily, 'normal');
    doc.setTextColor(PDF_STYLES.colors.textMuted);
    doc.text(`${choice.count} (${choice.percentage}%)`, x + CONTENT_WIDTH - 90, y + 12);

    y += labelLines.length * 20 + 8;

    // Bar
    const barWidth = barMaxWidth * (choice.percentage / 100);
    doc.setFillColor(PDF_STYLES.colors.border);
    doc.roundedRect(x, y, barMaxWidth, 20, 3, 3, 'F');

    if (barWidth > 0) {
      doc.setFillColor(PDF_STYLES.colors.pollBar);
      doc.roundedRect(x, y, Math.max(barWidth, 4), 20, 3, 3, 'F');
    }

    y += 34;
  }

  // Total responses note
  doc.setFontSize(PDF_STYLES.fonts.small.size);
  doc.setTextColor(PDF_STYLES.colors.textMuted);
  doc.setFont(fontFamily, 'normal');
  const noteText =
    qa.question_type === 'multiple_choice'
      ? `Total respondents: ${qa.poll_stats.total_responses} (multiple selections allowed)`
      : `Total responses: ${qa.poll_stats.total_responses}`;
  doc.text(noteText, x, y + 8);

  return y + 25;
}

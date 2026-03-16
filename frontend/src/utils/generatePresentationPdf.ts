import { jsPDF } from 'jspdf';

// Font loading utilities (reused from pdf/fonts.ts pattern)
const fontCache: Map<string, ArrayBuffer> = new Map();

async function fetchFont(url: string): Promise<ArrayBuffer> {
  if (fontCache.has(url)) return fontCache.get(url)!;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch font: ${url}`);
  const buffer = await response.arrayBuffer();
  fontCache.set(url, buffer);
  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function loadInterFont(pdf: jsPDF): Promise<string> {
  try {
    const [normalBuffer, boldBuffer] = await Promise.all([
      fetchFont('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf'),
      fetchFont('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf'),
    ]);
    pdf.addFileToVFS('inter-normal.ttf', arrayBufferToBase64(normalBuffer));
    pdf.addFileToVFS('inter-bold.ttf', arrayBufferToBase64(boldBuffer));
    pdf.addFont('inter-normal.ttf', 'inter', 'normal');
    pdf.addFont('inter-bold.ttf', 'inter', 'bold');
    return 'inter';
  } catch {
    // Fallback to helvetica if font loading fails
    return 'helvetica';
  }
}

interface SlideData {
  layout: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  notes?: string;
  left_heading?: string;
  left_bullets?: string[];
  right_heading?: string;
  right_bullets?: string[];
  mermaid?: string;
  image_query?: string;
}

interface PresentationData {
  title: string;
  slides: SlideData[];
}

const COLORS = {
  primary: [30, 41, 59] as [number, number, number],       // slate-800
  accent: [59, 130, 246] as [number, number, number],      // blue-500
  text: [51, 65, 85] as [number, number, number],          // slate-700
  lightText: [100, 116, 139] as [number, number, number],  // slate-500
  white: [255, 255, 255] as [number, number, number],
  sectionBg: [30, 41, 59] as [number, number, number],
  accentBg: [59, 130, 246] as [number, number, number],
};

/** Replace characters that Inter font's latin subset can't render */
function pdfSafeText(text: string): string {
  return text
    .replace(/[\u2192\u2794\u27A1\u279C→]/g, ' > ')   // arrows not in latin subset
    .replace(/[\u2022]/g, '*');                          // bullet dot
}

function pdfSafeSlide(slide: SlideData): SlideData {
  return {
    ...slide,
    title: pdfSafeText(slide.title || ''),
    subtitle: slide.subtitle ? pdfSafeText(slide.subtitle) : undefined,
    bullets: slide.bullets?.map(pdfSafeText),
    left_heading: slide.left_heading ? pdfSafeText(slide.left_heading) : undefined,
    left_bullets: slide.left_bullets?.map(pdfSafeText),
    right_heading: slide.right_heading ? pdfSafeText(slide.right_heading) : undefined,
    right_bullets: slide.right_bullets?.map(pdfSafeText),
  };
}

export async function generatePresentationPdf(data: PresentationData, filename?: string) {
  // Landscape A4-ish proportions
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [254, 143] });
  const pageW = 254;
  const pageH = 143;
  const margin = 16;
  const fontName = await loadInterFont(pdf);

  for (let i = 0; i < data.slides.length; i++) {
    if (i > 0) pdf.addPage();
    const slide = pdfSafeSlide(data.slides[i]);

    switch (slide.layout) {
      case 'title':
        renderTitleSlide(pdf, slide, pageW, pageH, margin, fontName);
        break;
      case 'section':
        renderSectionSlide(pdf, slide, pageW, pageH, margin, fontName);
        break;
      case 'content':
        renderContentSlide(pdf, slide, pageW, pageH, margin, fontName);
        break;
      case 'content_image':
        renderContentSlide(pdf, slide, pageW, pageH, margin, fontName);
        break;
      case 'diagram':
        renderDiagramSlide(pdf, slide, pageW, pageH, margin, fontName);
        break;
      case 'two_column':
        renderTwoColumnSlide(pdf, slide, pageW, pageH, margin, fontName);
        break;
      default:
        renderContentSlide(pdf, slide, pageW, pageH, margin, fontName);
    }

    // Slide number
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.lightText);
    pdf.text(`${i + 1}`, pageW - margin, pageH - 6, { align: 'right' });
  }

  const safeName = (filename || data.title || 'presentation')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 60);

  pdf.save(`${safeName}.pdf`);
}

function renderTitleSlide(pdf: jsPDF, slide: SlideData, w: number, h: number, m: number, font: string) {
  // Dark background
  pdf.setFillColor(...COLORS.sectionBg);
  pdf.rect(0, 0, w, h, 'F');

  // Title
  pdf.setFontSize(28);
  pdf.setTextColor(...COLORS.white);
  pdf.setFont(font, 'bold');
  const titleLines = pdf.splitTextToSize(slide.title, w - m * 2);
  pdf.text(titleLines, m, h * 0.4);

  // Accent bar
  const titleBottom = h * 0.4 + titleLines.length * 10;
  pdf.setFillColor(...COLORS.accent);
  pdf.rect(m, titleBottom + 4, 30, 1.2, 'F');

  // Subtitle
  if (slide.subtitle) {
    pdf.setFontSize(14);
    pdf.setTextColor(...COLORS.lightText);
    pdf.setFont(font, 'normal');
    pdf.text(slide.subtitle, m, titleBottom + 14);
  }
}

function renderSectionSlide(pdf: jsPDF, slide: SlideData, w: number, h: number, m: number, font: string) {
  // Accent background
  pdf.setFillColor(...COLORS.accentBg);
  pdf.rect(0, 0, w, h, 'F');

  pdf.setFontSize(24);
  pdf.setTextColor(...COLORS.white);
  pdf.setFont(font, 'bold');
  const lines = pdf.splitTextToSize(slide.title, w - m * 2);
  pdf.text(lines, m, h * 0.45);
}

function renderContentSlide(pdf: jsPDF, slide: SlideData, w: number, h: number, m: number, font: string) {
  // White background
  pdf.setFillColor(...COLORS.white);
  pdf.rect(0, 0, w, h, 'F');

  // Title
  pdf.setFontSize(18);
  pdf.setTextColor(...COLORS.primary);
  pdf.setFont(font, 'bold');
  pdf.text(slide.title, m, m + 8);

  // Accent bar
  pdf.setFillColor(...COLORS.accent);
  pdf.rect(m, m + 12, 20, 0.8, 'F');

  // Bullets
  if (slide.bullets) {
    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.text);
    pdf.setFont(font, 'normal');
    let y = m + 22;
    for (const bullet of slide.bullets) {
      if (y > h - m) break;
      // Bullet dot
      pdf.setFillColor(...COLORS.accent);
      pdf.circle(m + 3, y - 1.2, 1.2, 'F');
      // Bullet text
      const lines = pdf.splitTextToSize(bullet, w - m * 2 - 12);
      pdf.text(lines, m + 8, y);
      y += lines.length * 5.5 + 3;
    }
  }
}

function renderTwoColumnSlide(pdf: jsPDF, slide: SlideData, w: number, h: number, m: number, font: string) {
  pdf.setFillColor(...COLORS.white);
  pdf.rect(0, 0, w, h, 'F');

  // Title
  pdf.setFontSize(18);
  pdf.setTextColor(...COLORS.primary);
  pdf.setFont(font, 'bold');
  pdf.text(slide.title, m, m + 8);

  // Accent bar
  pdf.setFillColor(...COLORS.accent);
  pdf.rect(m, m + 12, 20, 0.8, 'F');

  const colW = (w - m * 3) / 2;
  const startY = m + 22;

  // Divider line
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.3);
  pdf.line(w / 2, startY - 4, w / 2, h - m);

  // Left column
  if (slide.left_heading) {
    pdf.setFontSize(11);
    pdf.setTextColor(...COLORS.accent);
    pdf.setFont(font, 'bold');
    pdf.text(slide.left_heading, m, startY);
  }

  if (slide.left_bullets) {
    pdf.setFontSize(10);
    pdf.setTextColor(...COLORS.text);
    pdf.setFont(font, 'normal');
    let y = startY + 8;
    for (const b of slide.left_bullets) {
      if (y > h - m) break;
      pdf.setFillColor(...COLORS.accent);
      pdf.circle(m + 2, y - 1, 0.8, 'F');
      const lines = pdf.splitTextToSize(b, colW - 10);
      pdf.text(lines, m + 6, y);
      y += lines.length * 4.5 + 2.5;
    }
  }

  // Right column
  const rightX = w / 2 + m / 2;
  if (slide.right_heading) {
    pdf.setFontSize(11);
    pdf.setTextColor(...COLORS.accent);
    pdf.setFont(font, 'bold');
    pdf.text(slide.right_heading, rightX, startY);
  }

  if (slide.right_bullets) {
    pdf.setFontSize(10);
    pdf.setTextColor(...COLORS.text);
    pdf.setFont(font, 'normal');
    let y = startY + 8;
    for (const b of slide.right_bullets) {
      if (y > h - m) break;
      pdf.setFillColor(...COLORS.accent);
      pdf.circle(rightX + 2, y - 1, 0.8, 'F');
      const lines = pdf.splitTextToSize(b, colW - 10);
      pdf.text(lines, rightX + 6, y);
      y += lines.length * 4.5 + 2.5;
    }
  }
}

function renderDiagramSlide(pdf: jsPDF, slide: SlideData, w: number, h: number, m: number, font: string) {
  pdf.setFillColor(...COLORS.white);
  pdf.rect(0, 0, w, h, 'F');

  // Title
  pdf.setFontSize(18);
  pdf.setTextColor(...COLORS.primary);
  pdf.setFont(font, 'bold');
  pdf.text(slide.title, m, m + 8);

  // Accent bar
  pdf.setFillColor(...COLORS.accent);
  pdf.rect(m, m + 12, 20, 0.8, 'F');

  // Show mermaid code as placeholder (PDF can't render diagrams inline easily)
  if (slide.mermaid) {
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.lightText);
    pdf.setFont('courier', 'normal');
    const lines = pdf.splitTextToSize(slide.mermaid, w - m * 2);
    pdf.text(lines, m, m + 22);
  }
}

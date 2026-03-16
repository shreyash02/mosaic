import { jsPDF } from 'jspdf';

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

export function generatePresentationPdf(data: PresentationData, filename?: string) {
  // Landscape A4-ish proportions
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [254, 143] });
  const pageW = 254;
  const pageH = 143;
  const margin = 16;

  for (let i = 0; i < data.slides.length; i++) {
    if (i > 0) pdf.addPage();
    const slide = data.slides[i];

    switch (slide.layout) {
      case 'title':
        renderTitleSlide(pdf, slide, pageW, pageH, margin);
        break;
      case 'section':
        renderSectionSlide(pdf, slide, pageW, pageH, margin);
        break;
      case 'content':
        renderContentSlide(pdf, slide, pageW, pageH, margin);
        break;
      case 'two_column':
        renderTwoColumnSlide(pdf, slide, pageW, pageH, margin);
        break;
      default:
        renderContentSlide(pdf, slide, pageW, pageH, margin);
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

function renderTitleSlide(pdf: jsPDF, slide: SlideData, w: number, h: number, m: number) {
  // Dark background
  pdf.setFillColor(...COLORS.sectionBg);
  pdf.rect(0, 0, w, h, 'F');

  // Title
  pdf.setFontSize(28);
  pdf.setTextColor(...COLORS.white);
  pdf.setFont('helvetica', 'bold');
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
    pdf.setFont('helvetica', 'normal');
    pdf.text(slide.subtitle, m, titleBottom + 14);
  }
}

function renderSectionSlide(pdf: jsPDF, slide: SlideData, w: number, h: number, m: number) {
  // Accent background
  pdf.setFillColor(...COLORS.accentBg);
  pdf.rect(0, 0, w, h, 'F');

  pdf.setFontSize(24);
  pdf.setTextColor(...COLORS.white);
  pdf.setFont('helvetica', 'bold');
  const lines = pdf.splitTextToSize(slide.title, w - m * 2);
  pdf.text(lines, m, h * 0.45);
}

function renderContentSlide(pdf: jsPDF, slide: SlideData, w: number, h: number, m: number) {
  // White background
  pdf.setFillColor(...COLORS.white);
  pdf.rect(0, 0, w, h, 'F');

  // Title
  pdf.setFontSize(18);
  pdf.setTextColor(...COLORS.primary);
  pdf.setFont('helvetica', 'bold');
  pdf.text(slide.title, m, m + 8);

  // Accent bar
  pdf.setFillColor(...COLORS.accent);
  pdf.rect(m, m + 12, 20, 0.8, 'F');

  // Bullets
  if (slide.bullets) {
    pdf.setFontSize(12);
    pdf.setTextColor(...COLORS.text);
    pdf.setFont('helvetica', 'normal');
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

function renderTwoColumnSlide(pdf: jsPDF, slide: SlideData, w: number, h: number, m: number) {
  pdf.setFillColor(...COLORS.white);
  pdf.rect(0, 0, w, h, 'F');

  // Title
  pdf.setFontSize(18);
  pdf.setTextColor(...COLORS.primary);
  pdf.setFont('helvetica', 'bold');
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
    pdf.setFont('helvetica', 'bold');
    pdf.text(slide.left_heading, m, startY);
  }

  if (slide.left_bullets) {
    pdf.setFontSize(10);
    pdf.setTextColor(...COLORS.text);
    pdf.setFont('helvetica', 'normal');
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
    pdf.setFont('helvetica', 'bold');
    pdf.text(slide.right_heading, rightX, startY);
  }

  if (slide.right_bullets) {
    pdf.setFontSize(10);
    pdf.setTextColor(...COLORS.text);
    pdf.setFont('helvetica', 'normal');
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

import { jsPDF } from 'jspdf';

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

async function loadFonts(pdf: jsPDF): Promise<{ heading: string; body: string }> {
  try {
    const [playfairBold, interNormal, interBold] = await Promise.all([
      fetchFont('https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-700-normal.ttf'),
      fetchFont('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf'),
      fetchFont('https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf'),
    ]);
    pdf.addFileToVFS('playfair-bold.ttf', arrayBufferToBase64(playfairBold));
    pdf.addFont('playfair-bold.ttf', 'Playfair', 'bold');
    pdf.addFileToVFS('inter-normal.ttf', arrayBufferToBase64(interNormal));
    pdf.addFont('inter-normal.ttf', 'Inter', 'normal');
    pdf.addFileToVFS('inter-bold.ttf', arrayBufferToBase64(interBold));
    pdf.addFont('inter-bold.ttf', 'Inter', 'bold');
    return { heading: 'Playfair', body: 'Inter' };
  } catch {
    return { heading: 'helvetica', body: 'helvetica' };
  }
}

type RGB = [number, number, number];

interface ColorTheme {
  dark: RGB; accent: RGB; accentLight: RGB;
  text: RGB; textLight: RGB; textMuted: RGB;
  bg: RGB; cardBg: RGB;
}

const THEMES: Record<string, ColorTheme> = {
  light: {
    dark: [25, 25, 45], accent: [79, 70, 229], accentLight: [238, 235, 255],
    text: [45, 45, 65], textLight: [100, 100, 120], textMuted: [155, 155, 170],
    bg: [252, 252, 255], cardBg: [244, 244, 250],
  },
  dark: {
    dark: [240, 240, 255], accent: [129, 120, 255], accentLight: [40, 38, 70],
    text: [210, 210, 225], textLight: [160, 160, 180], textMuted: [110, 110, 130],
    bg: [20, 20, 35], cardBg: [30, 30, 50],
  },
  vibrant: {
    dark: [15, 15, 30], accent: [236, 72, 153], accentLight: [253, 232, 243],
    text: [30, 30, 50], textLight: [90, 90, 110], textMuted: [140, 140, 160],
    bg: [255, 255, 255], cardBg: [252, 245, 250],
  },
};

function parseHexColor(hex: string): RGB | null {
  const clean = hex.replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
  }
  return null;
}

function namedColorToRgb(name: string): RGB | null {
  const map: Record<string, RGB> = {
    red: [220, 38, 38], blue: [59, 130, 246], green: [22, 163, 74],
    purple: [124, 58, 237], orange: [234, 88, 12], teal: [20, 184, 166],
    pink: [236, 72, 153], indigo: [79, 70, 229], yellow: [202, 138, 4],
    cyan: [6, 182, 212], amber: [217, 119, 6], emerald: [5, 150, 105],
  };
  const lower = name.toLowerCase().trim();
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

function darkenColor(rgb: RGB, amount: number): RGB {
  return rgb.map(c => Math.max(0, Math.min(255, Math.floor(c * (1 - amount))))) as RGB;
}

function lightenColor(rgb: RGB, amount: number): RGB {
  return rgb.map(c => Math.max(0, Math.min(255, Math.floor(c + (255 - c) * amount)))) as RGB;
}

function resolveTheme(content: Record<string, any>): ColorTheme {
  const themeName = content.poster_theme || 'light';
  const base = THEMES[themeName] || THEMES.light;

  // Apply custom accent if provided
  const accentStr = content.poster_accent || '';
  if (accentStr) {
    const custom = parseHexColor(accentStr) || namedColorToRgb(accentStr);
    if (custom) {
      return {
        ...base,
        accent: custom,
        accentLight: themeName === 'dark' ? darkenColor(custom, 0.7) : lightenColor(custom, 0.85),
      };
    }
  }
  return base;
}

// ── Font size tiers — the layout engine tries each until content fits ──
interface SizeTier {
  title: number; titleLH: number;
  subtitle: number; subtitleLH: number;
  highlight: number; highlightLH: number;
  sectionHead: number; sectionHeadLH: number;
  point: number; pointLH: number;
  cta: number; ctaLH: number;
}

const TIERS: SizeTier[] = [
  // Tier 0: ideal (large, readable from distance)
  { title: 34, titleLH: 14, subtitle: 14, subtitleLH: 6.5, highlight: 15, highlightLH: 7.5, sectionHead: 14, sectionHeadLH: 6.5, point: 12, pointLH: 6, cta: 18, ctaLH: 8 },
  // Tier 1: slightly smaller
  { title: 30, titleLH: 12, subtitle: 13, subtitleLH: 6, highlight: 13, highlightLH: 6.5, sectionHead: 13, sectionHeadLH: 6, point: 11, pointLH: 5.5, cta: 16, ctaLH: 7 },
  // Tier 2: compact
  { title: 26, titleLH: 10.5, subtitle: 12, subtitleLH: 5.5, highlight: 12, highlightLH: 6, sectionHead: 12, sectionHeadLH: 5.5, point: 10, pointLH: 5, cta: 14, ctaLH: 6.5 },
  // Tier 3: tight (fallback)
  { title: 22, titleLH: 9, subtitle: 11, subtitleLH: 5, highlight: 11, highlightLH: 5.5, sectionHead: 11, sectionHeadLH: 5, point: 9, pointLH: 4.5, cta: 12, ctaLH: 5.5 },
];

export async function generatePosterPdf(content: Record<string, any>) {
  const orientation = (content.orientation || 'landscape') as 'portrait' | 'landscape';
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const fonts = await loadFonts(pdf);
  const C = resolveTheme(content);
  // Helper — jsPDF setFillColor/setTextColor/setDrawColor need explicit r,g,b args
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const fill = (c: RGB) => pdf.setFillColor(clamp(c[0]), clamp(c[1]), clamp(c[2]));
  const text = (c: RGB) => pdf.setTextColor(clamp(c[0]), clamp(c[1]), clamp(c[2]));

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageW - margin * 2;
  const topBarH = 3.5;
  const watermarkH = 10;
  const totalUsableH = pageH - margin - topBarH - watermarkH;
  const gap = 10;
  const colW = (contentW - gap) / 2;

  const sections = content.sections || [];
  const leftSections: any[] = [];
  const rightSections: any[] = [];
  sections.forEach((s: any, i: number) => {
    if (i % 2 === 0) leftSections.push(s);
    else rightSections.push(s);
  });

  // ── PASS 1: Find the best font tier that fits ──
  function measureAll(tier: SizeTier): number {
    let h = margin + topBarH + 4; // top margin + accent bar + gap

    // Title
    if (content.title) {
      pdf.setFont(fonts.heading, 'bold');
      pdf.setFontSize(tier.title);
      h += pdf.splitTextToSize(content.title, contentW).length * tier.titleLH + 2;
    }
    // Subtitle
    if (content.subtitle) {
      pdf.setFont(fonts.body, 'normal');
      pdf.setFontSize(tier.subtitle);
      h += pdf.splitTextToSize(content.subtitle, contentW).length * tier.subtitleLH + 5;
    }
    // Highlight
    if (content.highlight) {
      pdf.setFont(fonts.body, 'bold');
      pdf.setFontSize(tier.highlight);
      h += pdf.splitTextToSize(content.highlight, contentW - 20).length * tier.highlightLH + 16;
    }
    // Sections (tallest column)
    const measureCol = (colSections: any[]): number => {
      let colH = 0;
      for (const section of colSections) {
        pdf.setFont(fonts.body, 'bold');
        pdf.setFontSize(tier.sectionHead);
        const hLines = pdf.splitTextToSize(section.heading || '', colW - 14).length;
        let cardH = hLines * tier.sectionHeadLH + 10; // heading + padding top/bottom
        pdf.setFont(fonts.body, 'normal');
        pdf.setFontSize(tier.point);
        for (const p of (section.points || [])) {
          cardH += pdf.splitTextToSize(p, colW - 22).length * tier.pointLH + 3;
        }
        cardH += 3;
        colH += cardH + 5; // card + min gap
      }
      return colH;
    };
    h += Math.max(measureCol(leftSections), measureCol(rightSections));
    // CTA
    if (content.call_to_action) {
      pdf.setFont(fonts.body, 'bold');
      pdf.setFontSize(tier.cta);
      h += pdf.splitTextToSize(content.call_to_action, contentW).length * tier.ctaLH + 6;
    }
    return h;
  }

  let tier = TIERS[0];
  for (const t of TIERS) {
    tier = t;
    if (measureAll(t) <= totalUsableH) break;
  }

  // ── PASS 2: Compute extra space and distribute evenly across all gaps ──
  const totalContentH = measureAll(tier);
  const slack = Math.max(0, totalUsableH - totalContentH);
  // Count gap slots: before sections + between each card row + before CTA
  const rowCount = Math.ceil(sections.length / 2);
  const gapSlots = 1 + Math.max(rowCount - 1, 0) + (content.call_to_action ? 1 : 0);
  const perGap = gapSlots > 0 ? Math.min(slack / gapSlots, 15) : 0;
  const sectionTopPad = perGap;
  const cardGap = 5 + perGap;

  // ── PASS 3: Render ──
  // Background
  fill(C.bg);
  pdf.rect(0, 0, pageW, pageH, 'F');
  fill(C.accent);
  pdf.rect(0, 0, pageW, topBarH, 'F');

  let y = margin + topBarH + 4;

  // Title
  if (content.title) {
    pdf.setFont(fonts.heading, 'bold');
    pdf.setFontSize(tier.title);
    text(C.dark);
    const lines = pdf.splitTextToSize(content.title, contentW);
    pdf.text(lines, margin, y);
    y += lines.length * tier.titleLH + 2;
  }

  // Subtitle
  if (content.subtitle) {
    pdf.setFont(fonts.body, 'normal');
    pdf.setFontSize(tier.subtitle);
    text(C.textLight);
    const lines = pdf.splitTextToSize(content.subtitle, contentW);
    pdf.text(lines, margin, y);
    y += lines.length * tier.subtitleLH + 5;
  }

  // Highlight
  if (content.highlight) {
    pdf.setFont(fonts.body, 'bold');
    pdf.setFontSize(tier.highlight);
    const hlLines = pdf.splitTextToSize(content.highlight, contentW - 20);
    const boxH = hlLines.length * tier.highlightLH + 12;
    fill(C.accentLight);
    pdf.roundedRect(margin, y, contentW, boxH, 2.5, 2.5, 'F');
    fill(C.accent);
    pdf.rect(margin, y, 3.5, boxH, 'F');
    text(C.dark);
    pdf.text(hlLines, margin + 12, y + tier.highlightLH + 2);
    y += boxH + 6;
  }

  y += sectionTopPad;

  // Sections — render ROW by ROW so left+right cards align horizontally
  if (sections.length > 0) {
    // Build rows: each row has left card and optionally right card
    const rows: Array<{ left: any; right?: any }> = [];
    for (let i = 0; i < sections.length; i += 2) {
      rows.push({ left: sections[i], right: sections[i + 1] });
    }

    // Measure a single card's height
    const measureCard = (section: any): { headingLines: string[]; pointLinesList: string[][]; cardH: number } => {
      pdf.setFont(fonts.body, 'bold');
      pdf.setFontSize(tier.sectionHead);
      const headingLines = pdf.splitTextToSize(section.heading || '', colW - 14);
      let cardH = headingLines.length * tier.sectionHeadLH + 10;
      const pointLinesList: string[][] = [];
      pdf.setFont(fonts.body, 'normal');
      pdf.setFontSize(tier.point);
      for (const p of (section.points || [])) {
        const pLines = pdf.splitTextToSize(p, colW - 22);
        pointLinesList.push(pLines);
        cardH += pLines.length * tier.pointLH + 3;
      }
      cardH += 3;
      return { headingLines, pointLinesList, cardH };
    };

    const drawCard = (section: any, startX: number, cy: number, forcedH: number) => {
      const { headingLines, pointLinesList } = measureCard(section);

      // Card bg — use forcedH so both cards in a row are same height
      fill(C.cardBg);
      pdf.roundedRect(startX, cy, colW, forcedH, 2, 2, 'F');
      fill(C.accent);
      pdf.roundedRect(startX, cy, 3, forcedH, 1.5, 1.5, 'F');

      // Heading
      let innerY = cy + tier.sectionHeadLH + 2;
      pdf.setFont(fonts.body, 'bold');
      pdf.setFontSize(tier.sectionHead);
      text(C.dark);
      pdf.text(headingLines, startX + 10, innerY);
      innerY += headingLines.length * tier.sectionHeadLH + 3;

      // Points
      pdf.setFont(fonts.body, 'normal');
      pdf.setFontSize(tier.point);
      text(C.text);
      for (const pLines of pointLinesList) {
        fill(C.accent);
        pdf.circle(startX + 12.5, innerY - 1, 1, 'F');
        pdf.text(pLines, startX + 17, innerY);
        innerY += pLines.length * tier.pointLH + 3;
      }
    };

    for (const row of rows) {
      const leftM = measureCard(row.left);
      const rightM = row.right ? measureCard(row.right) : null;
      // Both cards in a row get the same height (tallest wins)
      const rowH = rightM ? Math.max(leftM.cardH, rightM.cardH) : leftM.cardH;

      drawCard(row.left, margin, y, rowH);
      if (row.right) {
        drawCard(row.right, margin + colW + gap, y, rowH);
      }
      y += rowH + cardGap;
    }
  }

  // CTA — centered in the remaining space between cards and watermark
  if (content.call_to_action) {
    pdf.setFont(fonts.heading, 'bold');
    pdf.setFontSize(tier.cta);
    const ctaLines = pdf.splitTextToSize(content.call_to_action, contentW);
    const ctaH = ctaLines.length * tier.ctaLH;
    const bottomEdge = pageH - watermarkH;
    const ctaY = y + (bottomEdge - y - ctaH) / 2;
    text(C.accent);
    pdf.text(ctaLines, margin, ctaY);
  }

  // Watermark
  pdf.setFont(fonts.body, 'normal');
  pdf.setFontSize(6.5);
  text(C.textMuted);
  pdf.text('Generated by Mosaic', pageW - margin, pageH - 6, { align: 'right' });

  const title = (content.title || 'poster').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
  pdf.save(`${title}.pdf`);
}

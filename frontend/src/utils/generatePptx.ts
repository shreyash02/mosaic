import pptxgen from 'pptxgenjs';

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

// Colors from the Mosaic design system
const COLORS = {
  primary: '1e293b',      // dark slate
  accent: '3B82F6',       // blue
  text: '334155',         // slate-700
  lightText: '64748b',    // slate-500
  background: 'ffffff',
  sectionBg: '1e293b',
  sectionText: 'ffffff',
  bulletColor: '3B82F6',
};

/** Replace unicode characters that pptxgenjs can't render with ASCII equivalents */
function sanitizeText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")                    // smart quotes
    .replace(/[\u201C\u201D]/g, '"')                    // smart double quotes
    .replace(/[\u2013]/g, '-')                           // en dash
    .replace(/[\u2014]/g, ' - ')                         // em dash
    .replace(/[\u2026]/g, '...');                        // ellipsis
}

function sanitizeSlide(slide: SlideData): SlideData {
  return {
    ...slide,
    title: sanitizeText(slide.title || ''),
    subtitle: slide.subtitle ? sanitizeText(slide.subtitle) : undefined,
    bullets: slide.bullets?.map(sanitizeText),
    left_heading: slide.left_heading ? sanitizeText(slide.left_heading) : undefined,
    left_bullets: slide.left_bullets?.map(sanitizeText),
    right_heading: slide.right_heading ? sanitizeText(slide.right_heading) : undefined,
    right_bullets: slide.right_bullets?.map(sanitizeText),
    notes: slide.notes ? sanitizeText(slide.notes) : undefined,
  };
}

export async function generatePptx(data: PresentationData, filename?: string) {
  const pptx = new pptxgen();

  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches
  pptx.author = 'Mosaic';
  pptx.title = data.title;

  for (const rawSlide of data.slides) {
    const slide = sanitizeSlide(rawSlide);
    switch (slide.layout) {
      case 'title':
        addTitleSlide(pptx, slide);
        break;
      case 'section':
        addSectionSlide(pptx, slide);
        break;
      case 'content':
        addContentSlide(pptx, slide);
        break;
      case 'two_column':
        addTwoColumnSlide(pptx, slide);
        break;
      default:
        addContentSlide(pptx, slide);
    }
  }

  const safeName = (filename || data.title || 'presentation')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 60);

  await pptx.writeFile({ fileName: `${safeName}.pptx` });
}

function addTitleSlide(pptx: pptxgen, slide: SlideData) {
  const s = pptx.addSlide();
  s.background = { color: COLORS.sectionBg };

  s.addText(slide.title, {
    x: 0.8, y: 2.2, w: 11.7, h: 1.5,
    fontSize: 36, fontFace: 'Helvetica Neue', color: COLORS.sectionText, bold: true,
  });

  if (slide.subtitle) {
    s.addText(slide.subtitle, {
      x: 0.8, y: 3.8, w: 11.7, h: 0.8,
      fontSize: 18, fontFace: 'Helvetica Neue', color: COLORS.lightText,
    });
  }

  s.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 3.6, w: 1.5, h: 0.06, fill: { color: COLORS.accent },
  });
}

function addSectionSlide(pptx: pptxgen, slide: SlideData) {
  const s = pptx.addSlide();
  s.background = { color: COLORS.accent };

  s.addText(slide.title, {
    x: 0.8, y: 2.5, w: 11.7, h: 1.5,
    fontSize: 32, fontFace: 'Helvetica Neue', color: COLORS.sectionText, bold: true,
  });
}

function addContentSlide(pptx: pptxgen, slide: SlideData) {
  const s = pptx.addSlide();
  s.background = { color: COLORS.background };

  s.addText(slide.title, {
    x: 0.8, y: 0.4, w: 11.7, h: 0.8,
    fontSize: 24, fontFace: 'Helvetica Neue', color: COLORS.primary, bold: true,
  });

  s.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 1.15, w: 1, h: 0.04, fill: { color: COLORS.accent },
  });

  if (slide.bullets) {
    const bulletItems = slide.bullets.map(b => ({
      text: b,
      options: {
        fontSize: 16, fontFace: 'Helvetica Neue' as const, color: COLORS.text,
        bullet: { type: 'bullet' as const, characterCode: '2022', color: COLORS.accent },
        paraSpaceAfter: 10,
      },
    }));

    s.addText(bulletItems, {
      x: 0.8, y: 1.5, w: 11.7, h: 5.2, valign: 'top',
    });
  }

  if (slide.notes) s.addNotes(slide.notes);
}

function addTwoColumnSlide(pptx: pptxgen, slide: SlideData) {
  const s = pptx.addSlide();
  s.background = { color: COLORS.background };

  s.addText(slide.title, {
    x: 0.8, y: 0.4, w: 11.7, h: 0.8,
    fontSize: 24, fontFace: 'Helvetica Neue', color: COLORS.primary, bold: true,
  });

  s.addShape(pptx.ShapeType.rect, {
    x: 0.8, y: 1.15, w: 1, h: 0.04, fill: { color: COLORS.accent },
  });

  if (slide.left_heading) {
    s.addText(slide.left_heading, {
      x: 0.8, y: 1.5, w: 5.5, h: 0.5,
      fontSize: 16, fontFace: 'Helvetica Neue', color: COLORS.accent, bold: true,
    });
  }

  if (slide.left_bullets) {
    const leftItems = slide.left_bullets.map(b => ({
      text: b,
      options: {
        fontSize: 14, fontFace: 'Helvetica Neue' as const, color: COLORS.text,
        bullet: { type: 'bullet' as const, characterCode: '2022', color: COLORS.accent },
        paraSpaceAfter: 8,
      },
    }));
    s.addText(leftItems, { x: 0.8, y: 2.1, w: 5.5, h: 4.5, valign: 'top' });
  }

  if (slide.right_heading) {
    s.addText(slide.right_heading, {
      x: 7, y: 1.5, w: 5.5, h: 0.5,
      fontSize: 16, fontFace: 'Helvetica Neue', color: COLORS.accent, bold: true,
    });
  }

  if (slide.right_bullets) {
    const rightItems = slide.right_bullets.map(b => ({
      text: b,
      options: {
        fontSize: 14, fontFace: 'Helvetica Neue' as const, color: COLORS.text,
        bullet: { type: 'bullet' as const, characterCode: '2022', color: COLORS.accent },
        paraSpaceAfter: 8,
      },
    }));
    s.addText(rightItems, { x: 7, y: 2.1, w: 5.5, h: 4.5, valign: 'top' });
  }

  s.addShape(pptx.ShapeType.line, {
    x: 6.5, y: 1.5, w: 0, h: 5,
    line: { color: 'e2e8f0', width: 1 },
  });

  if (slide.notes) s.addNotes(slide.notes);
}

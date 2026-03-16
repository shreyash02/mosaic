import pptxgen from 'pptxgenjs';

interface TitleSlide {
  layout: 'title';
  title: string;
  subtitle?: string;
}

interface SectionSlide {
  layout: 'section';
  title: string;
}

interface ContentSlide {
  layout: 'content';
  title: string;
  bullets: string[];
  notes?: string;
}

interface TwoColumnSlide {
  layout: 'two_column';
  title: string;
  left_heading: string;
  left_bullets: string[];
  right_heading: string;
  right_bullets: string[];
  notes?: string;
}

type SlideData = TitleSlide | SectionSlide | ContentSlide | TwoColumnSlide;

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

export function generatePptx(data: PresentationData, filename?: string) {
  const pptx = new pptxgen();

  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches
  pptx.author = 'Mosaic';
  pptx.title = data.title;

  for (const slide of data.slides) {
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
    }
  }

  const safeName = (filename || data.title || 'presentation')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 60);

  pptx.writeFile({ fileName: `${safeName}.pptx` });
}

function addTitleSlide(pptx: pptxgen, slide: TitleSlide) {
  const s = pptx.addSlide();
  s.background = { color: COLORS.sectionBg };

  s.addText(slide.title, {
    x: 0.8,
    y: 2.2,
    w: 11.7,
    h: 1.5,
    fontSize: 36,
    fontFace: 'Helvetica Neue',
    color: COLORS.sectionText,
    bold: true,
  });

  if (slide.subtitle) {
    s.addText(slide.subtitle, {
      x: 0.8,
      y: 3.8,
      w: 11.7,
      h: 0.8,
      fontSize: 18,
      fontFace: 'Helvetica Neue',
      color: COLORS.lightText,
    });
  }

  // Accent bar
  s.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 3.6,
    w: 1.5,
    h: 0.06,
    fill: { color: COLORS.accent },
  });
}

function addSectionSlide(pptx: pptxgen, slide: SectionSlide) {
  const s = pptx.addSlide();
  s.background = { color: COLORS.accent };

  s.addText(slide.title, {
    x: 0.8,
    y: 2.5,
    w: 11.7,
    h: 1.5,
    fontSize: 32,
    fontFace: 'Helvetica Neue',
    color: COLORS.sectionText,
    bold: true,
  });
}

function addContentSlide(pptx: pptxgen, slide: ContentSlide) {
  const s = pptx.addSlide();
  s.background = { color: COLORS.background };

  // Title
  s.addText(slide.title, {
    x: 0.8,
    y: 0.4,
    w: 11.7,
    h: 0.8,
    fontSize: 24,
    fontFace: 'Helvetica Neue',
    color: COLORS.primary,
    bold: true,
  });

  // Accent bar under title
  s.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 1.15,
    w: 1,
    h: 0.04,
    fill: { color: COLORS.accent },
  });

  // Bullets
  const bulletItems = slide.bullets.map(b => ({
    text: b,
    options: {
      fontSize: 16,
      fontFace: 'Helvetica Neue' as const,
      color: COLORS.text,
      bullet: { type: 'bullet' as const, color: COLORS.accent },
      paraSpaceAfter: 10,
    },
  }));

  s.addText(bulletItems, {
    x: 0.8,
    y: 1.5,
    w: 11.7,
    h: 5.2,
    valign: 'top',
  });

  if (slide.notes) {
    s.addNotes(slide.notes);
  }
}

function addTwoColumnSlide(pptx: pptxgen, slide: TwoColumnSlide) {
  const s = pptx.addSlide();
  s.background = { color: COLORS.background };

  // Title
  s.addText(slide.title, {
    x: 0.8,
    y: 0.4,
    w: 11.7,
    h: 0.8,
    fontSize: 24,
    fontFace: 'Helvetica Neue',
    color: COLORS.primary,
    bold: true,
  });

  // Accent bar
  s.addShape(pptx.ShapeType.rect, {
    x: 0.8,
    y: 1.15,
    w: 1,
    h: 0.04,
    fill: { color: COLORS.accent },
  });

  // Left column heading
  s.addText(slide.left_heading, {
    x: 0.8,
    y: 1.5,
    w: 5.5,
    h: 0.5,
    fontSize: 16,
    fontFace: 'Helvetica Neue',
    color: COLORS.accent,
    bold: true,
  });

  // Left bullets
  const leftItems = slide.left_bullets.map(b => ({
    text: b,
    options: {
      fontSize: 14,
      fontFace: 'Helvetica Neue' as const,
      color: COLORS.text,
      bullet: { type: 'bullet' as const, color: COLORS.accent },
      paraSpaceAfter: 8,
    },
  }));

  s.addText(leftItems, {
    x: 0.8,
    y: 2.1,
    w: 5.5,
    h: 4.5,
    valign: 'top',
  });

  // Right column heading
  s.addText(slide.right_heading, {
    x: 7,
    y: 1.5,
    w: 5.5,
    h: 0.5,
    fontSize: 16,
    fontFace: 'Helvetica Neue',
    color: COLORS.accent,
    bold: true,
  });

  // Right bullets
  const rightItems = slide.right_bullets.map(b => ({
    text: b,
    options: {
      fontSize: 14,
      fontFace: 'Helvetica Neue' as const,
      color: COLORS.text,
      bullet: { type: 'bullet' as const, color: COLORS.accent },
      paraSpaceAfter: 8,
    },
  }));

  s.addText(rightItems, {
    x: 7,
    y: 2.1,
    w: 5.5,
    h: 4.5,
    valign: 'top',
  });

  // Divider line
  s.addShape(pptx.ShapeType.line, {
    x: 6.5,
    y: 1.5,
    w: 0,
    h: 5,
    line: { color: 'e2e8f0', width: 1 },
  });

  if (slide.notes) {
    s.addNotes(slide.notes);
  }
}

import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

// ── Markdown conversion per artifact type ──

function summaryToMarkdown(content: Record<string, any>): string {
  const lines: string[] = [];
  if (content.title) lines.push(`# ${content.title}`, '');
  for (const s of content.sections || []) {
    lines.push(`## ${s.heading}`, '');
    lines.push(s.content, '');
  }
  return lines.join('\n');
}

function checklistToMarkdown(content: Record<string, any>): string {
  const lines: string[] = [];
  if (content.title) lines.push(`# ${content.title}`, '');
  for (const item of content.items || []) {
    lines.push(`- **[${(item.priority || '').toUpperCase()}]** ${item.text}`);
    if (item.rationale) lines.push(`  ${item.rationale}`);
    if (item.theme) lines.push(`  *Theme: ${item.theme}*`);
    lines.push('');
  }
  return lines.join('\n');
}

function planToMarkdown(content: Record<string, any>): string {
  const lines: string[] = [];
  if (content.title) lines.push(`# ${content.title}`, '');
  if (content.overview) lines.push(content.overview, '');
  for (let i = 0; i < (content.phases || []).length; i++) {
    const phase = content.phases[i];
    lines.push(`## Phase ${i + 1}: ${phase.name}`, '');
    if (phase.description) lines.push(phase.description, '');
    for (const item of phase.items || []) {
      lines.push(`- ${item}`);
    }
    if (phase.dependencies?.length > 0) {
      lines.push('', `*Depends on: ${phase.dependencies.join(', ')}*`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function decisionBriefToMarkdown(content: Record<string, any>): string {
  const lines: string[] = [];
  if (content.title) lines.push(`# ${content.title}`, '');
  if (content.context) lines.push(content.context, '');
  for (const opt of content.options || []) {
    lines.push(`## ${opt.name}`, '');
    if (opt.effort) lines.push(`*Effort: ${opt.effort}*`, '');
    if (opt.description) lines.push(opt.description, '');
    if (opt.pros?.length > 0) {
      lines.push('**Pros:**');
      for (const p of opt.pros) lines.push(`- ${p}`);
      lines.push('');
    }
    if (opt.cons?.length > 0) {
      lines.push('**Cons:**');
      for (const c of opt.cons) lines.push(`- ${c}`);
      lines.push('');
    }
  }
  if (content.recommendation) {
    lines.push('## Recommendation', '', content.recommendation, '');
  }
  return lines.join('\n');
}

function implementationSpecToMarkdown(content: Record<string, any>): string {
  const lines: string[] = [];
  if (content.title) lines.push(`# ${content.title}`, '');
  if (content.overview) lines.push(content.overview, '');
  if (content.requirements?.length > 0) {
    lines.push('## Requirements', '');
    for (const r of content.requirements) {
      lines.push(`- **[${(r.priority || '').toUpperCase()}]** ${r.text}`);
      if (r.theme) lines.push(`  *Theme: ${r.theme}*`);
    }
    lines.push('');
  }
  for (const s of content.approach || []) {
    lines.push(`## ${s.heading}`, '', s.content, '');
  }
  if (content.risks?.length > 0) {
    lines.push('## Risks', '');
    for (const r of content.risks) {
      lines.push(`- **${r.risk}**`);
      lines.push(`  Mitigation: ${r.mitigation}`, '');
    }
  }
  return lines.join('\n');
}

function talkingPointsToMarkdown(content: Record<string, any>): string {
  const lines: string[] = [];
  if (content.title) lines.push(`# ${content.title}`, '');
  if (content.overview) lines.push(`*${content.overview}*`, '');
  for (const topic of content.topics || []) {
    lines.push(`## ${topic.heading}`, '');
    for (const p of topic.points || []) {
      lines.push(`- ${p}`);
    }
    if (topic.supporting_detail) {
      lines.push('', `  ${topic.supporting_detail}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function retrospectiveToMarkdown(content: Record<string, any>): string {
  const lines: string[] = [];
  if (content.title) lines.push(`# ${content.title}`, '');
  if (content.summary) lines.push(content.summary, '');

  if (content.went_well?.length > 0) {
    lines.push('## What went well', '');
    for (const w of content.went_well) {
      lines.push(`- **${w.point}**`);
      if (w.evidence) lines.push(`  ${w.evidence}`);
    }
    lines.push('');
  }
  if (content.challenges?.length > 0) {
    lines.push('## Challenges', '');
    for (const c of content.challenges) {
      lines.push(`- **${c.point}**`);
      if (c.evidence) lines.push(`  ${c.evidence}`);
    }
    lines.push('');
  }
  if (content.changes?.length > 0) {
    lines.push('## What to change', '');
    for (const c of content.changes) {
      lines.push(`- **${c.point}**`);
      if (c.rationale) lines.push(`  ${c.rationale}`);
    }
    lines.push('');
  }
  if (content.key_takeaways?.length > 0) {
    lines.push('## Key Takeaways', '');
    for (const t of content.key_takeaways) {
      lines.push(`- ${t}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ── Convert artifact JSON to Markdown ──

function artifactToMarkdown(type: string, content: Record<string, any>): string {
  switch (type) {
    case 'summary':
    case 'custom':
      return summaryToMarkdown(content);
    case 'checklist':
      return checklistToMarkdown(content);
    case 'plan':
      return planToMarkdown(content);
    case 'decision_brief':
      return decisionBriefToMarkdown(content);
    case 'implementation_spec':
      return implementationSpecToMarkdown(content);
    case 'talking_points':
      return talkingPointsToMarkdown(content);
    case 'retrospective':
      return retrospectiveToMarkdown(content);
    default:
      return summaryToMarkdown(content);
  }
}

// ── Strip markdown to plain text ──

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')     // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')  // bold
    .replace(/\*(.+?)\*/g, '$1')      // italic
    .replace(/^[-*]\s+/gm, '  - ')    // bullets keep indent
    .replace(/\n{3,}/g, '\n\n');      // collapse blank lines
}

// ── File download helper ──

function downloadTextFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── PDF generation ──

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
    return 'helvetica';
  }
}

async function generateArtifactPdf(title: string, type: string, content: Record<string, any>) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fontName = await loadInterFont(pdf);

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  function checkPage(needed: number) {
    if (y + needed > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
  }

  function writeHeading(text: string, size: number, mb = 4) {
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(size);
    pdf.setTextColor(30, 30, 40);
    const lines = pdf.splitTextToSize(text, contentW);
    const lineH = size * 0.45;
    checkPage(lines.length * lineH + mb);
    pdf.text(lines, margin, y);
    y += lines.length * lineH + mb;
  }

  function writeBody(text: string, mb = 3) {
    // Strip markdown formatting for PDF
    const clean = text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1');
    pdf.setFont(fontName, 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 70);
    const lines = pdf.splitTextToSize(clean, contentW);
    const lineH = 4.5;
    checkPage(lines.length * lineH + mb);
    pdf.text(lines, margin, y);
    y += lines.length * lineH + mb;
  }

  function writeBullet(text: string, indent = 0, mb = 2) {
    const clean = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
    pdf.setFont(fontName, 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 70);
    const bx = margin + indent;
    const bw = contentW - indent - 4;
    const lines = pdf.splitTextToSize(clean, bw);
    const lineH = 4.5;
    checkPage(lines.length * lineH + mb);
    pdf.text('\u2022', bx, y);
    pdf.text(lines, bx + 4, y);
    y += lines.length * lineH + mb;
  }

  function writeLabel(text: string, color: [number, number, number] = [100, 100, 110]) {
    pdf.setFont(fontName, 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...color);
    checkPage(6);
    pdf.text(text.toUpperCase(), margin, y);
    y += 5;
  }

  // Title
  writeHeading(title, 18, 8);

  // Type-specific PDF content
  switch (type) {
    case 'summary':
    case 'custom':
      for (const s of content.sections || []) {
        writeHeading(s.heading, 13, 4);
        for (const p of (s.content || '').split('\n\n')) {
          if (p.trim()) writeBody(p);
        }
        y += 2;
      }
      break;

    case 'checklist':
      for (const item of content.items || []) {
        const priorityLabel = (item.priority || '').toUpperCase();
        const color: [number, number, number] = item.priority === 'high' ? [220, 38, 38]
          : item.priority === 'medium' ? [217, 119, 6] : [100, 100, 120];
        writeLabel(priorityLabel, color);
        writeBullet(item.text);
        if (item.rationale) writeBody(`  ${item.rationale}`);
        if (item.theme) {
          pdf.setFont(fontName, 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(120, 120, 130);
          checkPage(5);
          pdf.text(`Theme: ${item.theme}`, margin + 4, y);
          y += 5;
        }
        y += 1;
      }
      break;

    case 'plan':
      if (content.overview) writeBody(content.overview, 6);
      for (let i = 0; i < (content.phases || []).length; i++) {
        const phase = content.phases[i];
        writeHeading(`Phase ${i + 1}: ${phase.name}`, 13, 3);
        if (phase.description) writeBody(phase.description);
        for (const item of phase.items || []) writeBullet(item);
        if (phase.dependencies?.length > 0) {
          pdf.setFont(fontName, 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(120, 120, 130);
          checkPage(5);
          pdf.text(`Depends on: ${phase.dependencies.join(', ')}`, margin, y);
          y += 5;
        }
        y += 3;
      }
      break;

    case 'decision_brief':
      if (content.context) writeBody(content.context, 6);
      for (const opt of content.options || []) {
        writeHeading(opt.name, 13, 3);
        if (opt.effort) {
          pdf.setFont(fontName, 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(120, 120, 130);
          checkPage(5);
          pdf.text(`Effort: ${opt.effort}`, margin, y);
          y += 5;
        }
        if (opt.description) writeBody(opt.description);
        if (opt.pros?.length > 0) {
          writeLabel('Pros', [22, 163, 74]);
          for (const p of opt.pros) writeBullet(p, 2);
        }
        if (opt.cons?.length > 0) {
          writeLabel('Cons', [220, 38, 38]);
          for (const c of opt.cons) writeBullet(c, 2);
        }
        y += 3;
      }
      if (content.recommendation) {
        writeHeading('Recommendation', 13, 3);
        writeBody(content.recommendation);
      }
      break;

    case 'implementation_spec':
      if (content.overview) writeBody(content.overview, 6);
      if (content.requirements?.length > 0) {
        writeHeading('Requirements', 13, 4);
        for (const r of content.requirements) {
          const color: [number, number, number] = r.priority === 'must' ? [220, 38, 38]
            : r.priority === 'should' ? [217, 119, 6] : [100, 100, 120];
          writeLabel(r.priority || '', color);
          writeBullet(r.text);
        }
        y += 2;
      }
      for (const s of content.approach || []) {
        writeHeading(s.heading, 13, 3);
        writeBody(s.content);
        y += 2;
      }
      if (content.risks?.length > 0) {
        writeHeading('Risks', 13, 4);
        for (const r of content.risks) {
          writeBullet(r.risk);
          writeBody(`  Mitigation: ${r.mitigation}`);
          y += 1;
        }
      }
      break;

    case 'talking_points':
      if (content.overview) {
        pdf.setFont(fontName, 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(80, 80, 90);
        const lines = pdf.splitTextToSize(content.overview, contentW);
        checkPage(lines.length * 4.5 + 6);
        pdf.text(lines, margin, y);
        y += lines.length * 4.5 + 6;
      }
      for (const topic of content.topics || []) {
        writeHeading(topic.heading, 13, 3);
        for (const p of topic.points || []) writeBullet(p);
        if (topic.supporting_detail) {
          pdf.setFont(fontName, 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(100, 100, 110);
          const lines = pdf.splitTextToSize(topic.supporting_detail, contentW - 4);
          checkPage(lines.length * 4 + 4);
          pdf.text(lines, margin + 4, y);
          y += lines.length * 4 + 4;
        }
        y += 3;
      }
      break;

    case 'retrospective':
      if (content.summary) writeBody(content.summary, 6);
      if (content.went_well?.length > 0) {
        writeHeading('What went well', 13, 3);
        for (const w of content.went_well) {
          writeBullet(w.point);
          if (w.evidence) writeBody(`  ${w.evidence}`);
        }
        y += 2;
      }
      if (content.challenges?.length > 0) {
        writeHeading('Challenges', 13, 3);
        for (const c of content.challenges) {
          writeBullet(c.point);
          if (c.evidence) writeBody(`  ${c.evidence}`);
        }
        y += 2;
      }
      if (content.changes?.length > 0) {
        writeHeading('What to change', 13, 3);
        for (const c of content.changes) {
          writeBullet(c.point);
          if (c.rationale) writeBody(`  ${c.rationale}`);
        }
        y += 2;
      }
      if (content.key_takeaways?.length > 0) {
        writeHeading('Key Takeaways', 13, 3);
        for (const t of content.key_takeaways) writeBullet(t);
      }
      break;
  }

  const safeName = (title || 'artifact').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'artifact';
  pdf.save(`${safeName}.pdf`);
}

// ── DOCX generation ──

async function generateArtifactDocx(title: string, type: string, content: Record<string, any>) {
  const children: Paragraph[] = [];

  function addHeading(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1) {
    children.push(new Paragraph({ heading: level, children: [new TextRun({ text, bold: true })] }));
  }

  function addBody(text: string) {
    const clean = text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
    for (const p of clean.split('\n\n')) {
      if (p.trim()) {
        children.push(new Paragraph({
          spacing: { after: 120 },
          children: [new TextRun({ text: p.trim(), size: 22 })],
        }));
      }
    }
  }

  function addBullet(text: string) {
    children.push(new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 80 },
      children: [new TextRun({ text, size: 22 })],
    }));
  }

  function addLabel(text: string, color = '666666') {
    children.push(new Paragraph({
      spacing: { before: 160, after: 40 },
      children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 16, color })],
    }));
  }

  function addSpacer() {
    children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
  }

  // Title
  addHeading(title, HeadingLevel.HEADING_1);
  addSpacer();

  switch (type) {
    case 'summary':
    case 'custom':
      for (const s of content.sections || []) {
        addHeading(s.heading, HeadingLevel.HEADING_2);
        addBody(s.content);
        addSpacer();
      }
      break;

    case 'checklist':
      for (const item of content.items || []) {
        const color = item.priority === 'high' ? 'DC2626' : item.priority === 'medium' ? 'D97706' : '666666';
        addLabel(item.priority || '', color);
        addBullet(item.text);
        if (item.rationale) {
          children.push(new Paragraph({
            indent: { left: 360 },
            spacing: { after: 40 },
            children: [new TextRun({ text: item.rationale, size: 20, color: '666666' })],
          }));
        }
        if (item.theme) {
          children.push(new Paragraph({
            indent: { left: 360 },
            spacing: { after: 80 },
            children: [new TextRun({ text: `Theme: ${item.theme}`, size: 18, italics: true, color: '888888' })],
          }));
        }
      }
      break;

    case 'plan':
      if (content.overview) addBody(content.overview);
      for (let i = 0; i < (content.phases || []).length; i++) {
        const phase = content.phases[i];
        addHeading(`Phase ${i + 1}: ${phase.name}`, HeadingLevel.HEADING_2);
        if (phase.description) addBody(phase.description);
        for (const item of phase.items || []) addBullet(item);
        if (phase.dependencies?.length > 0) {
          children.push(new Paragraph({
            spacing: { before: 40, after: 120 },
            children: [new TextRun({ text: `Depends on: ${phase.dependencies.join(', ')}`, size: 18, italics: true, color: '888888' })],
          }));
        }
        addSpacer();
      }
      break;

    case 'decision_brief':
      if (content.context) addBody(content.context);
      for (const opt of content.options || []) {
        addHeading(opt.name, HeadingLevel.HEADING_2);
        if (opt.effort) {
          children.push(new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: `Effort: ${opt.effort}`, size: 18, color: '888888' })],
          }));
        }
        if (opt.description) addBody(opt.description);
        if (opt.pros?.length > 0) {
          addLabel('Pros', '16A34A');
          for (const p of opt.pros) addBullet(p);
        }
        if (opt.cons?.length > 0) {
          addLabel('Cons', 'DC2626');
          for (const c of opt.cons) addBullet(c);
        }
        addSpacer();
      }
      if (content.recommendation) {
        addHeading('Recommendation', HeadingLevel.HEADING_2);
        addBody(content.recommendation);
      }
      break;

    case 'implementation_spec':
      if (content.overview) addBody(content.overview);
      if (content.requirements?.length > 0) {
        addHeading('Requirements', HeadingLevel.HEADING_2);
        for (const r of content.requirements) {
          const color = r.priority === 'must' ? 'DC2626' : r.priority === 'should' ? 'D97706' : '666666';
          children.push(new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [
              new TextRun({ text: `[${(r.priority || '').toUpperCase()}] `, bold: true, size: 20, color }),
              new TextRun({ text: r.text, size: 22 }),
            ],
          }));
        }
        addSpacer();
      }
      for (const s of content.approach || []) {
        addHeading(s.heading, HeadingLevel.HEADING_2);
        addBody(s.content);
        addSpacer();
      }
      if (content.risks?.length > 0) {
        addHeading('Risks', HeadingLevel.HEADING_2);
        for (const r of content.risks) {
          addBullet(r.risk);
          children.push(new Paragraph({
            indent: { left: 360 },
            spacing: { after: 80 },
            children: [new TextRun({ text: `Mitigation: ${r.mitigation}`, size: 20, color: '666666' })],
          }));
        }
      }
      break;

    case 'talking_points':
      if (content.overview) {
        children.push(new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: content.overview, size: 22, italics: true, color: '555555' })],
        }));
      }
      for (const topic of content.topics || []) {
        addHeading(topic.heading, HeadingLevel.HEADING_2);
        for (const p of topic.points || []) addBullet(p);
        if (topic.supporting_detail) {
          children.push(new Paragraph({
            indent: { left: 360 },
            spacing: { after: 80 },
            children: [new TextRun({ text: topic.supporting_detail, size: 20, color: '666666' })],
          }));
        }
        addSpacer();
      }
      break;

    case 'retrospective':
      if (content.summary) addBody(content.summary);
      if (content.went_well?.length > 0) {
        addHeading('What went well', HeadingLevel.HEADING_2);
        for (const w of content.went_well) {
          addBullet(w.point);
          if (w.evidence) {
            children.push(new Paragraph({
              indent: { left: 360 },
              spacing: { after: 60 },
              children: [new TextRun({ text: w.evidence, size: 20, color: '666666' })],
            }));
          }
        }
        addSpacer();
      }
      if (content.challenges?.length > 0) {
        addHeading('Challenges', HeadingLevel.HEADING_2);
        for (const c of content.challenges) {
          addBullet(c.point);
          if (c.evidence) {
            children.push(new Paragraph({
              indent: { left: 360 },
              spacing: { after: 60 },
              children: [new TextRun({ text: c.evidence, size: 20, color: '666666' })],
            }));
          }
        }
        addSpacer();
      }
      if (content.changes?.length > 0) {
        addHeading('What to change', HeadingLevel.HEADING_2);
        for (const c of content.changes) {
          addBullet(c.point);
          if (c.rationale) {
            children.push(new Paragraph({
              indent: { left: 360 },
              spacing: { after: 60 },
              children: [new TextRun({ text: c.rationale, size: 20, color: '666666' })],
            }));
          }
        }
        addSpacer();
      }
      if (content.key_takeaways?.length > 0) {
        addHeading('Key Takeaways', HeadingLevel.HEADING_2);
        for (const t of content.key_takeaways) addBullet(t);
      }
      break;
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = (title || 'artifact').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'artifact';
  saveAs(blob, `${safeName}.docx`);
}

// ── Public export API ──

export type ExportFormat = 'md' | 'txt' | 'pdf' | 'docx';

export async function exportArtifact(
  format: ExportFormat,
  title: string,
  artifactType: string,
  content: Record<string, any>,
) {
  const safeName = (title || 'artifact').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'artifact';

  switch (format) {
    case 'md': {
      const md = artifactToMarkdown(artifactType, content);
      downloadTextFile(md, `${safeName}.md`, 'text/markdown;charset=utf-8');
      break;
    }
    case 'txt': {
      const md = artifactToMarkdown(artifactType, content);
      const plain = stripMarkdown(md);
      downloadTextFile(plain, `${safeName}.txt`, 'text/plain;charset=utf-8');
      break;
    }
    case 'pdf':
      await generateArtifactPdf(title, artifactType, content);
      break;
    case 'docx':
      await generateArtifactDocx(title, artifactType, content);
      break;
  }
}

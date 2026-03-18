import { useState, useRef, useEffect } from 'react';
import { typography, spacing, borders } from '../styles/tokens';
import { exportArtifact, type ExportFormat } from '../utils/generateArtifactExport';

interface Props {
  title: string;
  artifactType: string;
  content: Record<string, any>;
  size?: 'sm' | 'md';
}

const FORMATS: Array<{ key: ExportFormat; label: string; ext: string }> = [
  { key: 'pdf', label: 'PDF Document', ext: '.pdf' },
  { key: 'docx', label: 'Word Document', ext: '.docx' },
  { key: 'md', label: 'Markdown', ext: '.md' },
  { key: 'txt', label: 'Plain Text', ext: '.txt' },
];

export default function ArtifactExportDropdown({ title, artifactType, content, size = 'md' }: Props) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function handleExport(format: ExportFormat) {
    setExporting(format);
    try {
      await exportArtifact(format, title, artifactType, content);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(null);
      setOpen(false);
    }
  }

  const isSm = size === 'sm';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(prev => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isSm ? spacing[1] : spacing[2],
          padding: isSm ? `${spacing[1]} ${spacing[2]}` : `${spacing[2]} ${spacing[4]}`,
          fontSize: isSm ? typography.fontSize.xs : typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          color: 'var(--color-primary-700)',
          backgroundColor: 'var(--color-primary-100)',
          border: '1px solid var(--color-primary-300)',
          borderRadius: borders.radius.md,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-primary-200)'; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--color-primary-100)'; }}
      >
        <svg width={isSm ? 12 : 14} height={isSm ? 12 : 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 4,
          backgroundColor: 'var(--color-primary-50)',
          border: '1px solid var(--color-primary-200)',
          borderRadius: borders.radius.md,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: spacing[1],
          minWidth: 180,
          zIndex: 30,
        }}>
          {FORMATS.map(f => (
            <button
              key={f.key}
              onClick={() => handleExport(f.key)}
              disabled={exporting !== null}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: `${spacing[2]} ${spacing[3]}`,
                fontSize: typography.fontSize.xs,
                color: exporting === f.key ? 'var(--color-primary-400)' : 'var(--color-primary-700)',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: borders.radius.sm,
                cursor: exporting !== null ? 'wait' : 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (!exporting) e.currentTarget.style.backgroundColor = 'var(--color-primary-100)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span>{f.label}</span>
              <span style={{ color: 'var(--color-primary-400)', fontSize: 10 }}>
                {exporting === f.key ? 'Exporting...' : f.ext}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

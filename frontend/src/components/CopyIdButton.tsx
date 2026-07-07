import { useState } from 'react';

interface CopyIdButtonProps {
  /** The full value copied to the clipboard (e.g. a UUID). */
  value: string;
  /** Optional short label shown next to the icon (e.g. first 8 chars). */
  label?: string;
  title?: string;
}

/**
 * Compact "copy to clipboard" control for admin tables where the full ID is
 * rarely read but often copied. Shows a copy icon (and optional short label)
 * and a brief check on success.
 */
export default function CopyIdButton({ value, label, title }: CopyIdButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — non-fatal
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={title || `Copy ${value}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.15rem 0.25rem',
        borderRadius: '4px',
        color: copied ? 'var(--color-success, #16a34a)' : 'var(--color-primary-500)',
        fontSize: '0.8125rem',
        fontFamily: label ? 'monospace' : 'inherit',
      }}
    >
      {label && <span>{label}</span>}
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 10l4 4 8-8" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="7" y="7" width="9" height="9" rx="1.5" />
          <path d="M4 13V5a1.5 1.5 0 0 1 1.5-1.5H12" />
        </svg>
      )}
    </button>
  );
}

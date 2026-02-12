import React, { useEffect } from 'react';
import { typography, spacing, borders, shadows } from '../styles';

interface BulkConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  isDanger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  results?: {
    succeeded: number;
    failed: number;
    errors?: { id: string; error: string }[];
  };
}

const s = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  dialog: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.xl,
    padding: spacing[8],
    maxWidth: '480px',
    width: '90%',
    boxShadow: shadows.lg,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[4],
  },
  message: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[6],
    lineHeight: typography.lineHeight.relaxed,
  },
  actions: {
    display: 'flex',
    gap: spacing[3],
    justifyContent: 'flex-end',
  },
  button: {
    padding: `${spacing[3]} ${spacing[6]}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    border: 'none',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    color: 'var(--color-primary-900)',
    border: '1px solid var(--color-primary-400)',
  },
  buttonPrimary: {
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
  },
  buttonDanger: {
    backgroundColor: 'var(--color-error)',
    color: 'var(--color-primary-50)',
  },
  results: {
    marginBottom: spacing[6],
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
  },
  resultRow: {
    display: 'flex',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  resultSuccess: {
    color: 'var(--color-success)',
    fontWeight: typography.fontWeight.medium,
  },
  resultFailed: {
    color: 'var(--color-error)',
    fontWeight: typography.fontWeight.medium,
  },
  errorList: {
    marginTop: spacing[3],
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-600)',
    maxHeight: '120px',
    overflowY: 'auto' as const,
    paddingLeft: spacing[4],
  },
  errorItem: {
    marginBottom: spacing[1],
  },
};

export default function BulkConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  isDanger = false,
  isLoading = false,
  onConfirm,
  onCancel,
  results,
}: BulkConfirmDialogProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onCancel();
    }
  };

  const showResults = results !== undefined;
  const hasErrors = results && results.failed > 0 && results.errors && results.errors.length > 0;

  return (
    <div style={s.overlay} onClick={handleOverlayClick}>
      <div style={s.dialog} onClick={e => e.stopPropagation()}>
        <h2 style={s.title}>{showResults ? 'Operation Complete' : title}</h2>

        {showResults ? (
          <div style={s.results}>
            <div style={s.resultRow}>
              <span style={s.resultSuccess}>{results.succeeded} succeeded</span>
              {results.failed > 0 && (
                <span style={s.resultFailed}>{results.failed} failed</span>
              )}
            </div>
            {hasErrors && (
              <div style={s.errorList}>
                {results.errors!.map((err, i) => (
                  <div key={i} style={s.errorItem}>
                    {err.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p style={s.message}>{message}</p>
        )}

        <div style={s.actions}>
          {showResults ? (
            <button
              style={{ ...s.button, ...s.buttonPrimary }}
              onClick={onCancel}
            >
              Done
            </button>
          ) : (
            <>
              <button
                style={{ ...s.button, ...s.buttonSecondary }}
                onClick={onCancel}
                disabled={isLoading}
              >
                {cancelLabel}
              </button>
              <button
                style={{
                  ...s.button,
                  ...(isDanger ? s.buttonDanger : s.buttonPrimary),
                  opacity: isLoading ? 0.5 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
                onClick={onConfirm}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : confirmLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

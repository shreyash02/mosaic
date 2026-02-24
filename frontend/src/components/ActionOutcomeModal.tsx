import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { api } from '../services/api';
import { typography, spacing, borders } from '../styles/tokens';

interface ActionOutcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  actionText: string;
  imageFile: File;
  onComplete: (outcomeText: string, imageUrl: string) => void;
}

type Step = 'describe' | 'interpreting' | 'review';

const s = {
  preview: {
    width: '100%',
    maxHeight: '240px',
    objectFit: 'contain' as const,
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-200)',
    marginBottom: spacing[4],
  },
  actionContext: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    padding: `${spacing[3]} ${spacing[4]}`,
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.md,
    borderLeft: '3px solid var(--color-primary-400)',
    marginBottom: spacing[4],
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[2],
    display: 'block' as const,
  },
  textarea: {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    minHeight: '60px',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: spacing[3],
    marginTop: spacing[5],
  },
  btnPrimary: {
    padding: `${spacing[2]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
  },
  btnSecondary: {
    padding: `${spacing[2]} ${spacing[5]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-300)',
    cursor: 'pointer',
  },
  spinner: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    padding: `${spacing[6]} 0`,
    justifyContent: 'center',
    color: 'var(--color-primary-600)',
    fontSize: typography.fontSize.sm,
  },
  error: {
    color: 'var(--color-error, #ef4444)',
    fontSize: typography.fontSize.sm,
    marginTop: spacing[2],
  },
};

export default function ActionOutcomeModal({
  isOpen,
  onClose,
  spaceId,
  actionText,
  imageFile,
  onComplete,
}: ActionOutcomeModalProps) {
  const [step, setStep] = useState<Step>('describe');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcomeText, setOutcomeText] = useState('');
  const uploadStarted = useRef(false);

  // Create local preview immediately
  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Upload image on mount
  useEffect(() => {
    if (!imageFile || uploadStarted.current) return;
    uploadStarted.current = true;

    async function upload() {
      setUploading(true);
      try {
        const result = await api.uploadImage(imageFile);
        setImageUrl(result.url);
      } catch {
        setError('Failed to upload image. Please try again.');
      } finally {
        setUploading(false);
      }
    }
    upload();
  }, [imageFile]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('describe');
      setDescription('');
      setError(null);
      setOutcomeText('');
      uploadStarted.current = false;
      setImageUrl(null);
    }
  }, [isOpen]);

  async function handleInterpret() {
    if (!imageUrl) return;
    setError(null);
    setStep('interpreting');

    try {
      const result = await api.interpretActionOutcomeImage(
        spaceId,
        imageUrl,
        actionText,
        description || undefined,
      );

      if (result.outcome_text) {
        setOutcomeText(result.outcome_text);
        setStep('review');
      } else {
        setError('Could not interpret the outcome. Try adding a description.');
        setStep('describe');
      }
    } catch {
      setError('Failed to analyze image. Please try again.');
      setStep('describe');
    }
  }

  function handleComplete() {
    if (!imageUrl || !outcomeText.trim()) return;
    onComplete(outcomeText.trim(), imageUrl);
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Action"
      maxWidth="560px"
      closeOnOverlayClick={step !== 'interpreting'}
      closeOnEscape={step !== 'interpreting'}
    >
      {/* Action context */}
      <div style={s.actionContext}>
        {actionText}
      </div>

      {/* Image preview */}
      {previewUrl && (
        <img src={previewUrl} alt="Outcome" style={s.preview} />
      )}

      {/* Uploading indicator */}
      {uploading && (
        <div style={s.spinner}>
          <SpinnerIcon /> Uploading image...
        </div>
      )}

      {/* Step 1: Describe */}
      {step === 'describe' && !uploading && (
        <>
          <label style={s.label}>Anything to add? (optional)</label>
          <textarea
            style={s.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. This shows the redesigned header we shipped..."
            rows={2}
          />
          {error && <div style={s.error}>{error}</div>}
          <div style={s.buttonRow}>
            <button style={s.btnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button
              style={{
                ...s.btnPrimary,
                opacity: !imageUrl ? 0.5 : 1,
              }}
              onClick={handleInterpret}
              disabled={!imageUrl}
            >
              Interpret Outcome
            </button>
          </div>
        </>
      )}

      {/* Step 2: Interpreting */}
      {step === 'interpreting' && (
        <div style={s.spinner}>
          <SpinnerIcon /> Analyzing your outcome...
        </div>
      )}

      {/* Step 3: Review */}
      {step === 'review' && (
        <>
          <label style={s.label}>Outcome summary:</label>
          <textarea
            style={s.textarea}
            value={outcomeText}
            onChange={(e) => setOutcomeText(e.target.value)}
            rows={3}
            autoFocus
          />
          {error && <div style={s.error}>{error}</div>}
          <div style={s.buttonRow}>
            <button style={s.btnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button
              style={{
                ...s.btnPrimary,
                opacity: !outcomeText.trim() ? 0.5 : 1,
              }}
              onClick={handleComplete}
              disabled={!outcomeText.trim()}
            >
              Complete Action
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

/** Simple CSS-animated spinner */
function SpinnerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        animation: 'spin 1s linear infinite',
        flexShrink: 0,
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

import { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import CustomCheckbox from './CustomCheckbox';
import { api } from '../services/api';
import type { SpaceIdea, ImageExtractionResult } from '../types';
import { typography, spacing, borders } from '../styles/tokens';

interface ImageIdeaModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  imageFile: File;
  onIdeasCreated: (ideas: SpaceIdea[]) => void;
  isSuggester?: boolean;
}

type Step = 'describe' | 'extracting' | 'clarifying' | 'review';

interface ReviewIdea {
  text: string;
  selected: boolean;
}

const s = {
  preview: {
    width: '100%',
    maxHeight: '240px',
    objectFit: 'contain' as const,
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-200)',
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
  questionBlock: {
    marginBottom: spacing[4],
  },
  questionLabel: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-800)',
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[2],
  },
  answerInput: {
    width: '100%',
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  reviewItem: {
    display: 'flex',
    gap: spacing[3],
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  reviewTextarea: {
    flex: 1,
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    minHeight: '40px',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  error: {
    color: 'var(--color-error, #ef4444)',
    fontSize: typography.fontSize.sm,
    marginTop: spacing[2],
  },
  addAnother: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: `${spacing[1]} 0`,
    textDecoration: 'underline',
  },
};

export default function ImageIdeaModal({
  isOpen,
  onClose,
  spaceId,
  imageFile,
  onIdeasCreated,
  isSuggester = false,
}: ImageIdeaModalProps) {
  const [step, setStep] = useState<Step>('describe');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [reviewIdeas, setReviewIdeas] = useState<ReviewIdea[]>([]);
  const [creating, setCreating] = useState(false);
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
      setQuestions([]);
      setAnswers([]);
      setReviewIdeas([]);
      setCreating(false);
      uploadStarted.current = false;
      setImageUrl(null);
    }
  }, [isOpen]);

  async function handleExtract() {
    if (!imageUrl) return;
    setError(null);
    setStep('extracting');

    try {
      const result: ImageExtractionResult = await api.extractIdeasFromImage(
        spaceId,
        imageUrl,
        description || undefined,
      );

      if (result.status === 'needs_clarification' && result.questions.length > 0) {
        setQuestions(result.questions);
        setAnswers(new Array(result.questions.length).fill(''));
        setStep('clarifying');
      } else if (result.ideas.length > 0) {
        setReviewIdeas(result.ideas.map((i) => ({ text: i.text, selected: true })));
        setStep('review');
      } else {
        setError('No ideas could be extracted from this image. Try adding a description.');
        setStep('describe');
      }
    } catch {
      setError('Failed to analyze image. Please try again.');
      setStep('describe');
    }
  }

  async function handleClarify() {
    if (!imageUrl) return;
    setError(null);
    setStep('extracting');

    try {
      const result: ImageExtractionResult = await api.clarifyImageExtraction(
        spaceId,
        imageUrl,
        description || undefined,
        questions,
        answers,
      );

      if (result.ideas.length > 0) {
        setReviewIdeas(result.ideas.map((i) => ({ text: i.text, selected: true })));
        setStep('review');
      } else {
        setError('No ideas could be extracted. Try describing what caught your eye.');
        setStep('describe');
      }
    } catch {
      setError('Failed to analyze image. Please try again.');
      setStep('describe');
    }
  }

  function handleAddAnother() {
    setReviewIdeas((prev) => [...prev, { text: '', selected: true }]);
  }

  async function handleConfirm() {
    const selectedIdeas = reviewIdeas.filter((i) => i.selected && i.text.trim());
    if (selectedIdeas.length === 0) return;

    setCreating(true);
    setError(null);

    try {
      const ideas = selectedIdeas.map((i) => ({
        text: i.text.trim(),
        image_url: imageUrl || undefined,
      }));
      const created = await api.createIdeasBatch(spaceId, ideas);
      onIdeasCreated(created);
      onClose();
    } catch {
      setError('Failed to create ideas. Please try again.');
      setCreating(false);
    }
  }

  const selectedCount = reviewIdeas.filter((i) => i.selected && i.text.trim()).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add from Image"
      maxWidth="560px"
      closeOnOverlayClick={step !== 'extracting'}
      closeOnEscape={step !== 'extracting'}
    >
      {/* Image preview */}
      {previewUrl && (
        <img src={previewUrl} alt="Selected" style={s.preview} />
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
          <label style={s.label}>What caught your eye? (optional)</label>
          <textarea
            style={s.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. The warm color palette, the layout of the space..."
            rows={3}
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
              onClick={handleExtract}
              disabled={!imageUrl}
            >
              Extract Ideas
            </button>
          </div>
        </>
      )}

      {/* Step 2: Extracting */}
      {step === 'extracting' && (
        <div style={s.spinner}>
          <SpinnerIcon /> Interpreting your image...
        </div>
      )}

      {/* Step 3: Clarifying */}
      {step === 'clarifying' && (
        <>
          <div style={{
            fontSize: typography.fontSize.sm,
            color: 'var(--color-primary-600)',
            marginBottom: spacing[4],
          }}>
            A few questions to better understand:
          </div>
          {questions.map((q, idx) => (
            <div key={idx} style={s.questionBlock}>
              <div style={s.questionLabel}>{q}</div>
              <input
                type="text"
                style={s.answerInput}
                value={answers[idx] || ''}
                onChange={(e) => {
                  const next = [...answers];
                  next[idx] = e.target.value;
                  setAnswers(next);
                }}
                placeholder="Your answer..."
              />
            </div>
          ))}
          {error && <div style={s.error}>{error}</div>}
          <div style={s.buttonRow}>
            <button style={s.btnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button
              style={{
                ...s.btnPrimary,
                opacity: answers.some((a) => a.trim()) ? 1 : 0.5,
              }}
              onClick={handleClarify}
              disabled={!answers.some((a) => a.trim())}
            >
              Submit Answers
            </button>
          </div>
        </>
      )}

      {/* Step 4: Review */}
      {step === 'review' && (
        <>
          <div style={{
            fontSize: typography.fontSize.sm,
            color: 'var(--color-primary-600)',
            marginBottom: spacing[4],
          }}>
            We found {reviewIdeas.length} idea{reviewIdeas.length !== 1 ? 's' : ''}:
          </div>
          {reviewIdeas.map((idea, idx) => (
            <div key={idx} style={s.reviewItem}>
              <div style={{ marginTop: '4px', flexShrink: 0 }}>
                <CustomCheckbox
                  checked={idea.selected}
                  onChange={(checked) => {
                    const next = [...reviewIdeas];
                    next[idx] = { ...next[idx], selected: checked };
                    setReviewIdeas(next);
                  }}
                />
              </div>
              <textarea
                style={s.reviewTextarea}
                value={idea.text}
                onChange={(e) => {
                  const next = [...reviewIdeas];
                  next[idx] = { ...next[idx], text: e.target.value };
                  setReviewIdeas(next);
                }}
                rows={2}
              />
            </div>
          ))}
          <button style={s.addAnother} onClick={handleAddAnother}>
            + Add another idea
          </button>
          {error && <div style={s.error}>{error}</div>}
          <div style={s.buttonRow}>
            <button style={s.btnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button
              style={{
                ...s.btnPrimary,
                opacity: selectedCount === 0 || creating ? 0.5 : 1,
              }}
              onClick={handleConfirm}
              disabled={selectedCount === 0 || creating}
            >
              {creating
                ? 'Adding...'
                : `${isSuggester ? 'Suggest' : 'Add'} ${selectedCount} Idea${selectedCount !== 1 ? 's' : ''}`}
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

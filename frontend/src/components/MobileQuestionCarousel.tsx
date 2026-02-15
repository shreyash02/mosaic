import React, { useState, useRef, useCallback, useEffect } from 'react';
import { typography, spacing, borders, shadows, transitions } from '../styles';
import type { Question, ResponseItem } from '../types';
import RatingButtons from './RatingButtons';

interface MobileQuestionCarouselProps {
  questions: Question[];
  responses: ResponseItem[];
  maxResponseLength: number;
  onUpdateResponse: (questionId: string, text: string) => void;
  onUpdateRatingResponse: (questionId: string, rating: number) => void;
  onUpdatePollResponse: (questionId: string, selected: string | string[]) => void;
  onImageClick?: (imageUrl: string) => void;
}

const styles = {
  container: {
    position: 'relative' as const,
    overflow: 'hidden',
  },
  progressBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    marginBottom: spacing[4],
    padding: `0 ${spacing[2]}`,
  },
  progressDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary-200)',
    transition: transitions.duration.fast,
  },
  progressDotActive: {
    backgroundColor: 'var(--color-primary-900)',
    width: '24px',
    borderRadius: '4px',
  },
  progressDotAnswered: {
    backgroundColor: 'var(--color-primary-500)',
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    textAlign: 'center' as const,
    marginBottom: spacing[2],
  },
  carouselWrapper: {
    display: 'flex',
    transition: 'transform 0.3s ease-out',
    touchAction: 'pan-y pinch-zoom',
  },
  questionSlide: {
    flexShrink: 0,
    width: '100%',
    padding: `0 ${spacing[1]}`,
    boxSizing: 'border-box' as const,
  },
  card: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: `1px solid ${'var(--color-primary-200)'}`,
    padding: spacing[5],
    boxShadow: shadows.sm,
    minHeight: '200px',
  },
  label: {
    display: 'block',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[3],
    lineHeight: typography.lineHeight.relaxed,
  },
  questionImage: {
    marginBottom: spacing[3],
    borderRadius: borders.radius.md,
    overflow: 'hidden',
    maxHeight: '200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-primary-50)',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    padding: spacing[3],
    fontSize: typography.fontSize.base,
    fontFamily: 'inherit',
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
    transition: transitions.duration.normal,
    minHeight: '120px',
  },
  charCount: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    marginTop: spacing[1],
    textAlign: 'right' as const,
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[4],
    gap: spacing[3],
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[3]} ${spacing[4]}`,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-300)'}`,
    cursor: 'pointer',
    transition: transitions.duration.normal,
    minWidth: '100px',
    minHeight: '48px',
  },
  navButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  navButtonPrimary: {
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    border: 'none',
  },
  pageIndicator: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    fontWeight: typography.fontWeight.medium,
  },
  pollInput: {
    marginTop: spacing[2],
  },
  pollInstruction: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[3],
  },
  radioOption: {
    marginBottom: spacing[2],
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-50)',
    border: `1px solid ${'var(--color-primary-200)'}`,
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    transition: transitions.duration.normal,
    minHeight: '56px',
    WebkitTapHighlightColor: 'transparent',
  },
  radioInput: {
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    width: '24px',
    height: '24px',
    border: '2px solid var(--color-primary-400)',
    borderRadius: '50%',
    position: 'relative' as const,
    flexShrink: 0,
    cursor: 'pointer',
    backgroundColor: 'var(--color-primary-50)',
    transition: transitions.duration.normal,
  },
  radioInputChecked: {
    borderColor: 'var(--color-primary-900)',
    backgroundColor: 'var(--color-primary-900)',
  },
  checkboxInput: {
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
    width: '24px',
    height: '24px',
    border: '2px solid var(--color-primary-400)',
    borderRadius: borders.radius.sm,
    position: 'relative' as const,
    flexShrink: 0,
    cursor: 'pointer',
    backgroundColor: 'var(--color-primary-50)',
    transition: transitions.duration.normal,
  },
  checkboxInputChecked: {
    borderColor: 'var(--color-primary-900)',
    backgroundColor: 'var(--color-primary-900)',
  },
  swipeHint: {
    textAlign: 'center' as const,
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-400)',
    marginTop: spacing[2],
  },
};

// Minimum swipe distance to trigger navigation
const SWIPE_THRESHOLD = 50;

export default function MobileQuestionCarousel({
  questions,
  responses,
  maxResponseLength,
  onUpdateResponse,
  onUpdateRatingResponse,
  onUpdatePollResponse,
  onImageClick,
}: MobileQuestionCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  }, [questions.length]);

  const goNext = useCallback(() => {
    goToQuestion(currentIndex + 1);
  }, [currentIndex, goToQuestion]);

  const goPrevious = useCallback(() => {
    goToQuestion(currentIndex - 1);
  }, [currentIndex, goToQuestion]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);

    // Calculate drag offset for visual feedback
    const diff = currentTouch - touchStart;
    // Limit drag to reasonable bounds
    const maxDrag = 100;
    const limitedDiff = Math.max(-maxDrag, Math.min(maxDrag, diff));
    setDragOffset(limitedDiff);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setDragOffset(0);

    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > SWIPE_THRESHOLD;
    const isRightSwipe = distance < -SWIPE_THRESHOLD;

    if (isLeftSwipe && currentIndex < questions.length - 1) {
      goNext();
    }
    if (isRightSwipe && currentIndex > 0) {
      goPrevious();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrevious]);

  // Check if a question is answered
  const isQuestionAnswered = (question: Question, response?: ResponseItem): boolean => {
    if (!response) return false;

    if (question.question_type === 'text' || !question.question_type) {
      return !!response.response_text?.trim();
    } else if (question.question_type === 'rating') {
      return response.response_data?.rating !== undefined;
    } else if (question.question_type === 'single_choice') {
      return !!response.response_data?.selected;
    } else if (question.question_type === 'multiple_choice') {
      return Array.isArray(response.response_data?.selected) && response.response_data.selected.length > 0;
    }
    return false;
  };

  const renderQuestion = (question: Question, index: number) => {
    const response = responses.find((r) => r.question_id === question.id);

    return (
      <div key={question.id} style={styles.questionSlide}>
        <div style={styles.card}>
          <label style={styles.label}>
            {index + 1}. {question.question_text}
            {question.is_required && <span style={{ color: 'var(--color-primary-600)', marginLeft: '4px' }}>*</span>}
          </label>

          {question.question_image_url && (
            <div
              onClick={() => onImageClick?.(question.question_image_url!)}
              style={styles.questionImage}
              title="Click to enlarge"
            >
              <img
                src={question.question_image_url}
                alt={`Image for question ${index + 1}`}
                style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px', objectFit: 'contain' }}
              />
            </div>
          )}

          {(!question.question_type || question.question_type === 'text') && (
            <>
              <textarea
                value={response?.response_text || ''}
                onChange={(e) => onUpdateResponse(question.id, e.target.value)}
                placeholder="Type your response here..."
                rows={4}
                maxLength={maxResponseLength}
                style={styles.textarea}
              />
              <div style={styles.charCount}>
                {response?.response_text?.length || 0} / {maxResponseLength} characters
              </div>
            </>
          )}

          {question.question_type === 'rating' && (
            <RatingButtons
              min={question.options?.min || 0}
              max={question.options?.max || 10}
              step={question.options?.step || 1}
              value={response?.response_data?.rating ?? null}
              onChange={(rating) => onUpdateRatingResponse(question.id, rating)}
              minLabel={question.options?.min_label}
              maxLabel={question.options?.max_label}
            />
          )}

          {question.question_type === 'single_choice' && (
            <div style={styles.pollInput}>
              {question.options?.choices?.map((choice) => {
                const isSelected = response?.response_data?.selected === choice.id;
                return (
                  <div key={choice.id} style={styles.radioOption}>
                    <label style={styles.radioLabel}>
                      <span
                        style={{
                          ...styles.radioInput,
                          ...(isSelected ? styles.radioInputChecked : {}),
                        }}
                      >
                        {isSelected && (
                          <span style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-primary-50)',
                          }} />
                        )}
                      </span>
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={choice.id}
                        checked={isSelected}
                        onChange={(e) => onUpdatePollResponse(question.id, e.target.value)}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                      />
                      <span>{choice.label}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          )}

          {question.question_type === 'multiple_choice' && (
            <div style={styles.pollInput}>
              <p style={styles.pollInstruction}>
                Select up to {question.options?.max_selections || question.options?.choices?.length} option(s)
              </p>
              {question.options?.choices?.map((choice) => {
                const isSelected = (response?.response_data?.selected as string[] || []).includes(choice.id);
                return (
                  <div key={choice.id} style={styles.radioOption}>
                    <label style={styles.radioLabel}>
                      <span
                        style={{
                          ...styles.checkboxInput,
                          ...(isSelected ? styles.checkboxInputChecked : {}),
                        }}
                      >
                        {isSelected && (
                          <svg
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              width: '14px',
                              height: '14px',
                            }}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--color-primary-50)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </span>
                      <input
                        type="checkbox"
                        value={choice.id}
                        checked={isSelected}
                        onChange={(e) => {
                          const currentSelected = (response?.response_data?.selected as string[]) || [];
                          const newSelected = e.target.checked
                            ? [...currentSelected, choice.id]
                            : currentSelected.filter(id => id !== choice.id);
                          const maxSelections = question.options?.max_selections || question.options?.choices?.length || 999;
                          if (newSelected.length <= maxSelections) {
                            onUpdatePollResponse(question.id, newSelected);
                          }
                        }}
                        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                      />
                      <span>{choice.label}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container} ref={containerRef}>
      {/* Progress text */}
      <div style={styles.progressText}>
        Question {currentIndex + 1} of {questions.length}
      </div>

      {/* Progress dots */}
      <div style={styles.progressBar}>
        {questions.map((q, i) => {
          const response = responses.find(r => r.question_id === q.id);
          const answered = isQuestionAnswered(q, response);
          const isActive = i === currentIndex;

          return (
            <button
              key={q.id}
              onClick={() => goToQuestion(i)}
              style={{
                ...styles.progressDot,
                ...(isActive ? styles.progressDotActive : {}),
                ...(answered && !isActive ? styles.progressDotAnswered : {}),
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
              aria-label={`Go to question ${i + 1}${answered ? ' (answered)' : ''}`}
            />
          );
        })}
      </div>

      {/* Question carousel */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          ...styles.carouselWrapper,
          transform: `translateX(calc(-${currentIndex * 100}% + ${isDragging ? dragOffset : 0}px))`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {questions.map((question, index) => renderQuestion(question, index))}
      </div>

      {/* Navigation buttons */}
      <div style={styles.navigation}>
        <button
          type="button"
          onClick={goPrevious}
          disabled={currentIndex === 0}
          style={{
            ...styles.navButton,
            ...(currentIndex === 0 ? styles.navButtonDisabled : {}),
          }}
        >
          ← Previous
        </button>

        <span style={styles.pageIndicator}>
          {currentIndex + 1} / {questions.length}
        </span>

        {currentIndex < questions.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            style={{
              ...styles.navButton,
              ...styles.navButtonPrimary,
            }}
          >
            Next →
          </button>
        ) : (
          <div style={{ minWidth: '100px' }} /> // Placeholder to maintain layout
        )}
      </div>

      <div style={styles.swipeHint}>
        Swipe left or right to navigate
      </div>
    </div>
  );
}

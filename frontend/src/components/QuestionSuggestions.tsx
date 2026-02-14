import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { QuestionSuggestionItem } from '../types';
import { colors, typography, spacing, borders } from '../styles/tokens';

interface QuestionSuggestionsProps {
  title: string;
  description: string;
  existingQuestions: string[];
  onAddQuestion: (question: {
    text: string;
    type: string;
    options?: {
      scale_min?: number;
      scale_max?: number;
      scale_min_label?: string;
      scale_max_label?: string;
      choices?: { id: string; label: string; order: number }[];
    };
  }) => void;
  dismissed: boolean;
  onDismiss: () => void;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: colors.primary[100],
    borderRadius: borders.radius.lg,
    border: `1px solid ${colors.primary[300]}`,
    padding: spacing[4],
    marginBottom: spacing[6],
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  sparkleIcon: {
    color: colors.primary[600],
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[800],
    margin: 0,
  },
  basedOn: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[600],
    marginBottom: spacing[3],
  },
  suggestionsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[2],
  },
  suggestionCard: {
    backgroundColor: colors.primary[50],
    borderRadius: borders.radius.md,
    border: `1px solid ${colors.primary[200]}`,
    padding: spacing[3],
  },
  suggestionText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[900],
    margin: 0,
    marginBottom: spacing[2],
    lineHeight: typography.lineHeight.relaxed,
  },
  suggestionActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing[3],
  },
  whyButton: {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: typography.fontSize.xs,
    color: colors.primary[500],
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },
  addButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: `${spacing[1]} ${spacing[2]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[700],
    backgroundColor: colors.primary[200],
    border: 'none',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  rationale: {
    marginTop: spacing[2],
    padding: spacing[2],
    backgroundColor: colors.primary[100],
    borderRadius: borders.radius.sm,
    fontSize: typography.fontSize.xs,
    color: colors.primary[600],
    lineHeight: typography.lineHeight.relaxed,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[4],
    paddingTop: spacing[3],
    borderTop: `1px solid ${colors.primary[200]}`,
  },
  refreshButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: `${spacing[1]} ${spacing[2]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[600],
    backgroundColor: 'transparent',
    border: `1px solid ${colors.primary[300]}`,
    borderRadius: borders.radius.md,
    cursor: 'pointer',
  },
  dismissButton: {
    background: 'none',
    border: 'none',
    padding: `${spacing[1]} ${spacing[2]}`,
    fontSize: typography.fontSize.xs,
    color: colors.primary[500],
    cursor: 'pointer',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    color: colors.primary[600],
    fontSize: typography.fontSize.sm,
  },
  error: {
    padding: spacing[3],
    backgroundColor: colors.semantic.error.light,
    color: colors.semantic.error.text,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
  },
  emptyState: {
    padding: spacing[4],
    textAlign: 'center' as const,
    color: colors.primary[600],
    fontSize: typography.fontSize.sm,
  },
  showSuggestionsLink: {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
    marginBottom: spacing[4],
  },
  typeTag: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[500],
    marginLeft: spacing[2],
  },
};

export default function QuestionSuggestions({
  title,
  description,
  existingQuestions,
  onAddQuestion,
  dismissed,
  onDismiss,
}: QuestionSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<QuestionSuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRationale, setExpandedRationale] = useState<Set<number>>(new Set());
  const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set());

  const canFetch = title.trim().length > 0;

  const fetchSuggestions = async () => {
    if (!canFetch) return;

    setLoading(true);
    setError(null);
    setAddedIndices(new Set());

    try {
      const response = await api.suggestQuestions(
        title,
        description,
        existingQuestions,
        5
      );
      setSuggestions(response.suggestions);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
      setError('Failed to load suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount if we have a title and not dismissed
  useEffect(() => {
    if (canFetch && !dismissed && suggestions.length === 0) {
      fetchSuggestions();
    }
  }, []);

  const toggleRationale = (index: number) => {
    const newExpanded = new Set(expandedRationale);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRationale(newExpanded);
  };

  const handleAdd = (suggestion: QuestionSuggestionItem, index: number) => {
    // Convert options to the format expected by the form
    let options: any = undefined;
    if (suggestion.question_type === 'rating' && suggestion.options) {
      options = {
        scale_min: suggestion.options.scale_min || 1,
        scale_max: suggestion.options.scale_max || 5,
        scale_min_label: suggestion.options.scale_min_label || '',
        scale_max_label: suggestion.options.scale_max_label || '',
      };
    }

    onAddQuestion({
      text: suggestion.text,
      type: suggestion.question_type,
      options,
    });

    // Mark as added
    setAddedIndices(new Set([...addedIndices, index]));
  };

  // If dismissed, show a link to bring it back
  if (dismissed) {
    return (
      <button
        type="button"
        style={styles.showSuggestionsLink}
        onClick={onDismiss}
      >
        Show AI suggestions
      </button>
    );
  }

  // If no title, show disabled state
  if (!canFetch) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <SparkleIcon />
            <h4 style={styles.title}>AI Suggestions</h4>
          </div>
        </div>
        <p style={styles.emptyState}>
          Add a title and description to get question suggestions.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <SparkleIcon />
          <h4 style={styles.title}>AI Suggestions</h4>
        </div>
      </div>

      {title && (
        <p style={styles.basedOn}>
          Based on: "{title.length > 50 ? title.slice(0, 50) + '...' : title}"
        </p>
      )}

      {loading && (
        <div style={styles.loading}>
          <span>Generating suggestions...</span>
        </div>
      )}

      {error && (
        <div style={styles.error}>{error}</div>
      )}

      {!loading && !error && suggestions.length === 0 && (
        <div style={styles.emptyState}>
          <button
            type="button"
            style={styles.refreshButton}
            onClick={fetchSuggestions}
          >
            <RefreshIcon />
            Generate suggestions
          </button>
        </div>
      )}

      {!loading && !error && suggestions.length > 0 && (
        <>
          <div style={styles.suggestionsList}>
            {suggestions.map((suggestion, index) => {
              const isAdded = addedIndices.has(index);
              const isExpanded = expandedRationale.has(index);

              return (
                <div key={index} style={{
                  ...styles.suggestionCard,
                  opacity: isAdded ? 0.6 : 1,
                }}>
                  <p style={styles.suggestionText}>
                    {suggestion.text}
                    {suggestion.question_type !== 'text' && (
                      <span style={styles.typeTag}>
                        ({suggestion.question_type === 'rating' ? '1-5 scale' : suggestion.question_type.replace('_', ' ')})
                      </span>
                    )}
                  </p>

                  <div style={styles.suggestionActions}>
                    <button
                      type="button"
                      style={styles.whyButton}
                      onClick={() => toggleRationale(index)}
                    >
                      {isExpanded ? 'hide why' : 'why'}
                    </button>
                    <button
                      type="button"
                      style={{
                        ...styles.addButton,
                        opacity: isAdded ? 0.5 : 1,
                        cursor: isAdded ? 'default' : 'pointer',
                      }}
                      onClick={() => !isAdded && handleAdd(suggestion, index)}
                      disabled={isAdded}
                    >
                      {isAdded ? (
                        <>
                          <CheckIcon />
                          Added
                        </>
                      ) : (
                        <>
                          <PlusIcon />
                          Add
                        </>
                      )}
                    </button>
                  </div>

                  {isExpanded && (
                    <div style={styles.rationale}>
                      {suggestion.rationale}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={styles.footer}>
            <button
              type="button"
              style={styles.refreshButton}
              onClick={fetchSuggestions}
            >
              <RefreshIcon />
              Refresh
            </button>
            <button
              type="button"
              style={styles.dismissButton}
              onClick={onDismiss}
            >
              Dismiss
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Icons
function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={styles.sparkleIcon}>
      <path d="M8 0L9.5 5.5L15 7L9.5 8.5L8 14L6.5 8.5L1 7L6.5 5.5L8 0Z" fill="currentColor" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v4h4" />
      <path d="M15 12v-4h-4" />
      <path d="M13.7 5.5a6 6 0 0 0-11.2 1" />
      <path d="M2.3 10.5a6 6 0 0 0 11.2-1" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="13 4 6 11 3 8" />
    </svg>
  );
}

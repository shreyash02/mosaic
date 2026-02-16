import { useState, type ReactNode } from 'react';
import { api } from '../services/api';
import type { SuggestedAction, ActionType, ActionPriority } from '../types';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { SearchIcon, MegaphoneIcon, LightningIcon, SparklesIcon, TrendingIcon } from './icons';

interface SuggestedActionsProps {
  conversationId: string;
  analysisId: string;
  isCreator: boolean;
  initialActions?: SuggestedAction[];
}

const ACTION_TYPE_CONFIG: Record<ActionType, { label: string; icon: ReactNode }> = {
  investigate: { label: 'Investigate', icon: <SearchIcon size={14} /> },
  communicate: { label: 'Communicate', icon: <MegaphoneIcon size={14} /> },
  change: { label: 'Change', icon: <LightningIcon size={14} /> },
  celebrate: { label: 'Celebrate', icon: <SparklesIcon size={14} /> },
  monitor: { label: 'Monitor', icon: <TrendingIcon size={14} /> },
};

const PRIORITY_CONFIG: Record<ActionPriority, { label: string; bg: string; text: string; border: string }> = {
  high: {
    label: 'High priority',
    bg: 'var(--color-error-light, #fef2f2)',
    text: 'var(--color-error-text, #991b1b)',
    border: 'var(--color-error-main, #ef4444)',
  },
  medium: {
    label: 'Medium',
    bg: 'var(--color-warning-light, #fffbeb)',
    text: 'var(--color-warning-text, #92400e)',
    border: 'var(--color-warning-main, #f59e0b)',
  },
  low: {
    label: 'Low',
    bg: 'var(--color-success-light, #f0fdf4)',
    text: 'var(--color-success-text, #166534)',
    border: 'var(--color-success-main, #22c55e)',
  },
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: '1px solid var(--color-primary-200)',
    padding: spacing[6],
    marginBottom: spacing[6],
    boxShadow: shadows.sm,
  },
  cardTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    margin: 0,
    marginBottom: spacing[4],
  },
  generateButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[3]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    border: 'none',
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    transition: transitions.duration.fast,
  },
  regenerateButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-primary-600)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    transition: transitions.duration.fast,
  },
  actionItem: {
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: 0,
    marginBottom: spacing[3],
    borderLeft: '4px solid var(--color-primary-400)',
  },
  actionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
    flexWrap: 'wrap' as const,
  },
  actionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
    flex: '1 1 auto',
  },
  actionDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    margin: 0,
    lineHeight: typography.lineHeight.relaxed,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: `${spacing[0.5]} ${spacing[2]}`,
    borderRadius: borders.radius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    whiteSpace: 'nowrap' as const,
  },
  typeBadge: {
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-700)',
  },
  pctBadge: {
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-600)',
    fontSize: typography.fontSize.xs,
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    color: 'var(--color-primary-600)',
    fontSize: typography.fontSize.sm,
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid var(--color-primary-300)',
    borderTopColor: 'var(--color-primary-900)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  error: {
    padding: spacing[4],
    backgroundColor: 'var(--color-error-light, #fef2f2)',
    borderRadius: borders.radius.md,
    color: 'var(--color-error-text, #991b1b)',
    fontSize: typography.fontSize.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  retryButton: {
    padding: `${spacing[1]} ${spacing[3]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-error-text, #991b1b)',
    border: '1px solid var(--color-error-main, #ef4444)',
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.xs,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: spacing[3],
    borderTop: '1px solid var(--color-primary-100)',
    marginTop: spacing[2],
  },
  emptyPrompt: {
    textAlign: 'center' as const,
    padding: `${spacing[6]} ${spacing[4]}`,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    marginBottom: spacing[4],
  },
};

function prioritySort(a: SuggestedAction, b: SuggestedAction): number {
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
}

export default function SuggestedActions({
  conversationId,
  analysisId,
  isCreator,
  initialActions,
}: SuggestedActionsProps) {
  const [actions, setActions] = useState<SuggestedAction[]>(
    initialActions ? [...initialActions].sort(prioritySort) : [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasActions = actions.length > 0;

  const handleGenerate = async (regenerate = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.generateSuggestedActions(conversationId, analysisId, regenerate);
      setActions([...response.actions].sort(prioritySort));
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (detail?.code === 'LIMIT_REACHED') {
        setError(`Monthly limit reached (${detail.usage}/${detail.limit}). Upgrade for more.`);
      } else if (err.response?.status === 403) {
        setError('AI suggested actions is not available for your account.');
      } else {
        setError('Failed to generate actions. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Non-creator with no actions: don't render
  if (!isCreator && !hasActions) return null;

  return (
    <div style={styles.card}>
      {/* Spinner keyframe — injected once */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <h2 style={styles.cardTitle}>Suggested Actions</h2>

      {/* Empty state — creator can generate */}
      {!hasActions && !loading && !error && isCreator && (
        <div style={styles.emptyPrompt}>
          <p style={styles.emptyText}>
            Get AI-suggested next steps based on this analysis.
          </p>
          <button
            style={styles.generateButton}
            onClick={() => handleGenerate(false)}
          >
            Get Suggested Actions
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          Generating suggested actions...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={styles.error}>
          <span>{error}</span>
          <button style={styles.retryButton} onClick={() => handleGenerate(false)}>
            Retry
          </button>
        </div>
      )}

      {/* Action list */}
      {hasActions && !loading && (
        <>
          <p style={styles.subtitle}>
            {actions.some(a => a.source === 'auto_generated')
              ? 'Auto-suggested based on your feedback patterns.'
              : 'AI-generated suggestions based on your feedback.'}
          </p>
          {actions.map((action) => {
            const priorityCfg = PRIORITY_CONFIG[action.priority];
            const typeCfg = ACTION_TYPE_CONFIG[action.action_type];

            return (
              <div
                key={action.id}
                style={{
                  ...styles.actionItem,
                  borderLeftColor: priorityCfg.border,
                }}
              >
                <div style={styles.actionHeader}>
                  <h3 style={styles.actionTitle}>{action.title}</h3>
                  <span
                    style={{
                      ...styles.badge,
                      backgroundColor: priorityCfg.bg,
                      color: priorityCfg.text,
                    }}
                  >
                    {priorityCfg.label}
                  </span>
                  <span style={{ ...styles.badge, ...styles.typeBadge }}>
                    {typeCfg.icon} {typeCfg.label}
                  </span>
                  {action.response_percentage != null && (
                    <span style={{ ...styles.badge, ...styles.pctBadge }}>
                      ~{Math.round(action.response_percentage)}% of responses
                    </span>
                  )}
                </div>
                <p style={styles.actionDescription}>{action.description}</p>
              </div>
            );
          })}

          {/* Regenerate footer — creator only */}
          {isCreator && (
            <div style={styles.footer}>
              <button
                style={styles.regenerateButton}
                onClick={() => handleGenerate(true)}
              >
                Regenerate
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

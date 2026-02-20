import { Link } from 'react-router-dom';
import { typography, spacing, borders, shadows } from '../styles';
import FocusTrap from './FocusTrap';

interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  limit: number;
  usage: number;
}

const s = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: spacing[4],
  },
  modal: {
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.xl,
    boxShadow: shadows.lg,
    maxWidth: '420px',
    width: '100%',
    overflow: 'hidden',
  },
  header: {
    padding: spacing[6],
    paddingBottom: spacing[4],
    textAlign: 'center' as const,
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: borders.radius.full,
    backgroundColor: 'var(--color-warning-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    marginBottom: spacing[4],
  },
  icon: {
    color: 'var(--color-warning)',
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
    marginBottom: spacing[2],
  },
  body: {
    padding: `0 ${spacing[6]}`,
    paddingBottom: spacing[6],
  },
  message: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
    textAlign: 'center' as const,
    margin: 0,
    marginBottom: spacing[4],
    lineHeight: 1.5,
  },
  usageBox: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  usageLabel: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    marginBottom: spacing[2],
    textAlign: 'center' as const,
  },
  usageBar: {
    height: '8px',
    backgroundColor: 'var(--color-primary-200)',
    borderRadius: borders.radius.full,
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  usageFill: {
    height: '100%',
    backgroundColor: 'var(--color-error)',
    borderRadius: borders.radius.full,
    width: '100%',
  },
  usageText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    textAlign: 'center' as const,
    fontWeight: typography.fontWeight.medium,
  },
  footer: {
    padding: spacing[4],
    paddingTop: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[3],
  },
  buttonPrimary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    padding: `${spacing[3]} ${spacing[4]}`,
    backgroundColor: 'var(--color-primary-600)',
    color: 'var(--color-primary-50)',
    border: 'none',
    borderRadius: borders.radius.lg,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background-color 0.15s ease',
  },
  buttonSecondary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[3]} ${spacing[4]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-primary-600)',
    border: 'none',
    borderRadius: borders.radius.lg,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  resetInfo: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-400)',
    textAlign: 'center' as const,
    marginTop: spacing[2],
  },
};

const FEATURE_LABELS: Record<string, string> = {
  ai_analysis: 'AI Analysis',
  series_analysis: 'Collection Analysis',
  ai_question_suggestions: 'AI Question Suggestions',
  ai_suggested_actions: 'AI Suggested Actions',
  journal_analyses: 'Journal Analysis',
};

export default function LimitReachedModal({
  isOpen,
  onClose,
  feature,
  limit,
  usage,
}: LimitReachedModalProps) {
  if (!isOpen) return null;

  const featureLabel = FEATURE_LABELS[feature] || feature;

  return (
    <div style={s.overlay} onClick={onClose}>
      <FocusTrap isActive={isOpen}>
        <div style={s.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div style={s.header}>
            <div style={s.iconWrapper}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={s.icon}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 style={s.title}>Limit Reached</h2>
          </div>

          <div style={s.body}>
            <p style={s.message}>
              You've used all your {featureLabel.toLowerCase()} for this month.
            </p>

            <div style={s.usageBox}>
              <div style={s.usageLabel}>{featureLabel}</div>
              <div style={s.usageBar}>
                <div style={s.usageFill} />
              </div>
              <div style={s.usageText}>
                {usage} / {limit} used
              </div>
            </div>

            <p style={s.resetInfo}>
              Limits reset on the 1st of each month
            </p>
          </div>

          <div style={s.footer}>
            <Link to="/settings/usage" style={s.buttonPrimary} onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20V10M18 20V4M6 20v-4" />
              </svg>
              View Usage Details
            </Link>
            <button style={s.buttonSecondary} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}

/**
 * Helper to check if an error is a LIMIT_REACHED error
 */
export function isLimitReachedError(error: any): {
  isLimitReached: boolean;
  feature: string;
  limit: number;
  usage: number;
} {
  const detail = error?.response?.data?.detail;

  if (detail && typeof detail === 'object' && detail.code === 'LIMIT_REACHED') {
    return {
      isLimitReached: true,
      feature: detail.feature || 'unknown',
      limit: detail.limit || 0,
      usage: detail.usage || 0,
    };
  }

  return {
    isLimitReached: false,
    feature: '',
    limit: 0,
    usage: 0,
  };
}

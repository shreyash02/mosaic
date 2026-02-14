import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { useOnboarding, OnboardingStep } from '../hooks/useOnboarding';

interface GettingStartedChecklistProps {
  /** Variant of the checklist */
  variant?: 'card' | 'compact' | 'floating';
  /** Whether to show the dismiss button */
  showDismiss?: boolean;
  /** Callback when a step is clicked */
  onStepClick?: (stepId: string) => void;
}

const stepLinks: Record<string, string> = {
  'create-conversation': '/conversations/new',
  'share-link': '/conversations',
  'receive-response': '/conversations',
  'run-analysis': '/conversations',
  'view-insights': '/conversations',
};

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
  </svg>
);

const CircleIcon = ({ number }: { number: number }) => (
  <span
    style={{
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      border: '2px solid var(--color-primary-400)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      color: 'var(--color-primary-500)',
    }}
  >
    {number}
  </span>
);

const ProgressBar = ({ progress }: { progress: number }) => (
  <div
    style={{
      height: '6px',
      backgroundColor: 'var(--color-primary-200)',
      borderRadius: borders.radius.full,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        height: '100%',
        width: `${progress}%`,
        backgroundColor: 'var(--color-success)',
        borderRadius: borders.radius.full,
        transition: 'width 300ms ease-out',
      }}
    />
  </div>
);

export default function GettingStartedChecklist({
  variant = 'card',
  showDismiss = true,
  onStepClick,
}: GettingStartedChecklistProps) {
  const { getSteps, getProgress, isComplete, dismiss, isDismissed, isLoading } = useOnboarding();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [celebrateComplete, setCelebrateComplete] = useState(false);

  const steps = getSteps();
  const progress = getProgress();
  const complete = isComplete();

  useEffect(() => {
    if (complete && !celebrateComplete) {
      setCelebrateComplete(true);
      // Auto-collapse after celebration
      setTimeout(() => {
        setIsCollapsed(true);
      }, 3000);
    }
  }, [complete, celebrateComplete]);

  // Don't render while loading to avoid showing stale/default data
  if (isLoading || isDismissed()) {
    return null;
  }

  const baseStyles: React.CSSProperties = {
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.lg,
    overflow: 'hidden',
  };

  const cardStyles: React.CSSProperties = {
    ...baseStyles,
    padding: spacing[5],
  };

  const floatingStyles: React.CSSProperties = {
    ...baseStyles,
    position: 'fixed',
    bottom: spacing[6],
    right: spacing[6],
    width: '320px',
    boxShadow: shadows.lg,
    zIndex: 50,
  };

  const compactStyles: React.CSSProperties = {
    ...baseStyles,
    padding: spacing[4],
  };

  const containerStyle =
    variant === 'floating' ? floatingStyles : variant === 'compact' ? compactStyles : cardStyles;

  const renderStepItem = (step: OnboardingStep, index: number) => {
    const stepStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'flex-start',
      gap: spacing[3],
      padding: `${spacing[3]} ${spacing[2]}`,
      borderRadius: borders.radius.md,
      textDecoration: 'none',
      color: 'inherit',
      cursor: step.completed ? 'default' : 'pointer',
      transition: transitions.duration.fast,
      backgroundColor: 'transparent',
    };

    const stepContent = (
      <>
        <div style={{ flexShrink: 0, marginTop: '2px' }}>
          {step.completed ? (
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-success)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckIcon />
            </span>
          ) : (
            <CircleIcon number={index + 1} />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: step.completed ? 'var(--color-primary-500)' : 'var(--color-primary-900)',
              textDecoration: step.completed ? 'line-through' : 'none',
              marginBottom: '2px',
            }}
          >
            {step.title}
          </div>
          {variant !== 'compact' && (
            <div
              style={{
                fontSize: typography.fontSize.xs,
                color: 'var(--color-primary-500)',
              }}
            >
              {step.description}
            </div>
          )}
        </div>
      </>
    );

    if (step.completed) {
      return (
        <div
          key={step.id}
          onClick={() => onStepClick?.(step.id)}
          style={stepStyle}
        >
          {stepContent}
        </div>
      );
    }

    return (
      <Link
        key={step.id}
        to={stepLinks[step.id] || '/conversations'}
        onClick={() => onStepClick?.(step.id)}
        style={stepStyle}
        className="checklist-step-hover"
      >
        {stepContent}
      </Link>
    );
  };

  return (
    <>
      <style>{`
        .checklist-step-hover:hover {
          background-color: var(--color-primary-100) !important;
        }
        .checklist-dismiss:hover {
          opacity: 1 !important;
        }
        .checklist-collapse:hover {
          background-color: var(--color-primary-200) !important;
        }
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-20px) rotate(180deg); opacity: 0; }
        }
        .celebrate-icon {
          animation: confetti 0.6s ease-out forwards;
        }
      `}</style>

      <div style={containerStyle}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: isCollapsed ? 0 : spacing[4],
            padding: variant === 'floating' ? spacing[4] : 0,
            paddingBottom: variant === 'floating' && !isCollapsed ? 0 : undefined,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
            <h3
              style={{
                margin: 0,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.semibold,
                color: 'var(--color-primary-900)',
              }}
            >
              {complete ? (
                <>
                  <span className={celebrateComplete ? 'celebrate-icon' : ''} style={{ marginRight: spacing[2] }}>
                    🎉
                  </span>
                  All done!
                </>
              ) : (
                'Getting Started'
              )}
            </h3>
            <span
              style={{
                fontSize: typography.fontSize.xs,
                color: 'var(--color-primary-500)',
              }}
            >
              {progress}% complete
            </span>
          </div>
          <div style={{ display: 'flex', gap: spacing[1] }}>
            {variant === 'floating' && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="checklist-collapse"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: spacing[1],
                  cursor: 'pointer',
                  borderRadius: borders.radius.sm,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{
                    transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 200ms',
                  }}
                >
                  <path d="M4 6L8 10L12 6" />
                </svg>
              </button>
            )}
            {showDismiss && (
              <button
                onClick={dismiss}
                className="checklist-dismiss"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: spacing[1],
                  cursor: 'pointer',
                  opacity: 0.5,
                  color: 'var(--color-primary-600)',
                }}
                aria-label="Dismiss checklist"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {!isCollapsed && (
          <div style={{ marginBottom: spacing[4], padding: variant === 'floating' ? `0 ${spacing[4]}` : 0 }}>
            <ProgressBar progress={progress} />
          </div>
        )}

        {/* Steps list */}
        {!isCollapsed && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing[1],
              padding: variant === 'floating' ? `0 ${spacing[2]} ${spacing[2]}` : 0,
            }}
          >
            {steps.map((step, index) => renderStepItem(step, index))}
          </div>
        )}

        {/* Completion message */}
        {complete && !isCollapsed && (
          <div
            style={{
              marginTop: spacing[4],
              padding: spacing[3],
              backgroundColor: 'var(--color-success-light, #ecfdf5)',
              borderRadius: borders.radius.md,
              textAlign: 'center',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: typography.fontSize.sm,
                color: 'var(--color-success-text, #065f46)',
              }}
            >
              You're all set! You've completed the basics.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Minimal inline version for header/nav
 */
export function OnboardingProgress() {
  const { getProgress, isComplete, isDismissed, isLoading } = useOnboarding();

  if (isLoading || isDismissed() || isComplete()) {
    return null;
  }

  const progress = getProgress();

  return (
    <Link
      to="/dashboard"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[2],
        padding: `${spacing[1]} ${spacing[3]}`,
        backgroundColor: 'var(--color-primary-100)',
        borderRadius: borders.radius.full,
        textDecoration: 'none',
        fontSize: typography.fontSize.xs,
        color: 'var(--color-primary-700)',
      }}
    >
      <div
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          border: '2px solid var(--color-primary-300)',
          borderTopColor: 'var(--color-primary-700)',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8px',
            fontWeight: typography.fontWeight.bold,
          }}
        >
          {Math.round(progress / 20)}
        </span>
      </div>
      <span>Setup</span>
    </Link>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { typography, spacing, borders, shadows, mediaQueries } from '../styles/tokens';
import FocusTrap from './FocusTrap';

const WELCOME_SEEN_KEY = 'mosaic_welcome_seen';

interface WelcomeModalProps {
  userName?: string;
}

// Icons for the feature cards
const ConversationIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="6" width="24" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
    <path d="M8 12H24M8 16H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const PrivacyIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4L6 8V14C6 20.63 10.28 26.79 16 28C21.72 26.79 26 20.63 26 14V8L16 4Z" stroke="currentColor" strokeWidth="2" fill="none" />
    <path d="M12 16L15 19L21 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AnalysisIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
    <rect x="8" y="14" width="4" height="10" rx="1" fill="currentColor" />
    <rect x="14" y="10" width="4" height="14" rx="1" fill="currentColor" />
    <rect x="20" y="16" width="4" height="8" rx="1" fill="currentColor" />
  </svg>
);

const TemplateIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="4" width="20" height="24" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
    <path d="M10 10H22M10 14H22M10 18H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="24" cy="24" r="6" fill="var(--color-primary-900)" />
    <path d="M22 24H26M24 22V26" stroke="var(--color-primary-50)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Use CSS custom properties for dark mode support
const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: spacing[4],
  },
  modal: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.xl,
    maxWidth: '560px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: shadows.lg,
  },
  header: {
    padding: `${spacing[8]} ${spacing[8]} ${spacing[4]}`,
    textAlign: 'center' as const,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    margin: 0,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
    margin: 0,
    lineHeight: typography.lineHeight.relaxed,
  },
  content: {
    padding: `0 ${spacing[8]} ${spacing[6]}`,
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: spacing[4],
    marginTop: spacing[6],
  },
  featureCard: {
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.lg,
    padding: spacing[5],
    textAlign: 'left' as const,
  },
  featureIcon: {
    color: 'var(--color-primary-700)',
    marginBottom: spacing[3],
  },
  featureTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
    marginBottom: spacing[1],
  },
  featureDescription: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-600)',
    margin: 0,
    lineHeight: typography.lineHeight.relaxed,
  },
  stepIndicator: {
    display: 'flex',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[6],
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: borders.radius.full,
    backgroundColor: 'var(--color-primary-300)',
    transition: 'background-color 200ms',
  },
  dotActive: {
    backgroundColor: 'var(--color-primary-900)',
  },
  footer: {
    padding: `${spacing[4]} ${spacing[8]} ${spacing[8]}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[3],
  },
  skipButton: {
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-600)',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
  },
  nextButton: {
    padding: `${spacing[3]} ${spacing[6]}`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-50)',
    backgroundColor: 'var(--color-primary-900)',
    border: 'none',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  ctaSection: {
    textAlign: 'center' as const,
    padding: `${spacing[4]} 0`,
  },
  ctaTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
    marginBottom: spacing[2],
  },
  ctaDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    margin: 0,
    marginBottom: spacing[6],
  },
  ctaButton: {
    padding: `${spacing[4]} ${spacing[8]}`,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-50)',
    backgroundColor: 'var(--color-primary-900)',
    border: 'none',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  tipBox: {
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.lg,
    padding: spacing[4],
    marginTop: spacing[6],
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing[3],
    textAlign: 'left' as const,
  },
  tipIcon: {
    color: 'var(--color-primary-700)',
    flexShrink: 0,
  },
  tipText: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-600)',
    margin: 0,
    lineHeight: typography.lineHeight.relaxed,
  },
};

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Mosaic!',
    subtitle: 'Collect meaningful feedback from your team and let AI help you discover insights.',
  },
  {
    id: 'features',
    title: 'How it works',
    subtitle: 'Four key concepts to get you started',
  },
  {
    id: 'getStarted',
    title: "You're all set!",
    subtitle: 'Create your first conversation to start collecting feedback.',
  },
];

export default function WelcomeModal({ userName }: WelcomeModalProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has already seen the welcome modal
    const hasSeenWelcome = localStorage.getItem(WELCOME_SEEN_KEY);
    if (!hasSeenWelcome) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(WELCOME_SEEN_KEY, 'true');
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateConversation = () => {
    handleClose();
    navigate('/create/conversation/intent');
  };

  if (!isOpen) return null;

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <>
      <style>{`
        @media ${mediaQueries.mobile} {
          .welcome-modal {
            max-height: 85vh !important;
          }
          .welcome-feature-grid {
            grid-template-columns: 1fr !important;
          }
          .welcome-footer {
            flex-direction: column !important;
          }
          .welcome-footer button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
      <FocusTrap isActive={isOpen} onEscape={handleClose}>
        <div style={styles.overlay} onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="welcome-modal-title">
          <div
            style={styles.modal}
            className="welcome-modal"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div style={styles.header}>
            <h2 id="welcome-modal-title" style={styles.title}>
              {isFirstStep && userName ? `Welcome, ${userName}!` : step.title}
            </h2>
            <p style={styles.subtitle}>{step.subtitle}</p>
          </div>

          {/* Content */}
          <div style={styles.content}>
            {currentStep === 1 && (
              <div style={styles.featureGrid} className="welcome-feature-grid">
                <div style={styles.featureCard}>
                  <div style={styles.featureIcon}>
                    <ConversationIcon />
                  </div>
                  <h3 style={styles.featureTitle}>Conversations</h3>
                  <p style={styles.featureDescription}>
                    Create feedback sessions with custom questions. Invite participants via email or share a link.
                  </p>
                </div>

                <div style={styles.featureCard}>
                  <div style={styles.featureIcon}>
                    <PrivacyIcon />
                  </div>
                  <h3 style={styles.featureTitle}>Privacy Controls</h3>
                  <p style={styles.featureDescription}>
                    Choose anonymity levels and who can see results. Build trust with your team.
                  </p>
                </div>

                <div style={styles.featureCard}>
                  <div style={styles.featureIcon}>
                    <AnalysisIcon />
                  </div>
                  <h3 style={styles.featureTitle}>AI Analysis</h3>
                  <p style={styles.featureDescription}>
                    Automatically discover themes and insights from responses. No manual reading required.
                  </p>
                </div>

                <div style={styles.featureCard}>
                  <div style={styles.featureIcon}>
                    <TemplateIcon />
                  </div>
                  <h3 style={styles.featureTitle}>Templates</h3>
                  <p style={styles.featureDescription}>
                    Save conversations as templates for recurring feedback like retros or check-ins.
                  </p>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div style={styles.ctaSection}>
                <button
                  style={styles.ctaButton}
                  onClick={handleCreateConversation}
                >
                  Create Your First Conversation
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8H13M9 4L13 8L9 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <div style={styles.tipBox}>
                  <div style={styles.tipIcon}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p style={styles.tipText}>
                    <strong>Tip:</strong> Start with a simple team check-in or retrospective. You can explore more advanced features like collections and recurring conversations later.
                  </p>
                </div>

                <div style={styles.tipBox}>
                  <div style={styles.tipIcon}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p style={styles.tipText}>
                    <strong>Need help?</strong> Access the Help section from the top bar on desktop or the menu on mobile for guides and support.
                  </p>
                </div>
              </div>
            )}

            {/* Step indicator */}
            <div style={styles.stepIndicator}>
              {STEPS.map((_, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.dot,
                    ...(index === currentStep ? styles.dotActive : {}),
                  }}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={styles.footer} className="welcome-footer">
            {isFirstStep ? (
              <button style={styles.skipButton} onClick={handleClose}>
                Skip intro
              </button>
            ) : (
              <button style={styles.skipButton} onClick={handleBack}>
                ← Back
              </button>
            )}

            {!isLastStep ? (
              <button style={styles.nextButton} onClick={handleNext}>
                {isFirstStep ? "Let's go" : 'Next'}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8H13M9 4L13 8L9 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ) : (
              <button style={styles.skipButton} onClick={handleClose}>
                Maybe later
              </button>
            )}
          </div>
        </div>
      </div>
    </FocusTrap>
    </>
  );
}

// Export a function to reset the welcome state (useful for testing)
export function resetWelcomeState() {
  localStorage.removeItem(WELCOME_SEEN_KEY);
}

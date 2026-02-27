import { Link } from 'react-router-dom';
import { typography, spacing, borders, shadows } from '../styles/tokens';
import { useFeature } from '../contexts/FeaturesContext';
import { useChecklist } from '../hooks/useChecklist';
import GettingStartedChecklist from './GettingStartedChecklist';

interface EmptyDashboardProps {
  userName?: string;
  isPersonalWorkspace?: boolean;
  workspaceName?: string;
  isReturningUser?: boolean;
}

// Icon components used in Quick Start cards
const FeedbackIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect x="4" y="6" width="24" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M8 12H24M8 16H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const TemplatesIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect x="6" y="4" width="20" height="24" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M10 10H22M10 14H18M10 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  hero: {
    textAlign: 'center' as const,
    marginBottom: spacing[6],
    padding: `${spacing[8]} ${spacing[4]} ${spacing[4]}`,
  },
  greeting: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[3],
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: 'var(--color-primary-600)',
    maxWidth: '500px',
    margin: '0 auto',
    lineHeight: typography.lineHeight.relaxed,
  },
  quickStart: {
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.xl,
    padding: spacing[6],
    marginBottom: spacing[6],
  },
  quickStartTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
    textAlign: 'center' as const,
  },
  quickStartGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: spacing[4],
    maxWidth: '720px',
    margin: '0 auto',
  },
  quickStartCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[6]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    textDecoration: 'none',
    color: 'inherit',
    textAlign: 'center' as const,
    border: '1px solid var(--color-primary-200)',
    transition: 'border-color 150ms, transform 150ms, box-shadow 150ms',
  },
  quickStartIcon: {
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.lg,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[1],
  },
  quickStartLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
  },
  quickStartHint: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
  },
  quickStartAi: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-400)',
    lineHeight: typography.lineHeight.relaxed,
  },
  footerText: {
    textAlign: 'center' as const,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    lineHeight: typography.lineHeight.relaxed,
  },
  footerLink: {
    color: 'var(--color-primary-700)',
    fontWeight: typography.fontWeight.medium,
    textDecoration: 'underline',
  },
};

export default function EmptyDashboard({ userName, isPersonalWorkspace = true, workspaceName = 'Personal', isReturningUser = false }: EmptyDashboardProps) {
  const templatesEnabled = useFeature('templates');
  const journalsEnabled = useFeature('journals');
  const spacesEnabled = useFeature('spaces');

  const { isComplete: isConvChecklistComplete, isDismissed: isConvChecklistDismissed } = useChecklist('conversation');
  const showConvChecklist = isReturningUser && !isConvChecklistComplete() && !isConvChecklistDismissed();

  if (isReturningUser) {
    return (
      <div style={styles.container} className="empty-dashboard">
        <style>{`
          .empty-dashboard .quick-start-card:hover {
            border-color: var(--color-primary-400);
            transform: translateY(-2px);
            box-shadow: ${shadows.md};
          }
          @media (max-width: 768px) {
            .empty-dashboard .quick-start-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>

        {/* Shorter hero for returning users */}
        <div style={{ textAlign: 'center' as const, marginBottom: spacing[6], padding: `${spacing[6]} ${spacing[4]} ${spacing[4]}` }}>
          <h2 style={{
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.semibold,
            color: 'var(--color-primary-900)',
            marginBottom: spacing[2],
          }}>{workspaceName}</h2>
          <p style={{
            fontSize: typography.fontSize.base,
            color: 'var(--color-primary-500)',
            marginBottom: spacing[4],
            lineHeight: typography.lineHeight.relaxed,
          }}>
            {showConvChecklist
              ? 'This workspace is empty. Complete the steps below to get started.'
              : 'This workspace is empty. Pick one of the options below to get started.'}
          </p>
        </div>

        {/* Conversation checklist centered (only if not dismissed/completed) */}
        {showConvChecklist && (
          <div style={{ maxWidth: '560px', margin: '0 auto', marginBottom: spacing[8] }}>
            <GettingStartedChecklist checklistId="conversation" variant="card" showDismiss />
          </div>
        )}

        {/* Quick start grid */}
        <div style={styles.quickStart}>
          <h2 style={styles.quickStartTitle}>Quick Start</h2>
          <div style={styles.quickStartGrid} className="quick-start-grid">
            <Link to="/conversations/new" style={styles.quickStartCard} className="quick-start-card">
              <div style={styles.quickStartIcon}>
                <FeedbackIcon />
              </div>
              <div style={styles.quickStartLabel}>Conversation</div>
              <div style={styles.quickStartHint}>Ask questions and collect responses</div>
              <div style={styles.quickStartAi}>AI surfaces themes and insights</div>
            </Link>

            {journalsEnabled && isPersonalWorkspace && (
              <Link to="/journals/new" style={styles.quickStartCard} className="quick-start-card">
                <div style={styles.quickStartIcon}>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M8 27.5A3.5 3.5 0 0 1 11.5 24H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M11.5 4H28v24H11.5A3.5 3.5 0 0 1 8 24.5v-17A3.5 3.5 0 0 1 11.5 4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={styles.quickStartLabel}>Journal</div>
                <div style={styles.quickStartHint}>Journal your thoughts privately</div>
                <div style={styles.quickStartAi}>AI reveals patterns in your thinking</div>
              </Link>
            )}

            {spacesEnabled && (
              <Link to="/spaces" style={styles.quickStartCard} className="quick-start-card">
                <div style={styles.quickStartIcon}>
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="2" />
                    <circle cx="7" cy="9" r="3" stroke="currentColor" strokeWidth="2" />
                    <circle cx="25" cy="9" r="3" stroke="currentColor" strokeWidth="2" />
                    <circle cx="7" cy="23" r="3" stroke="currentColor" strokeWidth="2" />
                    <circle cx="25" cy="23" r="3" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
                <div style={styles.quickStartLabel}>Space</div>
                <div style={styles.quickStartHint}>Drop and gather ideas freely</div>
                <div style={styles.quickStartAi}>AI organizes them into themes</div>
              </Link>
            )}

            {templatesEnabled && (
              <Link to="/templates" style={styles.quickStartCard} className="quick-start-card">
                <div style={styles.quickStartIcon}>
                  <TemplatesIcon />
                </div>
                <div style={styles.quickStartLabel}>Browse Templates</div>
                <div style={styles.quickStartHint}>Use a pre-built template</div>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // First-time user: hero + dashboard checklist + Get Started cards + footer text
  const greeting = userName ? `Welcome, ${userName}!` : 'Welcome to Mosaic!';

  return (
    <div style={styles.container} className="empty-dashboard">
      <style>{`
        .empty-dashboard .quick-start-card:hover {
          border-color: var(--color-primary-400);
          transform: translateY(-2px);
          box-shadow: ${shadows.md};
        }
        @media (max-width: 768px) {
          .empty-dashboard .quick-start-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Hero section */}
      <div style={styles.hero}>
        <h1 style={styles.greeting}>{greeting}</h1>
        <p style={styles.subtitle}>
          {isPersonalWorkspace
            ? 'This is your personal workspace. Pick one of the options below to get started.'
            : `You're in ${workspaceName}. Admins create and manage conversations here for the group.`}
        </p>
      </div>

      {/* Dashboard checklist — centered, single column */}
      <div style={{ maxWidth: '560px', margin: '0 auto', marginBottom: spacing[8] }}>
        <GettingStartedChecklist checklistId="dashboard" variant="card" showDismiss />
      </div>

      {/* Get Started cards */}
      <div style={styles.quickStart}>
        <h2 style={styles.quickStartTitle}>Get Started</h2>
        <div style={styles.quickStartGrid} className="quick-start-grid">
          <Link to="/conversations/new" style={styles.quickStartCard} className="quick-start-card">
            <div style={styles.quickStartIcon}>
              <FeedbackIcon />
            </div>
            <div style={styles.quickStartLabel}>Conversation</div>
            <div style={styles.quickStartHint}>Ask questions and collect responses</div>
            <div style={styles.quickStartAi}>AI surfaces themes and insights</div>
          </Link>

          {journalsEnabled && isPersonalWorkspace && (
            <Link to="/journals/new" style={styles.quickStartCard} className="quick-start-card">
              <div style={styles.quickStartIcon}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M8 27.5A3.5 3.5 0 0 1 11.5 24H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M11.5 4H28v24H11.5A3.5 3.5 0 0 1 8 24.5v-17A3.5 3.5 0 0 1 11.5 4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={styles.quickStartLabel}>Journal</div>
              <div style={styles.quickStartHint}>Journal your thoughts privately</div>
              <div style={styles.quickStartAi}>AI reveals patterns in your thinking</div>
            </Link>
          )}

          {spacesEnabled && (
            <Link to="/spaces" style={styles.quickStartCard} className="quick-start-card">
              <div style={styles.quickStartIcon}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="2" />
                  <circle cx="7" cy="9" r="3" stroke="currentColor" strokeWidth="2" />
                  <circle cx="25" cy="9" r="3" stroke="currentColor" strokeWidth="2" />
                  <circle cx="7" cy="23" r="3" stroke="currentColor" strokeWidth="2" />
                  <circle cx="25" cy="23" r="3" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div style={styles.quickStartLabel}>Space</div>
              <div style={styles.quickStartHint}>Drop and gather ideas freely</div>
              <div style={styles.quickStartAi}>AI organizes them into themes</div>
            </Link>
          )}

          {templatesEnabled && (
            <Link to="/templates" style={styles.quickStartCard} className="quick-start-card">
              <div style={styles.quickStartIcon}>
                <TemplatesIcon />
              </div>
              <div style={styles.quickStartLabel}>Templates</div>
              <div style={styles.quickStartHint}>Start from a pre-built template</div>
            </Link>
          )}
        </div>
      </div>

      {/* Footer help text */}
      <p style={styles.footerText}>
        Want to explore first?{' '}
        <Link to="/explore" style={styles.footerLink}>See examples</Link>
        {' \u00B7 '}
        <Link to="/help" style={styles.footerLink}>Read our guides</Link>
      </p>
    </div>
  );
}

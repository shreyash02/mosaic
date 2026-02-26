import { Link } from 'react-router-dom';
import { typography, spacing, borders, shadows } from '../styles/tokens';
import { useFeature } from '../contexts/FeaturesContext';
import GettingStartedChecklist from './GettingStartedChecklist';

interface EmptyDashboardProps {
  userName?: string;
  isPersonalWorkspace?: boolean;
  workspaceName?: string;
}

// Feature card icons
const FeedbackIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect x="4" y="6" width="24" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M8 12H24M8 16H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const AIIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 16L15 19L20 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const InsightsIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect x="6" y="14" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="2" />
    <rect x="13.5" y="8" width="5" height="18" rx="1" stroke="currentColor" strokeWidth="2" />
    <rect x="21" y="12" width="5" height="14" rx="1" stroke="currentColor" strokeWidth="2" />
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
    marginBottom: spacing[8],
    padding: `${spacing[8]} ${spacing[4]}`,
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
    marginBottom: spacing[6],
    maxWidth: '500px',
    margin: '0 auto',
    lineHeight: typography.lineHeight.relaxed,
  },
  primaryCTA: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    padding: `${spacing[4]} ${spacing[8]}`,
    borderRadius: borders.radius.lg,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    textDecoration: 'none',
    boxShadow: shadows.md,
    transition: 'transform 150ms, box-shadow 150ms',
  },
  twoColumns: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: spacing[6],
    marginBottom: spacing[8],
  },
  checklistColumn: {
    // Will contain the getting started checklist
  },
  featuresColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-500)',
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide,
    marginBottom: spacing[3],
  },
  featureCard: {
    display: 'flex',
    gap: spacing[4],
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    textDecoration: 'none',
    color: 'inherit',
    transition: 'border-color 150ms, box-shadow 150ms',
  },
  featureIcon: {
    flexShrink: 0,
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.md,
    color: 'var(--color-primary-700)',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[1],
  },
  featureDescription: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
  },
  quickStart: {
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.xl,
    padding: spacing[6],
    marginBottom: spacing[8],
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: spacing[4],
  },
  quickStartCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[5],
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    textDecoration: 'none',
    color: 'inherit',
    textAlign: 'center' as const,
    border: '1px solid var(--color-primary-200)',
    transition: 'border-color 150ms, transform 150ms',
  },
  quickStartIcon: {
    width: '56px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.lg,
    color: 'var(--color-primary-700)',
  },
  quickStartLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-900)',
  },
  quickStartHint: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  helpSection: {
    textAlign: 'center' as const,
    padding: spacing[6],
    borderTop: '1px solid var(--color-primary-200)',
  },
  helpText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[3],
  },
  helpLink: {
    color: 'var(--color-primary-700)',
    fontWeight: typography.fontWeight.medium,
    textDecoration: 'underline',
  },
};

export default function EmptyDashboard({ userName, isPersonalWorkspace = true, workspaceName = 'Personal' }: EmptyDashboardProps) {
  const templatesEnabled = useFeature('templates');
  const journalsEnabled = useFeature('journals');
  const spacesEnabled = useFeature('spaces');
  const greeting = userName ? `Welcome, ${userName}!` : 'Welcome to Mosaic!';

  return (
    <div style={styles.container} className="empty-dashboard">
      <style>{`
        .empty-dashboard .primary-cta:hover {
          transform: translateY(-2px);
          box-shadow: ${shadows.lg};
        }
        .empty-dashboard .feature-card:hover {
          border-color: var(--color-primary-400);
          box-shadow: ${shadows.sm};
        }
        .empty-dashboard .quick-start-card:hover {
          border-color: var(--color-primary-400);
          transform: translateY(-2px);
        }
        @media (max-width: 768px) {
          .empty-dashboard .two-columns {
            grid-template-columns: 1fr !important;
          }
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
            ? 'This is your private workspace. Collect feedback, reflect, and let AI uncover insights.'
            : `You're in ${workspaceName}. Admins create and manage conversations here for the group.`}
        </p>
        <Link to="/conversations/new" style={styles.primaryCTA} className="primary-cta">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
          </svg>
          Create Your First Conversation
        </Link>
      </div>

      {/* Two column layout: Checklist + Features */}
      <div style={styles.twoColumns} className="two-columns">
        <div style={styles.checklistColumn}>
          <GettingStartedChecklist variant="card" showDismiss={false} />
        </div>

        <div style={styles.featuresColumn}>
          <h3 style={styles.sectionTitle}>What you can do</h3>

          <div style={styles.featureCard} className="feature-card">
            <div style={styles.featureIcon}>
              <FeedbackIcon />
            </div>
            <div style={styles.featureContent}>
              <div style={styles.featureTitle}>Collect Anonymous Feedback</div>
              <div style={styles.featureDescription}>
                Create conversations with questions. Share a link and gather honest responses from your group.
              </div>
            </div>
          </div>

          <div style={styles.featureCard} className="feature-card">
            <div style={styles.featureIcon}>
              <AIIcon />
            </div>
            <div style={styles.featureContent}>
              <div style={styles.featureTitle}>AI-Powered Analysis</div>
              <div style={styles.featureDescription}>
                Our AI identifies themes, patterns, and surprising insights from all responses.
              </div>
            </div>
          </div>

          <div style={styles.featureCard} className="feature-card">
            <div style={styles.featureIcon}>
              <InsightsIcon />
            </div>
            <div style={styles.featureContent}>
              <div style={styles.featureTitle}>Actionable Insights</div>
              <div style={styles.featureDescription}>
                Get summaries, trends, and recommendations to make informed decisions.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick start options */}
      <div style={styles.quickStart}>
        <h2 style={styles.quickStartTitle}>Quick Start</h2>
        <div style={styles.quickStartGrid} className="quick-start-grid">
          <Link to="/conversations/new" style={styles.quickStartCard} className="quick-start-card">
            <div style={styles.quickStartIcon}>
              <FeedbackIcon />
            </div>
            <div style={styles.quickStartLabel}>New Conversation</div>
            <div style={styles.quickStartHint}>Start from scratch</div>
          </Link>

          {templatesEnabled && (
            <Link to="/templates" style={styles.quickStartCard} className="quick-start-card">
              <div style={styles.quickStartIcon}>
                <TemplatesIcon />
              </div>
              <div style={styles.quickStartLabel}>Browse Templates</div>
              <div style={styles.quickStartHint}>Use a pre-built template</div>
            </Link>
          )}

          {journalsEnabled && isPersonalWorkspace && (
            <Link to="/journals/new" style={styles.quickStartCard} className="quick-start-card">
              <div style={styles.quickStartIcon}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M8 27.5A3.5 3.5 0 0 1 11.5 24H28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M11.5 4H28v24H11.5A3.5 3.5 0 0 1 8 24.5v-17A3.5 3.5 0 0 1 11.5 4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={styles.quickStartLabel}>New Journal</div>
              <div style={styles.quickStartHint}>Private self-reflection</div>
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
              <div style={styles.quickStartLabel}>New Space</div>
              <div style={styles.quickStartHint}>Gather and organize ideas</div>
            </Link>
          )}

          <Link to="/explore" style={styles.quickStartCard} className="quick-start-card">
            <div style={styles.quickStartIcon}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2" />
                <polygon points="22 9 12.5 19.5 9 22 10 18.5 19.5 9 22 9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={styles.quickStartLabel}>Explore Examples</div>
            <div style={styles.quickStartHint}>See Mosaic in action</div>
          </Link>

          <Link to="/help" style={styles.quickStartCard} className="quick-start-card">
            <div style={styles.quickStartIcon}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2" />
                <path d="M12 14c0-2.2 1.8-4 4-4s4 1.8 4 4c0 2-2 3-4 3v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="16" cy="24" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div style={styles.quickStartLabel}>Learn More</div>
            <div style={styles.quickStartHint}>View help guides</div>
          </Link>
        </div>
      </div>

      {/* Help footer */}
      <div style={styles.helpSection}>
        <p style={styles.helpText}>
          Need help getting started?{' '}
          <Link to="/help" style={styles.helpLink}>Check out our guides</Link>
          {' '}or explore the features above.
        </p>
      </div>
    </div>
  );
}

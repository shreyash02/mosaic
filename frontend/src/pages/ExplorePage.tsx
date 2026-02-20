import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { EXPLORE_SCENARIOS } from '../data/exploreScenarios';

const styles = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: 'var(--color-primary-50)',
    padding: spacing[6],
  },
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
  },
  header: {
    marginBottom: spacing[8],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    color: 'var(--color-primary-600)',
    margin: 0,
    lineHeight: typography.lineHeight.relaxed,
    maxWidth: '600px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: spacing[5],
    marginBottom: spacing[8],
  },
  card: {
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: '1px solid var(--color-primary-200)',
    padding: spacing[5],
    textDecoration: 'none',
    color: 'inherit',
    transition: transitions.duration.normal,
  },
  categoryLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-500)',
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide,
    marginBottom: spacing[2],
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[2],
  },
  cardDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
    margin: 0,
    flex: 1,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[4],
    paddingTop: spacing[3],
    borderTop: '1px solid var(--color-primary-100)',
  },
  responseInfo: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  arrowIcon: {
    color: 'var(--color-primary-400)',
    transition: transitions.duration.normal,
  },
  ctaSection: {
    textAlign: 'center' as const,
    padding: `${spacing[8]} ${spacing[4]}`,
    borderTop: '1px solid var(--color-primary-200)',
  },
  ctaHeading: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[3],
  },
  ctaSubtext: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[5],
  },
  ctaButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    padding: `${spacing[3]} ${spacing[6]}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    textDecoration: 'none',
    boxShadow: shadows.md,
  },
};

const hoverStyles = `
  .explore-card:hover {
    border-color: var(--color-primary-400);
    box-shadow: ${shadows.md};
    transform: translateY(-2px);
  }
  .explore-card:hover .explore-arrow {
    color: var(--color-primary-700);
  }
  .explore-cta:hover {
    transform: translateY(-1px);
    box-shadow: ${shadows.lg};
  }
`;

export default function ExplorePage() {
  usePageTitle('Explore');
  const { isAuthenticated } = useAuth();

  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.page}>
        <div style={styles.container}>
          <header style={styles.header}>
            <h1 style={styles.title}>Explore Mosaic</h1>
            <p style={styles.subtitle}>
              See realistic examples of AI-powered analysis across different use cases. No account required.
            </p>
          </header>

          <div style={styles.grid}>
            {EXPLORE_SCENARIOS.map(scenario => (
              <Link
                key={scenario.id}
                to={`/explore/${scenario.id}`}
                style={styles.card}
                className="explore-card"
              >
                <div style={styles.categoryLabel}>{scenario.category}</div>
                <h3 style={styles.cardTitle}>{scenario.title}</h3>
                <p style={styles.cardDescription}>{scenario.description}</p>
                <div style={styles.cardFooter}>
                  <span style={styles.responseInfo}>
                    {scenario.conversation.responseCount} responses &middot; {scenario.conversation.questionCount} questions
                  </span>
                  <span style={styles.arrowIcon} className="explore-arrow">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Bottom CTA */}
          <div style={styles.ctaSection}>
            <h3 style={styles.ctaHeading}>
              {isAuthenticated ? 'Ready to try it yourself?' : 'Want insights like these?'}
            </h3>
            <p style={styles.ctaSubtext}>
              {isAuthenticated
                ? 'Create a conversation, collect responses, and get AI-powered analysis.'
                : 'Sign up free and start collecting feedback with AI-powered insights.'}
            </p>
            <Link
              to={isAuthenticated ? '/create/conversation/intent' : '/register'}
              style={styles.ctaButton}
              className="explore-cta"
            >
              {isAuthenticated ? 'Create a Conversation' : 'Sign Up Free'}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

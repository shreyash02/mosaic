import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { typography, spacing, borders, shadows } from '../styles/tokens';
import { EXPLORE_SCENARIOS } from '../data/exploreScenarios';
import DemoAnalysisView from '../components/DemoAnalysisView';
import DemoJournalInsightsView from '../components/DemoJournalInsightsView';
import type { DemoSuggestedAction } from '../data/exploreScenarios';

const styles = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: 'var(--color-primary-50)',
    padding: spacing[6],
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    color: 'var(--color-primary-600)',
    textDecoration: 'none',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[5],
  },
  roleBanner: {
    backgroundColor: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
    marginBottom: spacing[6],
  },
  roleLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-500)',
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide,
    marginBottom: spacing[2],
  },
  roleHeading: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
    marginBottom: spacing[3],
  },
  roleSituation: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-700)',
    lineHeight: typography.lineHeight.relaxed,
    margin: 0,
    marginBottom: spacing[2],
  },
  roleDetail: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    margin: 0,
  },
  convMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[6],
    marginBottom: spacing[6],
    flexWrap: 'wrap' as const,
  },
  convTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    margin: 0,
  },
  convStat: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
  },
  actionsCard: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: '1px solid var(--color-primary-200)',
    padding: spacing[6],
    marginBottom: spacing[6],
    boxShadow: shadows.sm,
  },
  actionsTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[4],
  },
  actionItem: {
    display: 'flex',
    gap: spacing[4],
    padding: spacing[4],
    borderRadius: borders.radius.md,
    marginBottom: spacing[3],
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-200)',
  },
  actionIcon: {
    flexShrink: 0,
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[1],
  },
  actionDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
    margin: 0,
  },
  priorityBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${spacing[0.5]} ${spacing[2]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.full,
    marginLeft: spacing[2],
  },
  ctaSection: {
    textAlign: 'center' as const,
    padding: `${spacing[8]} ${spacing[4]}`,
    marginTop: spacing[6],
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
  notFound: {
    textAlign: 'center' as const,
    padding: spacing[12],
  },
  notFoundTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[3],
  },
  notFoundText: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[5],
  },
  notFoundLink: {
    color: 'var(--color-info)',
    fontWeight: typography.fontWeight.medium,
    textDecoration: 'underline',
  },
};

const actionTypeIcons: Record<string, { bg: string; color: string; label: string }> = {
  investigate: { bg: 'var(--color-primary-100)', color: 'var(--color-primary-700)', label: 'Investigate' },
  communicate: { bg: 'var(--color-info-light, #eff6ff)', color: 'var(--color-info, #3b82f6)', label: 'Communicate' },
  change: { bg: 'var(--color-warning-light, #fffbeb)', color: 'var(--color-warning, #f59e0b)', label: 'Change' },
  celebrate: { bg: 'var(--color-success-light, #f0fdf4)', color: 'var(--color-success, #22c55e)', label: 'Celebrate' },
  monitor: { bg: 'var(--color-primary-100)', color: 'var(--color-primary-600)', label: 'Monitor' },
};

const priorityColors: Record<string, { bg: string; color: string }> = {
  high: { bg: 'var(--color-error-light, #fef2f2)', color: 'var(--color-error, #ef4444)' },
  medium: { bg: 'var(--color-warning-light, #fffbeb)', color: 'var(--color-warning, #f59e0b)' },
  low: { bg: 'var(--color-primary-100)', color: 'var(--color-primary-600)' },
};

function ActionItemView({ action }: { action: DemoSuggestedAction }) {
  const typeInfo = actionTypeIcons[action.action_type] || actionTypeIcons.investigate;
  const prioColors = priorityColors[action.priority] || priorityColors.medium;

  return (
    <div style={styles.actionItem}>
      <div style={{ ...styles.actionIcon, backgroundColor: typeInfo.bg, color: typeInfo.color }}>
        {typeInfo.label.charAt(0)}
      </div>
      <div style={styles.actionContent}>
        <div style={styles.actionTitle}>
          {action.title}
          <span style={{ ...styles.priorityBadge, backgroundColor: prioColors.bg, color: prioColors.color }}>
            {action.priority}
          </span>
        </div>
        <p style={styles.actionDescription}>{action.description}</p>
      </div>
    </div>
  );
}

export default function ExploreScenarioPage() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const { isAuthenticated } = useAuth();
  const scenario = EXPLORE_SCENARIOS.find(s => s.id === scenarioId);

  usePageTitle(scenario ? `Explore: ${scenario.title}` : 'Scenario Not Found');

  if (!scenario) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.notFound}>
            <h2 style={styles.notFoundTitle}>Scenario not found</h2>
            <p style={styles.notFoundText}>
              The scenario you're looking for doesn't exist.
            </p>
            <Link to="/explore" style={styles.notFoundLink}>
              Back to Explore
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Back link */}
        <Link to="/explore" style={styles.backLink}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
          </svg>
          Back to Explore
        </Link>

        {/* Role context banner */}
        <div style={styles.roleBanner}>
          <div style={styles.roleLabel}>Scenario</div>
          <h2 style={styles.roleHeading}>
            Imagine you're {scenario.roleContext.role}...
          </h2>
          <p style={styles.roleSituation}>{scenario.roleContext.situation}</p>
          <p style={styles.roleDetail}>{scenario.roleContext.detail}</p>
        </div>

        {/* Content — differs by scenario type */}
        {scenario.type === 'conversation' && (
          <>
            <div style={styles.convMeta}>
              <h3 style={styles.convTitle}>{scenario.conversation.title}</h3>
              <span style={styles.convStat}>
                {scenario.conversation.responseCount} responses
              </span>
              <span style={styles.convStat}>
                {scenario.conversation.questionCount} questions
              </span>
            </div>

            <DemoAnalysisView analysis={scenario.analysis} />

            {scenario.suggestedActions.length > 0 && (
              <div style={styles.actionsCard}>
                <h3 style={styles.actionsTitle}>Suggested Actions</h3>
                {scenario.suggestedActions.map((action, i) => (
                  <ActionItemView key={i} action={action} />
                ))}
              </div>
            )}
          </>
        )}

        {scenario.type === 'journal' && (
          <>
            <div style={styles.convMeta}>
              <h3 style={styles.convTitle}>{scenario.journal.title}</h3>
              <span style={styles.convStat}>
                {scenario.journal.entryCount} entries
              </span>
              <span style={styles.convStat}>
                {scenario.journal.duration}
              </span>
            </div>

            <DemoJournalInsightsView analysis={scenario.journalAnalysis} />
          </>
        )}

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
          >
            {isAuthenticated ? 'Create a Conversation' : 'Sign Up Free'}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

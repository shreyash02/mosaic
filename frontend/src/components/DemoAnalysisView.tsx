/**
 * Read-only analysis renderer for the Explore/Sandbox feature.
 * Reproduces the visual output of AnalysisPage without any interactive features.
 */

import { typography, spacing, borders, shadows } from '../styles/tokens';
import type {
  DemoAnalysis,
  DemoQuestionAnalysis,
  DemoTheme,
  DemoRatingStats,
  DemoPollStats,
} from '../data/exploreScenarios';

const styles = {
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
    marginBottom: spacing[4],
  },
  summaryText: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-700)',
    lineHeight: typography.lineHeight.relaxed,
    margin: 0,
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: spacing[4],
    marginTop: spacing[5],
    paddingTop: spacing[5],
    borderTop: '1px solid var(--color-primary-100)',
  },
  metaItem: {
    textAlign: 'center' as const,
  },
  metaLabel: {
    display: 'block',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-500)',
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide,
    marginBottom: spacing[1],
  },
  metaValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
  },
  insightItem: {
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.md,
    marginBottom: spacing[3],
    borderLeft: '4px solid var(--color-primary-400)',
  },
  insightTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[2],
  },
  insightDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    margin: 0,
    lineHeight: typography.lineHeight.relaxed,
  },
  questionCard: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: '1px solid var(--color-primary-200)',
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  questionHeader: {
    marginBottom: spacing[4],
  },
  questionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[2],
  },
  questionMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.full,
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-700)',
  },
  responseCount: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
  },
  themeCard: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.md,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  themeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  themeName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
  },
  frequencyBadge: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-600)',
    backgroundColor: 'var(--color-primary-200)',
    padding: `${spacing[1]} ${spacing[2]}`,
    borderRadius: borders.radius.full,
  },
  themeSummary: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    lineHeight: typography.lineHeight.relaxed,
    margin: 0,
  },
  perspectiveItem: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.md,
    padding: spacing[3],
    marginTop: spacing[3],
    border: '1px solid var(--color-primary-200)',
  },
  perspectiveHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  perspectiveName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-800)',
  },
  perspectiveCount: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  perspectiveSummary: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    margin: 0,
  },
  keyPointsList: {
    marginTop: spacing[3],
    paddingLeft: spacing[5],
  },
  keyPoint: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[1],
  },
  ratingDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[6],
    marginBottom: spacing[4],
  },
  ratingAverage: {
    textAlign: 'center' as const,
  },
  averageValue: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
  },
  averageScale: {
    fontSize: typography.fontSize.lg,
    color: 'var(--color-primary-500)',
  },
  distributionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  ratingLabel: {
    width: '24px',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    textAlign: 'right' as const,
  },
  barContainer: {
    flex: 1,
    height: '20px',
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: 'var(--color-primary-600)',
    borderRadius: borders.radius.full,
    transition: 'width 0.3s ease',
  },
  countLabel: {
    width: '30px',
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
  pollResultItem: {
    marginBottom: spacing[3],
  },
  choiceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  choiceLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-800)',
  },
  choiceStats: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
    marginBottom: spacing[4],
  },
  questionSummaryText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    lineHeight: typography.lineHeight.relaxed,
    margin: 0,
    marginBottom: spacing[4],
    fontStyle: 'italic' as const,
  },
};

function getQuestionTypeLabel(type: string): string {
  switch (type) {
    case 'text': return 'Text';
    case 'rating': return 'Rating';
    case 'single_choice': return 'Single Choice';
    case 'multiple_choice': return 'Multiple Choice';
    default: return type;
  }
}

function ThemeView({ theme }: { theme: DemoTheme }) {
  return (
    <div style={styles.themeCard}>
      <div style={styles.themeHeader}>
        <span style={styles.themeName}>{theme.theme}</span>
        <span style={styles.frequencyBadge}>
          {theme.frequency} response{theme.frequency !== 1 ? 's' : ''}
        </span>
      </div>
      <p style={styles.themeSummary}>{theme.summary}</p>

      {theme.perspectives.map((p, i) => (
        <div key={i} style={styles.perspectiveItem}>
          <div style={styles.perspectiveHeader}>
            <span style={styles.perspectiveName}>{p.name}</span>
            <span style={styles.perspectiveCount}>{p.count} response{p.count !== 1 ? 's' : ''}</span>
          </div>
          <p style={styles.perspectiveSummary}>{p.summary}</p>
        </div>
      ))}

      {theme.key_points && theme.key_points.length > 0 && (
        <ul style={styles.keyPointsList}>
          {theme.key_points.map((point, i) => (
            <li key={i} style={styles.keyPoint}>{point}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RatingView({ stats }: { stats: DemoRatingStats }) {
  const maxCount = Math.max(...Object.values(stats.distribution));
  const labels = [];
  for (let i = stats.scale_max; i >= stats.scale_min; i--) {
    labels.push(String(i));
  }

  return (
    <div>
      <div style={styles.ratingDisplay}>
        <div style={styles.ratingAverage}>
          <span style={styles.averageValue}>{stats.average.toFixed(1)}</span>
          <span style={styles.averageScale}> / {stats.scale_max}</span>
        </div>
      </div>
      <div>
        {labels.map(label => {
          const count = stats.distribution[label] || 0;
          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div key={label} style={styles.distributionBar}>
              <span style={styles.ratingLabel}>{label}</span>
              <div style={styles.barContainer}>
                <div style={{ ...styles.barFill, width: `${pct}%` }} />
              </div>
              <span style={styles.countLabel}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PollView({ stats }: { stats: DemoPollStats }) {
  const sorted = [...stats.choices].sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...sorted.map(c => c.count), 1);

  return (
    <div>
      {sorted.map(choice => (
        <div key={choice.choice_id} style={styles.pollResultItem}>
          <div style={styles.choiceHeader}>
            <span style={styles.choiceLabel}>{choice.label}</span>
            <span style={styles.choiceStats}>
              {choice.count} ({choice.percentage.toFixed(1)}%)
            </span>
          </div>
          <div style={styles.barContainer}>
            <div style={{ ...styles.barFill, width: `${(choice.count / maxCount) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionView({ question }: { question: DemoQuestionAnalysis }) {
  return (
    <div style={styles.questionCard}>
      <div style={styles.questionHeader}>
        <h4 style={styles.questionTitle}>{question.question_text}</h4>
        <div style={styles.questionMeta}>
          <span style={styles.badge}>{getQuestionTypeLabel(question.question_type)}</span>
          <span style={styles.responseCount}>
            {question.response_count} response{question.response_count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {question.summary && (
        <p style={styles.questionSummaryText}>{question.summary}</p>
      )}

      {question.rating_stats && <RatingView stats={question.rating_stats} />}

      {question.poll_stats && <PollView stats={question.poll_stats} />}

      {question.themes && question.themes.map((theme, i) => (
        <ThemeView key={i} theme={theme} />
      ))}
    </div>
  );
}

interface DemoAnalysisViewProps {
  analysis: DemoAnalysis;
}

export default function DemoAnalysisView({ analysis }: DemoAnalysisViewProps) {
  return (
    <div>
      {/* Overall Summary */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Overall Summary</h3>
        <p style={styles.summaryText}>{analysis.overall_summary}</p>
        <div style={styles.metaGrid}>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Responses Analyzed</span>
            <span style={styles.metaValue}>{analysis.total_responses_analyzed}</span>
          </div>
          <div style={styles.metaItem}>
            <span style={styles.metaLabel}>Themes Found</span>
            <span style={styles.metaValue}>{analysis.num_clusters_found}</span>
          </div>
        </div>
      </div>

      {/* Surprising Insights */}
      {analysis.surprising_insights.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>What Surprised Us</h3>
          {analysis.surprising_insights.map((insight, i) => (
            <div key={i} style={styles.insightItem}>
              <h4 style={styles.insightTitle}>{insight.title}</h4>
              <p style={styles.insightDescription}>{insight.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Question-by-Question Analysis */}
      <h3 style={styles.sectionTitle}>Question-by-Question Analysis</h3>
      {analysis.question_analyses.map(question => (
        <QuestionView key={question.question_id} question={question} />
      ))}
    </div>
  );
}

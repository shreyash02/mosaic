import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { usePageTitle } from '../hooks/usePageTitle';
import type { SharedAnalysis } from '../types';
import { formatDate } from '../utils/formatting';
import { typography, spacing, borders, shadows, transitions } from '../styles';
import { SkeletonAnalysis } from '../components/Skeleton';

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
  header: {
    marginBottom: spacing[6],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
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
  metaLine: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[4],
    marginTop: spacing[3],
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
  },
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
  ratingRange: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[1],
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
  barContainer: {
    flex: 1,
    height: '8px',
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
  distributionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  ratingLabel: {
    width: '32px',
    textAlign: 'right' as const,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
  },
  countLabel: {
    width: '40px',
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
  },
  pollResultItem: {
    marginBottom: spacing[3],
  },
  choiceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  choiceLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-800)',
  },
  choiceStats: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
  },
  noAnalysis: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    fontStyle: 'italic',
  },
  footer: {
    textAlign: 'center' as const,
    padding: `${spacing[8]} ${spacing[4]}`,
    borderTop: '1px solid var(--color-primary-200)',
    marginTop: spacing[8],
  },
  footerBrand: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    marginBottom: spacing[3],
  },
  ctaButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[3]} ${spacing[6]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    borderRadius: borders.radius.md,
    border: 'none',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  errorContainer: {
    textAlign: 'center' as const,
    padding: spacing[8],
    maxWidth: '500px',
    margin: '0 auto',
  },
  errorTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[3],
  },
  errorDescription: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[6],
    lineHeight: typography.lineHeight.relaxed,
  },
};

export default function SharedAnalysisPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SharedAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);

  usePageTitle(data ? `Analysis: ${data.conversation_title}` : 'Shared Analysis');

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const result = await api.getSharedAnalysis(token);
        setData(result);
      } catch (err: any) {
        const status = err?.response?.status || err?.status || 0;
        if (status === 401) {
          navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setError({
          status,
          message: status === 403
            ? 'Only participants who responded can view this analysis.'
            : status === 404
              ? 'This shared link is no longer active or the analysis has been removed.'
              : 'Something went wrong while loading this analysis.',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [token, navigate]);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <SkeletonAnalysis />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.errorContainer}>
            <h1 style={styles.errorTitle}>
              {error.status === 403 ? 'Access Restricted' : 'Link Unavailable'}
            </h1>
            <p style={styles.errorDescription}>{error.message}</p>
            <Link to="/" style={styles.ctaButton}>Go to Mosaic</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <h1 style={styles.title}>{data.conversation_title}</h1>
          {data.conversation_description && (
            <p style={styles.subtitle}>{data.conversation_description}</p>
          )}
          <div style={styles.metaLine}>
            <span>{data.response_count} responses</span>
            {data.unique_participants > 0 && (
              <span>{data.unique_participants} participants</span>
            )}
            <span>Analyzed {formatDate(data.created_at)}</span>
          </div>
        </header>

        {/* Overall Summary */}
        {data.overall_summary && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Summary</h2>
            <p style={styles.summaryText}>{data.overall_summary}</p>
            <div style={styles.metaGrid}>
              {data.total_responses_analyzed != null && (
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>Responses Analyzed</span>
                  <span style={styles.metaValue}>{data.total_responses_analyzed}</span>
                </div>
              )}
              {data.num_clusters_found != null && (
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>Themes Found</span>
                  <span style={styles.metaValue}>{data.num_clusters_found}</span>
                </div>
              )}
              {data.unique_participants > 0 && (
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>Participants</span>
                  <span style={styles.metaValue}>{data.unique_participants}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Surprising Insights */}
        {data.surprising_insights && data.surprising_insights.length > 0 && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>What Surprised Us</h2>
            {data.surprising_insights.map((insight, index) => (
              <div key={index} style={styles.insightItem}>
                <h3 style={styles.insightTitle}>{insight.title}</h3>
                <p style={styles.insightDescription}>{insight.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Question-by-Question Analysis */}
        {data.question_analyses && data.question_analyses.length > 0 && (
          <div style={{ marginBottom: spacing[6] }}>
            <h2 style={{ ...styles.cardTitle, marginBottom: spacing[4] }}>Question-by-Question Analysis</h2>
            {data.question_analyses.map((qa, index) => (
              <div key={qa.question_id} style={styles.questionCard}>
                <div style={styles.questionHeader}>
                  <h3 style={styles.questionTitle}>
                    Q{index + 1}. {qa.question_text}
                  </h3>
                  <div style={styles.questionMeta}>
                    <span style={styles.badge}>{qa.question_type.replace('_', ' ')}</span>
                    <span style={styles.responseCount}>{qa.response_count} responses</span>
                  </div>
                </div>

                {/* Text Question Themes */}
                {qa.question_type === 'text' && qa.themes && qa.themes.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: 'var(--color-primary-700)', marginBottom: spacing[3] }}>Themes</h4>
                    {qa.themes.map((theme, themeIndex) => (
                      <div key={themeIndex} style={styles.themeCard}>
                        <div style={styles.themeHeader}>
                          <span style={styles.themeName}>{theme.theme}</span>
                          <span style={styles.frequencyBadge}>{theme.frequency} responses</span>
                        </div>
                        <p style={styles.themeSummary}>{theme.summary}</p>

                        {theme.perspectives && theme.perspectives.length > 0 && (
                          <div>
                            <h5 style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: 'var(--color-primary-600)', marginTop: spacing[3], marginBottom: spacing[2] }}>Perspectives</h5>
                            {theme.perspectives.map((perspective, perspectiveIndex) => (
                              <div key={perspectiveIndex} style={styles.perspectiveItem}>
                                <div style={styles.perspectiveHeader}>
                                  <span style={styles.perspectiveName}>{perspective.name}</span>
                                  <span style={styles.perspectiveCount}>{perspective.count} responses</span>
                                </div>
                                <p style={styles.perspectiveSummary}>{perspective.summary}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {theme.key_points && theme.key_points.length > 0 && (
                          <div>
                            <h5 style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: 'var(--color-primary-600)', marginTop: spacing[3], marginBottom: spacing[2] }}>Key Points</h5>
                            <ul style={styles.keyPointsList}>
                              {theme.key_points.map((point, pointIndex) => (
                                <li key={pointIndex} style={styles.keyPoint}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Rating Question Analysis */}
                {qa.question_type === 'rating' && qa.rating_stats && (
                  <div>
                    <div style={styles.ratingDisplay}>
                      <div style={styles.ratingAverage}>
                        <span style={styles.averageValue}>{qa.rating_stats.average}</span>
                        <span style={styles.averageScale}> / {qa.rating_stats.scale_max ?? 10}</span>
                      </div>
                      <div style={styles.ratingRange}>
                        <span>Scale: {qa.rating_stats.scale_min ?? 1}--{qa.rating_stats.scale_max ?? 10}</span>
                        <span>{qa.rating_stats.total_responses} responses</span>
                      </div>
                    </div>

                    <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: 'var(--color-primary-700)', marginBottom: spacing[3] }}>Distribution</h4>
                    {Object.entries(qa.rating_stats.distribution)
                      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                      .map(([rating, count]) => {
                        const percentage = (count / qa.rating_stats!.total_responses) * 100;
                        return (
                          <div key={rating} style={styles.distributionBar}>
                            <span style={styles.ratingLabel}>{rating}</span>
                            <div style={styles.barContainer}>
                              <div style={{ ...styles.barFill, width: `${percentage}%` }} />
                            </div>
                            <span style={styles.countLabel}>{count}</span>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Poll Question Analysis */}
                {(qa.question_type === 'single_choice' || qa.question_type === 'multiple_choice') && qa.poll_stats && (
                  <div>
                    <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: 'var(--color-primary-700)', marginBottom: spacing[3] }}>Results</h4>
                    {qa.poll_stats.choices
                      .sort((a, b) => b.count - a.count)
                      .map((choice) => (
                        <div key={choice.choice_id} style={styles.pollResultItem}>
                          <div style={styles.choiceHeader}>
                            <span style={styles.choiceLabel}>{choice.label}</span>
                            <span style={styles.choiceStats}>{choice.count} ({choice.percentage}%)</span>
                          </div>
                          <div style={styles.barContainer}>
                            <div style={{ ...styles.barFill, width: `${choice.percentage}%` }} />
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* No themes fallback */}
                {qa.question_type === 'text' && (!qa.themes || qa.themes.length === 0) && (
                  <div>
                    {qa.summary ? (
                      <div>
                        <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: 'var(--color-primary-700)', marginBottom: spacing[2] }}>Summary</h4>
                        <p style={styles.summaryText}>{qa.summary}</p>
                      </div>
                    ) : (
                      <p style={styles.noAnalysis}>Not enough responses to generate analysis.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer with branding and CTA */}
        <footer style={styles.footer}>
          <p style={styles.footerBrand}>Powered by Mosaic</p>
          <Link to="/register" style={styles.ctaButton}>
            Create your own
          </Link>
        </footer>
      </div>
    </div>
  );
}

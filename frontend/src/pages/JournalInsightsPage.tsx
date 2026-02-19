import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';
import type { Journal, JournalAnalysisStatus } from '../types';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';

const MIN_ENTRIES_FOR_ANALYSIS = 3;

const TRAJECTORY_COLORS: Record<string, string> = {
  growing: 'var(--color-success)',
  stable: 'var(--color-info)',
  declining: 'var(--color-warning)',
  resolved: 'var(--color-primary-500)',
};

const TRAJECTORY_LABELS: Record<string, string> = {
  growing: 'Growing',
  stable: 'Stable',
  declining: 'Declining',
  resolved: 'Resolved',
};

const TREND_LABELS: Record<string, string> = {
  improving: 'Improving',
  stable: 'Stable',
  declining: 'Declining',
};

const PATTERN_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  recurring_concern: { bg: 'var(--color-warning-light)', text: 'var(--color-warning-text)' },
  positive_shift: { bg: 'var(--color-success-light)', text: 'var(--color-success-text)' },
  correlation: { bg: 'var(--color-info-light)', text: 'var(--color-info-text)' },
  cyclical: { bg: 'var(--color-primary-200)', text: 'var(--color-primary-700)' },
};

const PATTERN_TYPE_LABELS: Record<string, string> = {
  recurring_concern: 'Recurring',
  positive_shift: 'Positive Shift',
  correlation: 'Correlation',
  cyclical: 'Cyclical',
};

const s = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: 'var(--color-primary-50)',
    padding: spacing[6],
  },
  container: {
    maxWidth: '800px',
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
    marginBottom: spacing[4],
  },
  header: {
    marginBottom: spacing[8],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
  // Cards
  card: {
    backgroundColor: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
    marginBottom: spacing[4],
    boxShadow: shadows.sm,
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  },
  cardText: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-700)',
    lineHeight: typography.lineHeight.relaxed,
  },
  // Need more entries state
  progressCard: {
    backgroundColor: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[8],
    textAlign: 'center' as const,
  },
  progressTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[3],
  },
  progressText: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[6],
    lineHeight: typography.lineHeight.relaxed,
  },
  progressBar: {
    width: '100%',
    maxWidth: '300px',
    height: '8px',
    backgroundColor: 'var(--color-primary-200)',
    borderRadius: borders.radius.full,
    margin: '0 auto',
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'var(--color-primary-900)',
    borderRadius: borders.radius.full,
    transition: transitions.duration.normal,
  },
  progressLabel: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  // Theme list
  themeItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: `${spacing[3]} 0`,
    borderBottom: '1px solid var(--color-primary-200)',
  },
  themeLeft: {
    flex: 1,
  },
  themeName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[1],
  },
  themeSummary: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
  },
  themeMeta: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    marginTop: spacing[1],
  },
  trajectoryBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: `${spacing[0.5]} ${spacing[2]}`,
    borderRadius: borders.radius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    flexShrink: 0,
    marginLeft: spacing[3],
  },
  // Pattern card
  patternItem: {
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.md,
    marginBottom: spacing[3],
  },
  patternHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  patternTypeBadge: {
    display: 'inline-flex',
    padding: `${spacing[0.5]} ${spacing[2]}`,
    borderRadius: borders.radius.full,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  patternTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
  },
  patternDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
  },
  // States
  loading: {
    textAlign: 'center' as const,
    padding: spacing[12],
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
  },
  error: {
    backgroundColor: 'var(--color-error-light)',
    border: '1px solid var(--color-error)',
    color: 'var(--color-error)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  chartContainer: {
    marginBottom: spacing[4],
  },
  trendBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: `${spacing[1]} ${spacing[3]}`,
    borderRadius: borders.radius.full,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[3],
  },
  dateRange: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    marginBottom: spacing[4],
  },
};

export default function JournalInsightsPage() {
  const { id } = useParams<{ id: string }>();

  const [journal, setJournal] = useState<Journal | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<JournalAnalysisStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  usePageTitle(journal ? `Insights - ${journal.title}` : 'Insights');

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [journalData, analysisData] = await Promise.all([
        api.getJournal(id),
        api.getJournalAnalysis(id),
      ]);
      setJournal(journalData);
      setAnalysisStatus(analysisData);
    } catch {
      setError('Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.loading}>Loading insights...</div>
        </div>
      </div>
    );
  }

  const analysis = analysisStatus?.latest_analysis;
  const progressPercent = analysisStatus
    ? Math.min(100, (analysisStatus.total_entries / MIN_ENTRIES_FOR_ANALYSIS) * 100)
    : 0;

  return (
    <div style={s.page}>
      <div style={s.container}>
        <Link to={`/journals/${id}`} style={s.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Journal
        </Link>

        <div style={s.header}>
          <h1 style={s.title}>Insights</h1>
          {journal && (
            <p style={s.subtitle}>Analysis of your entries in {journal.title}</p>
          )}
        </div>

        {error && <div style={s.error}>{error}</div>}

        {/* Need more entries */}
        {analysisStatus?.needs_more_entries && (
          <div style={s.progressCard}>
            <div style={s.progressTitle}>Keep Writing</div>
            <p style={s.progressText}>
              Write {analysisStatus.entries_until_analysis} more {analysisStatus.entries_until_analysis === 1 ? 'entry' : 'entries'} to
              unlock AI-powered insights about your writing patterns, themes, and mood.
            </p>
            <div style={s.progressBar}>
              <div style={{ ...s.progressFill, width: `${progressPercent}%` }} />
            </div>
            <span style={s.progressLabel}>
              {analysisStatus.total_entries} / {MIN_ENTRIES_FOR_ANALYSIS} entries
            </span>
          </div>
        )}

        {/* Enough entries but no analysis yet — analysis will run on schedule */}
        {!analysisStatus?.needs_more_entries && !analysis && (
          <div style={s.progressCard}>
            <div style={s.progressTitle}>Analysis Pending</div>
            <p style={s.progressText}>
              You have {analysisStatus?.total_entries || 0} entries. Your first analysis will
              run automatically at the end of the current period.
            </p>
            {journal?.next_analysis_at && (
              <p style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)' }}>
                Next analysis scheduled for{' '}
                {new Date(journal.next_analysis_at).toLocaleString(undefined, {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })}
              </p>
            )}
          </div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <>
            {/* Date range */}
            {analysis.date_range_start && analysis.date_range_end && (
              <p style={s.dateRange}>
                Analyzing {analysis.total_entries_analyzed} entries from{' '}
                {new Date(analysis.date_range_start).toLocaleDateString()} to{' '}
                {new Date(analysis.date_range_end).toLocaleDateString()}
              </p>
            )}

            {/* Overall Summary */}
            {analysis.overall_summary && (
              <div style={s.card}>
                <h2 style={s.cardTitle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  Summary
                </h2>
                <p style={s.cardText}>{analysis.overall_summary}</p>
              </div>
            )}

            {/* Theme Timeline */}
            {analysis.theme_timeline && analysis.theme_timeline.length > 0 && (
              <div style={s.card}>
                <h2 style={s.cardTitle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z" />
                    <path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                    <path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z" />
                    <path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z" />
                    <path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z" />
                    <path d="M15 19v1.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5V19" />
                    <path d="M10 9.5C10 10.33 9.33 11 8.5 11h-5C2.67 11 2 10.33 2 9.5S2.67 8 3.5 8h5c.83 0 1.5.67 1.5 1.5z" />
                    <path d="M9 5V3.5C9 2.67 9.67 2 10.5 2S12 2.67 12 3.5V5" />
                  </svg>
                  Themes
                </h2>
                <div>
                  {analysis.theme_timeline.map((theme, i) => (
                    <div
                      key={i}
                      style={{
                        ...s.themeItem,
                        ...(i === analysis.theme_timeline!.length - 1 ? { borderBottom: 'none' } : {}),
                      }}
                    >
                      <div style={s.themeLeft}>
                        <div style={s.themeName}>{theme.theme}</div>
                        {theme.summary && (
                          <div style={s.themeSummary}>{theme.summary}</div>
                        )}
                        <div style={s.themeMeta}>
                          {theme.entry_count} {theme.entry_count === 1 ? 'entry' : 'entries'}
                        </div>
                      </div>
                      <span
                        style={{
                          ...s.trajectoryBadge,
                          backgroundColor: TRAJECTORY_COLORS[theme.trajectory] ? `${TRAJECTORY_COLORS[theme.trajectory]}20` : 'var(--color-primary-200)',
                          color: TRAJECTORY_COLORS[theme.trajectory] || 'var(--color-primary-700)',
                        }}
                      >
                        {TRAJECTORY_LABELS[theme.trajectory] || theme.trajectory}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mood Trajectory */}
            {analysis.mood_trajectory && analysis.mood_trajectory.data_points.length > 0 && (
              <div style={s.card}>
                <h2 style={s.cardTitle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  Mood Over Time
                </h2>
                <span
                  style={{
                    ...s.trendBadge,
                    backgroundColor: analysis.mood_trajectory.overall_trend === 'improving'
                      ? 'var(--color-success-light)'
                      : analysis.mood_trajectory.overall_trend === 'declining'
                        ? 'var(--color-warning-light)'
                        : 'var(--color-primary-200)',
                    color: analysis.mood_trajectory.overall_trend === 'improving'
                      ? 'var(--color-success-text)'
                      : analysis.mood_trajectory.overall_trend === 'declining'
                        ? 'var(--color-warning-text)'
                        : 'var(--color-primary-700)',
                  }}
                >
                  Overall: {TREND_LABELS[analysis.mood_trajectory.overall_trend] || analysis.mood_trajectory.overall_trend}
                </span>
                <div style={s.chartContainer}>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart
                      data={analysis.mood_trajectory.data_points.map(dp => ({
                        date: new Date(dp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                        sentiment: dp.sentiment_score,
                        mood: dp.dominant_mood,
                      }))}
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-primary-200)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: 'var(--color-primary-500)' }}
                      />
                      <YAxis
                        domain={[-1, 1]}
                        tick={{ fontSize: 12, fill: 'var(--color-primary-500)' }}
                        tickFormatter={(v: number) => v.toFixed(1)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-primary-50)',
                          border: '1px solid var(--color-primary-200)',
                          borderRadius: borders.radius.md,
                          fontSize: typography.fontSize.sm,
                        }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any, _name: any, props: any) => [
                          `${Number(value).toFixed(2)} (${props?.payload?.mood || ''})`,
                          'Sentiment',
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="sentiment"
                        stroke="var(--color-primary-900)"
                        strokeWidth={2}
                        dot={{ r: 4, fill: 'var(--color-primary-900)' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {analysis.mood_trajectory.summary && (
                  <p style={s.cardText}>{analysis.mood_trajectory.summary}</p>
                )}
              </div>
            )}

            {/* Patterns & Insights */}
            {analysis.patterns && analysis.patterns.length > 0 && (
              <div style={s.card}>
                <h2 style={s.cardTitle}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Patterns & Insights
                </h2>
                {analysis.patterns.map((pattern, i) => {
                  const typeColors = PATTERN_TYPE_COLORS[pattern.pattern_type] || PATTERN_TYPE_COLORS.cyclical;
                  return (
                    <div key={i} style={s.patternItem}>
                      <div style={s.patternHeader}>
                        <span
                          style={{
                            ...s.patternTypeBadge,
                            backgroundColor: typeColors.bg,
                            color: typeColors.text,
                          }}
                        >
                          {PATTERN_TYPE_LABELS[pattern.pattern_type] || pattern.pattern_type}
                        </span>
                      </div>
                      <div style={s.patternTitle}>{pattern.title}</div>
                      <p style={s.patternDescription}>{pattern.description}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Next analysis time */}
            {journal?.next_analysis_at && (
              <p style={{
                fontSize: typography.fontSize.sm,
                color: 'var(--color-primary-500)',
                textAlign: 'center' as const,
                marginTop: spacing[2],
              }}>
                Next analysis scheduled for{' '}
                {new Date(journal.next_analysis_at).toLocaleString(undefined, {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

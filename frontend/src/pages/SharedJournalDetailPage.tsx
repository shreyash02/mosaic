import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';
import type { SharedJournalDetail, JournalEntry, JournalAnalysisStatus, JournalShareType } from '../types';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatDate, formatDateShort, formatAnalysisDateRange } from '../utils/formatting';

const ENTRIES_PER_PAGE = 20;
const TRUNCATE_LENGTH = 400;

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
    marginBottom: spacing[6],
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[4],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[1],
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
  },
  sharedBy: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
  },
  shareTypeBadge: {
    display: 'inline-block',
    padding: `${spacing[1]} ${spacing[2]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.sm,
  },
  // Analysis cards
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
  // Entries
  timelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  timelineTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
  },
  entryCard: {
    backgroundColor: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[5],
    marginBottom: spacing[3],
    transition: transitions.duration.normal,
  },
  entryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  entryDate: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    fontWeight: typography.fontWeight.medium,
  },
  entryNumber: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-400)',
    marginLeft: spacing[2],
    fontWeight: typography.fontWeight.normal,
  },
  entryMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  entryResponse: {
    marginBottom: spacing[3],
  },
  entryPromptText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-500)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: spacing[1],
  },
  entryText: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-800)',
    lineHeight: typography.lineHeight.relaxed,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  entryRating: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
  },
  entryChoice: {
    display: 'inline-block',
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    backgroundColor: 'var(--color-primary-200)',
    borderRadius: borders.radius.full,
  },
  readMore: {
    color: 'var(--color-primary-600)',
    fontSize: typography.fontSize.sm,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    marginTop: spacing[2],
    fontWeight: typography.fontWeight.medium,
    display: 'block',
  },
  loadMore: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  loadMoreButton: {
    padding: `${spacing[2]} ${spacing[6]}`,
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-300)',
    cursor: 'pointer',
    transition: transitions.duration.normal,
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
  emptyTimeline: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
  },
  noAnalysis: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.lg,
    border: '1px solid var(--color-primary-200)',
  },
};

function getShareBadgeStyle(shareType: JournalShareType) {
  if (shareType === 'full') {
    return {
      backgroundColor: 'var(--color-info-light)',
      color: 'var(--color-info-text)',
    };
  }
  return {
    backgroundColor: 'var(--color-primary-200)',
    color: 'var(--color-primary-700)',
  };
}

export default function SharedJournalDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [journal, setJournal] = useState<SharedJournalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Entries (full share only)
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Analysis (both share types)
  const [analysisStatus, setAnalysisStatus] = useState<JournalAnalysisStatus | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Expand state for long entries
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  usePageTitle(journal ? `${journal.title} (Shared)` : 'Shared Journal');

  const loadJournal = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getSharedJournal(id);
      setJournal(data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
      if (axiosErr?.response?.status === 403) {
        setError('Your access to this journal has expired or been revoked.');
      } else if (axiosErr?.response?.status === 404) {
        setError('Shared journal not found. The share may have been revoked.');
      } else {
        setError('Failed to load shared journal.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadEntries = useCallback(async (append = false, skip = 0) => {
    if (!id) return;
    try {
      if (!append) setLoadingEntries(true);
      const data = await api.getSharedJournalEntries(id, { skip, limit: ENTRIES_PER_PAGE });
      if (append) {
        setEntries(prev => [...prev, ...data.entries]);
      } else {
        setEntries(data.entries);
      }
      setTotalEntries(data.total_entries);
    } catch {
      // Entries might 403 for analysis_only shares - that's expected
    } finally {
      setLoadingEntries(false);
      setLoadingMore(false);
    }
  }, [id]);

  const loadAnalysis = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingAnalysis(true);
      const data = await api.getSharedJournalAnalysis(id);
      setAnalysisStatus(data);
    } catch {
      // Analysis might not exist yet
    } finally {
      setLoadingAnalysis(false);
    }
  }, [id]);

  useEffect(() => {
    loadJournal();
  }, [loadJournal]);

  // Derive share metadata from journal response
  const shareType: JournalShareType = journal?.share_type || 'analysis_only';
  const ownerName = journal?.owner_name || '';
  const expiresAt = journal?.expires_at || null;

  // Load entries (full share) and analysis after journal loads
  useEffect(() => {
    if (!journal) return;
    if (journal.share_type === 'full') {
      loadEntries();
    }
    loadAnalysis();
  }, [journal, loadEntries, loadAnalysis]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    loadEntries(true, entries.length);
  };

  const toggleExpand = (entryId: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };

  const hasMore = entries.length < totalEntries;
  const analysis = analysisStatus?.latest_analysis;

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.loading}>Loading shared journal...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <Link to="/journals" style={s.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Journals
          </Link>
          <div style={s.error}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <Link to="/journals" style={s.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Journals
        </Link>

        {/* Header */}
        <div style={s.header}>
          <div style={s.headerTop}>
            <div>
              <h1 style={s.title}>{journal?.title}</h1>
              {journal?.description && (
                <p style={s.description}>{journal.description}</p>
              )}
              <div style={s.sharedBy}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Shared by {ownerName || 'someone'}
                <span style={{ ...s.shareTypeBadge, ...getShareBadgeStyle(shareType) }}>
                  {shareType === 'full' ? 'Full access' : 'Insights only'}
                </span>
                {expiresAt && (
                  <span style={{ color: 'var(--color-primary-500)' }}>
                    &middot; Access until {formatDateShort(expiresAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Section */}
        {loadingAnalysis ? (
          <div style={s.loading}>Loading insights...</div>
        ) : analysis ? (
          <>
            {/* Date range */}
            {analysis.date_range_start && analysis.date_range_end && (
              <p style={s.dateRange}>
                Analyzing {analysis.total_entries_analyzed} {analysis.total_entries_analyzed === 1 ? 'entry' : 'entries'}{' '}
                {formatAnalysisDateRange(analysis.date_range_start, analysis.date_range_end)}
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
          </>
        ) : (
          <div style={s.noAnalysis}>
            No analysis available yet for this journal.
          </div>
        )}

        {/* Entries Section (full share only) */}
        {shareType === 'full' && (
          <>
            {!loadingEntries && entries.length > 0 && (
              <div style={{ ...s.timelineHeader, marginTop: spacing[6] }}>
                <h2 style={s.timelineTitle}>Entries</h2>
                <span style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-500)' }}>
                  {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}
                </span>
              </div>
            )}

            {loadingEntries ? (
              <div style={s.loading}>Loading entries...</div>
            ) : entries.length === 0 && !loadingAnalysis ? (
              <div style={s.emptyTimeline}>
                No entries yet in this journal.
              </div>
            ) : (
              <>
                {entries.map(entry => {
                  const isExpanded = expandedEntries.has(entry.id);

                  return (
                    <div key={entry.id} style={s.entryCard}>
                      <div style={s.entryHeader}>
                        <span style={s.entryDate}>
                          {formatDate(entry.created_at)}
                          <span style={s.entryNumber}>#{entry.entry_number}</span>
                        </span>
                        <div style={s.entryMeta}>
                          <span>{entry.word_count} {entry.word_count === 1 ? 'word' : 'words'}</span>
                        </div>
                      </div>

                      {entry.responses.map((r, i) => {
                        const showLabel = entry.responses.length > 1;
                        const fullText = r.text || '';
                        const needsTruncation = r.type === 'text' && fullText.length > TRUNCATE_LENGTH;
                        const displayText = needsTruncation && !isExpanded
                          ? fullText.slice(0, TRUNCATE_LENGTH) + '...'
                          : fullText;

                        return (
                          <div key={r.prompt_id} style={{
                            ...s.entryResponse,
                            ...(i === entry.responses.length - 1 ? { marginBottom: 0 } : {}),
                          }}>
                            {showLabel && (
                              <div style={s.entryPromptText}>{r.prompt_text}</div>
                            )}
                            {r.type === 'rating' ? (
                              <div style={s.entryRating}>{r.rating_value}</div>
                            ) : r.type === 'single_choice' ? (
                              <div style={s.entryChoice}>{r.choice_value}</div>
                            ) : (
                              <div style={s.entryText}>{displayText}</div>
                            )}
                            {needsTruncation && (
                              <button
                                style={s.readMore}
                                onClick={() => toggleExpand(entry.id)}
                              >
                                {isExpanded ? 'Show less' : 'Read more'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {hasMore && (
                  <div style={s.loadMore}>
                    <button
                      style={{
                        ...s.loadMoreButton,
                        ...(loadingMore ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                      }}
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? 'Loading...' : 'Load More Entries'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

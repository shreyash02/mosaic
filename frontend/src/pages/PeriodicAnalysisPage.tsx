import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { PeriodicAnalysis, Conversation, ResponseWithQuestion } from '../types';
import { formatDate } from '../utils/formatting';
import { useOrganization } from '../contexts/OrganizationContext';
import { typography, spacing, borders, shadows, transitions } from '../styles';

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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[6],
    flexWrap: 'wrap' as const,
    gap: spacing[4],
  },
  headerInfo: {
    flex: 1,
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    color: 'var(--color-primary-600)',
    textDecoration: 'none',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[3],
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    transition: transitions.duration.normal,
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
  },
  periodBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[1]} ${spacing[3]}`,
    backgroundColor: 'var(--color-primary-200)',
    color: 'var(--color-primary-700)',
    borderRadius: borders.radius.full,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing[2],
  },
  card: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: `1px solid ${'var(--color-primary-200)'}`,
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
    borderTop: `1px solid ${'var(--color-primary-100)'}`,
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
    borderLeft: `4px solid ${'var(--color-primary-400)'}`,
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
    border: `1px solid ${'var(--color-primary-200)'}`,
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
  loading: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: 'var(--color-primary-500)',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: spacing[8],
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: `1px solid ${'var(--color-primary-200)'}`,
  },
  emptyStateTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[4],
  },
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  noAnalysis: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    fontStyle: 'italic',
  },
  verbatimSection: {
    marginTop: spacing[6],
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
  },
  sectionDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    margin: 0,
    marginTop: spacing[1],
  },
  groupSelect: {
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-300)'}`,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
  },
  questionGroup: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: `1px solid ${'var(--color-primary-200)'}`,
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  questionGroupTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginTop: 0,
    marginBottom: spacing[4],
    paddingBottom: spacing[3],
    borderBottom: `1px solid ${'var(--color-primary-100)'}`,
  },
  responseItem: {
    padding: spacing[3],
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.md,
    marginBottom: spacing[3],
  },
  responseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  responseNumber: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-500)',
  },
  responseDate: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-400)',
  },
  responseContent: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    lineHeight: typography.lineHeight.relaxed,
    margin: 0,
    whiteSpace: 'pre-wrap' as const,
  },
};

const hoverStyles = `
  .periodic-back-link:hover {
    color: ${'var(--color-primary-900)'};
  }
  .periodic-btn-primary:hover:not(:disabled) {
    background-color: ${'var(--color-primary-800)'};
  }
`;

export default function PeriodicAnalysisPage() {
  const { id, periodLabel } = useParams<{ id: string; periodLabel: string }>();
  const navigate = useNavigate();
  const { currentOrgId } = useOrganization();
  const [analysis, setAnalysis] = useState<PeriodicAnalysis | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [responses, setResponses] = useState<ResponseWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupBy, setGroupBy] = useState<'question' | 'responder'>('question');

  useEffect(() => {
    if (id && periodLabel) {
      loadData();
    }
  }, [id, periodLabel]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [convData, analysisData] = await Promise.all([
        api.getConversation(id!),
        api.getPeriodicAnalysis(id!, decodeURIComponent(periodLabel!)),
      ]);
      setConversation(convData);
      setAnalysis(analysisData);

      // Load verbatim responses if enabled
      if (convData.show_verbatim_responses) {
        try {
          const responsesData = await api.getResponses(id!);
          // Filter responses to only those within the analysis period
          const periodStart = new Date(analysisData.period_start);
          const periodEnd = new Date(analysisData.period_end);
          const filteredResponses = responsesData.responses.filter(r => {
            const submittedAt = new Date(r.submitted_at);
            return submittedAt >= periodStart && submittedAt <= periodEnd;
          });
          setResponses(filteredResponses);
        } catch (err) {
          console.error('Failed to load responses:', err);
        }
      }
    } catch (err: any) {
      setError('Failed to load analysis');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const groupResponsesByQuestion = () => {
    const grouped: Record<string, ResponseWithQuestion[]> = {};
    responses.forEach(response => {
      if (!grouped[response.question_id]) {
        grouped[response.question_id] = [];
      }
      grouped[response.question_id].push(response);
    });
    return grouped;
  };

  const groupResponsesByParticipant = () => {
    const grouped: Record<string, ResponseWithQuestion[]> = {};
    responses.forEach(response => {
      const key = response.participant_code_used || response.participant_id || response.id;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(response);
    });
    return grouped;
  };

  const handleBackClick = () => {
    navigate(`/conversations/${id}/analysis`);
  };

  const formatPeriodDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Format period label to be more human-friendly
  // "2026-W07" -> "Week 7, 2026"
  // "2026-02" -> "February 2026"
  const formatPeriodLabel = (label: string) => {
    // Check for incremental suffix (e.g., "2026-W07-a" -> extract "a")
    let suffix = '';
    let baseLabel = label;
    const suffixMatch = label.match(/^(.+)-([a-z])$/);
    if (suffixMatch) {
      baseLabel = suffixMatch[1];
      suffix = ` (${suffixMatch[2].toUpperCase()})`;
    }

    // Weekly format: YYYY-Www
    const weekMatch = baseLabel.match(/^(\d{4})-W(\d{2})$/);
    if (weekMatch) {
      const year = weekMatch[1];
      const week = parseInt(weekMatch[2], 10);
      return `Week ${week}, ${year}${suffix}`;
    }

    // Monthly format: YYYY-MM
    const monthMatch = baseLabel.match(/^(\d{4})-(\d{2})$/);
    if (monthMatch) {
      const year = monthMatch[1];
      const month = parseInt(monthMatch[2], 10);
      const monthName = new Date(parseInt(year), month - 1).toLocaleDateString('en-US', { month: 'long' });
      return `${monthName} ${year}${suffix}`;
    }

    // Daily format: YYYY-MM-DD
    const dayMatch = baseLabel.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dayMatch) {
      const date = new Date(baseLabel);
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + suffix;
    }

    // Fallback to original label
    return label;
  };

  if (loading) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.loading}>Loading analysis...</div>
          </div>
        </div>
      </>
    );
  }

  const conversationOrgId = conversation?.organization_id || null;
  const wrongWorkspace = conversation && conversationOrgId !== currentOrgId;

  if (!conversation || wrongWorkspace || error || !analysis) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.emptyState}>
              <h3 style={styles.emptyStateTitle}>Analysis Not Found</h3>
              <p style={styles.emptyStateText}>
                {error || 'This analysis does not exist or you do not have access to it.'}
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                style={styles.buttonPrimary}
                className="periodic-btn-primary"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.page}>
        <div style={styles.container}>
          <header style={styles.header}>
            <div style={styles.headerInfo}>
              <button
                onClick={handleBackClick}
                style={styles.backLink}
                className="periodic-back-link"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 12L6 8L10 4" />
                </svg>
                Back to Analysis History
              </button>
              <h1 style={styles.title}>{formatPeriodLabel(analysis.period_label)}</h1>
              <p style={styles.subtitle}>{conversation.title}</p>
              <span style={styles.periodBadge}>
                {formatPeriodDate(analysis.period_start)} — {formatPeriodDate(analysis.period_end)}
              </span>
            </div>
          </header>

          {/* Overall Summary */}
          {analysis.overall_summary && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Summary</h2>
              <p style={styles.summaryText}>{analysis.overall_summary}</p>

              <div style={styles.metaGrid}>
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>Responses</span>
                  <span style={styles.metaValue}>{analysis.total_responses_analyzed || 0}</span>
                </div>
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>Period</span>
                  <span style={styles.metaValue}>{analysis.period_type}</span>
                </div>
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>Analyzed</span>
                  <span style={styles.metaValue}>{formatDate(analysis.created_at, conversation.timezone)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Surprising Insights */}
          {analysis.surprising_insights && analysis.surprising_insights.length > 0 && (
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>What Surprised Us</h2>
              {analysis.surprising_insights.map((insight, index) => (
                <div key={index} style={styles.insightItem}>
                  <h3 style={styles.insightTitle}>{insight.title}</h3>
                  <p style={styles.insightDescription}>{insight.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Question-by-Question Analysis */}
          {analysis.question_analyses && analysis.question_analyses.length > 0 && (
            <div style={{ marginBottom: spacing[6] }}>
              <h2 style={{ ...styles.cardTitle, marginBottom: spacing[4] }}>Question-by-Question Analysis</h2>

              {analysis.question_analyses.map((qa, index) => (
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

                  {/* Text Question Analysis */}
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
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No themes for text */}
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

          {/* Verbatim Responses */}
          {conversation?.show_verbatim_responses && responses.length > 0 && (
            <div style={styles.verbatimSection}>
              <div style={styles.sectionHeader}>
                <div>
                  <h3 style={styles.sectionTitle}>Verbatim Responses</h3>
                  <p style={styles.sectionDescription}>All responses submitted during this period.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <label htmlFor="groupBy" style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)' }}>Group by:</label>
                  <select
                    id="groupBy"
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as 'question' | 'responder')}
                    style={styles.groupSelect}
                  >
                    <option value="question">Question</option>
                    <option value="responder">Responder</option>
                  </select>
                </div>
              </div>

              {groupBy === 'question' ? (
                <div>
                  {Object.entries(groupResponsesByQuestion()).map(([questionId, questionResponses]) => (
                    <div key={questionId} style={styles.questionGroup}>
                      <h4 style={styles.questionGroupTitle}>{questionResponses[0].question_text}</h4>
                      {questionResponses.map((response, index) => (
                        <div key={response.id} style={styles.responseItem}>
                          <div style={styles.responseHeader}>
                            <span style={styles.responseNumber}>#{index + 1}</span>
                            <span style={styles.responseDate}>{formatDate(response.submitted_at, conversation?.timezone)}</span>
                          </div>
                          <p style={styles.responseContent}>
                            {response.response_text || <em>No text response</em>}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  {Object.entries(groupResponsesByParticipant()).map(([participantKey, participantResponses], index) => (
                    <div key={participantKey} style={styles.questionGroup}>
                      <h4 style={styles.questionGroupTitle}>Responder #{index + 1}</h4>
                      {participantResponses.map((response) => (
                        <div key={response.id} style={styles.responseItem}>
                          <div style={styles.responseHeader}>
                            <span style={styles.responseNumber}>{response.question_text}</span>
                            <span style={styles.responseDate}>{formatDate(response.submitted_at, conversation?.timezone)}</span>
                          </div>
                          <p style={styles.responseContent}>
                            {response.response_text || <em>No text response</em>}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state if no content */}
          {!analysis.overall_summary && (!analysis.question_analyses || analysis.question_analyses.length === 0) && (
            <div style={styles.emptyState}>
              <h3 style={styles.emptyStateTitle}>No Analysis Data</h3>
              <p style={styles.emptyStateText}>
                This periodic analysis does not have any content yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

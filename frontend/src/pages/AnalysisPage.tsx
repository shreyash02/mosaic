import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { usePageTitle } from '../hooks/usePageTitle';
import type { Analysis, Conversation, ResponseWithQuestion, PeriodicAnalysis } from '../types';
import { formatDate } from '../utils/formatting';
import { useOrganization } from '../contexts/OrganizationContext';
import { generateAnalysisPDF, sanitizeFilename } from '../utils/pdf';
import { colors, typography, spacing, borders, shadows, transitions } from '../styles';
import EmptyState from '../components/EmptyState';
import { SkeletonAnalysis } from '../components/Skeleton';

const styles = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: colors.primary[50],
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
    color: colors.primary[600],
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
    color: colors.primary[900],
    margin: 0,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.primary[600],
    margin: 0,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    border: `1px solid ${colors.primary[200]}`,
    padding: spacing[6],
    marginBottom: spacing[6],
    boxShadow: shadows.sm,
  },
  cardTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginTop: 0,
    marginBottom: spacing[4],
  },
  summaryText: {
    fontSize: typography.fontSize.base,
    color: colors.primary[700],
    lineHeight: typography.lineHeight.relaxed,
    margin: 0,
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: spacing[4],
    marginTop: spacing[5],
    paddingTop: spacing[5],
    borderTop: `1px solid ${colors.primary[100]}`,
  },
  metaItem: {
    textAlign: 'center' as const,
  },
  metaLabel: {
    display: 'block',
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[500],
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide,
    marginBottom: spacing[1],
  },
  metaValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
  },
  insightItem: {
    padding: spacing[4],
    backgroundColor: colors.primary[50],
    borderRadius: borders.radius.md,
    marginBottom: spacing[3],
    borderLeft: `4px solid ${colors.primary[400]}`,
  },
  insightTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginTop: 0,
    marginBottom: spacing[2],
  },
  insightDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[700],
    margin: 0,
    lineHeight: typography.lineHeight.relaxed,
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    border: `1px solid ${colors.primary[200]}`,
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  questionHeader: {
    marginBottom: spacing[4],
  },
  questionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
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
    backgroundColor: colors.primary[100],
    color: colors.primary[700],
  },
  responseCount: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
  },
  themeCard: {
    backgroundColor: colors.primary[50],
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
    color: colors.primary[900],
  },
  frequencyBadge: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[600],
    backgroundColor: colors.primary[200],
    padding: `${spacing[1]} ${spacing[2]}`,
    borderRadius: borders.radius.full,
  },
  themeSummary: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[700],
    lineHeight: typography.lineHeight.relaxed,
    margin: 0,
  },
  perspectiveItem: {
    backgroundColor: 'white',
    borderRadius: borders.radius.md,
    padding: spacing[3],
    marginTop: spacing[3],
    border: `1px solid ${colors.primary[200]}`,
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
    color: colors.primary[800],
  },
  perspectiveCount: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[500],
  },
  perspectiveSummary: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    margin: 0,
  },
  keyPointsList: {
    marginTop: spacing[3],
    paddingLeft: spacing[5],
  },
  keyPoint: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[700],
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
    color: colors.primary[900],
  },
  averageScale: {
    fontSize: typography.fontSize.lg,
    color: colors.primary[500],
  },
  ratingRange: {
    display: 'flex',
    gap: spacing[4],
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
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
    color: colors.primary[700],
    textAlign: 'right' as const,
  },
  barContainer: {
    flex: 1,
    height: '20px',
    backgroundColor: colors.primary[100],
    borderRadius: borders.radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary[600],
    borderRadius: borders.radius.full,
    transition: 'width 0.3s ease',
  },
  countLabel: {
    width: '30px',
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
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
    color: colors.primary[800],
  },
  choiceStats: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
  },
  verbatimSection: {
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    border: `1px solid ${colors.primary[200]}`,
    padding: spacing[6],
    marginBottom: spacing[6],
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
    color: colors.primary[900],
    margin: 0,
  },
  sectionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    margin: 0,
    marginTop: spacing[1],
  },
  groupSelect: {
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    border: `1px solid ${colors.primary[300]}`,
    borderRadius: borders.radius.md,
    backgroundColor: 'white',
  },
  questionGroup: {
    marginBottom: spacing[5],
    paddingBottom: spacing[5],
    borderBottom: `1px solid ${colors.primary[100]}`,
  },
  questionGroupTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[800],
    marginTop: 0,
    marginBottom: spacing[3],
  },
  responseItem: {
    backgroundColor: colors.primary[50],
    borderRadius: borders.radius.md,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  responseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  responseNumber: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[600],
  },
  responseDate: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[500],
  },
  responseContent: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[800],
    lineHeight: typography.lineHeight.relaxed,
    margin: 0,
  },
  technicalDetails: {
    backgroundColor: colors.primary[50],
    borderRadius: borders.radius.lg,
    padding: spacing[5],
    marginTop: spacing[6],
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: spacing[4],
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[1],
  },
  detailLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[500],
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[800],
  },
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: colors.primary[900],
    color: colors.primary[50],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  buttonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'white',
    color: colors.primary[700],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: `1px solid ${colors.primary[300]}`,
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  loading: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: colors.primary[500],
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: spacing[8],
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    border: `1px solid ${colors.primary[200]}`,
  },
  emptyStateTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginBottom: spacing[2],
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    color: colors.primary[600],
    marginBottom: spacing[4],
  },
  noAnalysis: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontStyle: 'italic',
  },
  // Periodic analyses list styles
  periodicHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[6],
    flexWrap: 'wrap' as const,
    gap: spacing[4],
  },
  periodicInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[4],
  },
  continuousBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    backgroundColor: colors.primary[200],
    color: colors.primary[700],
    borderRadius: borders.radius.full,
  },
  intervalText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
  },
  periodicList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[4],
  },
  periodicCard: {
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    border: `1px solid ${colors.primary[200]}`,
    padding: spacing[5],
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    transition: `border-color ${transitions.duration.normal}, box-shadow ${transitions.duration.normal}`,
    textDecoration: 'none',
    color: 'inherit',
  },
  periodicCardContent: {
    flex: 1,
  },
  periodLabel: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginBottom: spacing[1],
  },
  periodMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[4],
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
  },
  periodDate: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[1],
  },
  responsesBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    padding: `${spacing[1]} ${spacing[2]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    backgroundColor: colors.primary[100],
    color: colors.primary[700],
    borderRadius: borders.radius.md,
  },
  viewArrow: {
    color: colors.primary[400],
    marginLeft: spacing[3],
  },
  emptyPeriodic: {
    textAlign: 'center' as const,
    padding: spacing[12],
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    border: `2px dashed ${colors.primary[300]}`,
  },
  triggerButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: colors.primary[900],
    color: colors.primary[50],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
};

const hoverStyles = `
  .analysis-back-link:hover {
    color: ${colors.primary[900]};
  }
  .analysis-btn-primary:hover:not(:disabled) {
    background-color: ${colors.primary[800]};
  }
  .analysis-btn-secondary:hover:not(:disabled) {
    background-color: ${colors.primary[50]};
    border-color: ${colors.primary[400]};
  }
  .periodic-card:hover {
    border-color: ${colors.primary[400]} !important;
    box-shadow: ${shadows.sm} !important;
  }
`;

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrgId } = useOrganization();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [responses, setResponses] = useState<ResponseWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupBy, setGroupBy] = useState<'question' | 'responder'>('question');
  const [canAccessConversation, setCanAccessConversation] = useState<boolean | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [fullConversation, setFullConversation] = useState<Conversation | null>(null);
  const [periodicAnalyses, setPeriodicAnalyses] = useState<PeriodicAnalysis[]>([]);
  const [triggeringAnalysis, setTriggeringAnalysis] = useState(false);

  usePageTitle(conversation ? `Analysis - ${conversation.title}` : 'Analysis');

  useEffect(() => {
    if (id) {
      loadAnalysis();
      checkConversationAccess();
    }
  }, [id]);

  const checkConversationAccess = async () => {
    if (!id) return;
    try {
      const convData = await api.getConversation(id);
      setCanAccessConversation(true);
      setFullConversation(convData);

      // If continuous, load periodic analyses
      if (convData.is_continuous) {
        try {
          const periodicData = await api.listPeriodicAnalyses(id);
          setPeriodicAnalyses(periodicData.items || []);
        } catch (err) {
          console.error('Failed to load periodic analyses:', err);
        }
      }
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 403) {
        setCanAccessConversation(false);
      } else {
        setCanAccessConversation(true);
      }
    }
  };

  const loadAnalysis = async () => {
    try {
      const analysisData = await api.getAnalysis(id!);
      setAnalysis(analysisData);

      const minimalConv: any = {
        id,
        title: analysisData.conversation_title || 'Untitled Conversation',
        timezone: analysisData.conversation_timezone || 'UTC',
        show_verbatim_responses: analysisData.show_verbatim_responses || false,
        organization_id: analysisData.organization_id || null,
      };
      setConversation(minimalConv);

      if (analysisData.show_verbatim_responses) {
        try {
          const responsesData = await api.getResponses(id!);
          setResponses(responsesData.responses);
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

  const handleExportPDF = async () => {
    if (!analysis || !conversation || isExporting) return;

    setIsExporting(true);
    try {
      const blob = await generateAnalysisPDF({
        analysis,
        conversation,
        responses: conversation.show_verbatim_responses ? responses : undefined,
        options: {
          includeSurprisingInsights: true,
          includeVerbatim: conversation.show_verbatim_responses && responses.length > 0,
          fontFamily: 'lora',
        },
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.download = `${sanitizeFilename(conversation.title)}-analysis-${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleBackClick = () => {
    if (canAccessConversation) {
      navigate(`/conversations/${id}`);
    } else {
      navigate('/dashboard');
    }
  };

  const handleTriggerAnalysis = async () => {
    if (!id || triggeringAnalysis) return;
    setTriggeringAnalysis(true);
    try {
      await api.triggerPeriodicAnalysis(id);
      // Reload periodic analyses
      const periodicData = await api.listPeriodicAnalyses(id);
      setPeriodicAnalyses(periodicData.items || []);
    } catch (err) {
      console.error('Failed to trigger analysis:', err);
    } finally {
      setTriggeringAnalysis(false);
    }
  };

  const formatPeriodDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <SkeletonAnalysis />
          </div>
        </div>
      </>
    );
  }

  const conversationOrgId = conversation?.organization_id || null;
  const wrongWorkspace = conversation && conversationOrgId !== currentOrgId;

  if (!conversation || wrongWorkspace) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.emptyState}>
              <h3 style={styles.emptyStateTitle}>Conversation Not Found</h3>
              <p style={styles.emptyStateText}>
                This conversation doesn't exist or you don't have access to it.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                style={styles.buttonSecondary}
                className="analysis-btn-secondary"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // For continuous conversations, show periodic analyses list
  if (fullConversation?.is_continuous) {
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
                  className="analysis-back-link"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 12L6 8L10 4" />
                  </svg>
                  Back to Conversation
                </button>
                <h1 style={styles.title}>Analysis History</h1>
                <p style={styles.subtitle}>{fullConversation.title}</p>
              </div>
              <button
                onClick={handleTriggerAnalysis}
                style={{
                  ...styles.triggerButton,
                  ...(triggeringAnalysis ? styles.buttonDisabled : {}),
                }}
                className="analysis-btn-primary"
                disabled={triggeringAnalysis}
              >
                {triggeringAnalysis ? 'Running...' : 'Run Analysis Now'}
              </button>
            </header>

            <div style={styles.periodicHeader}>
              <div style={styles.periodicInfo}>
                <span style={styles.continuousBadge}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z"/>
                    <path fillRule="evenodd" d="M8 3.25a.75.75 0 01.75.75v4.25h3.25a.75.75 0 010 1.5H8a.75.75 0 01-.75-.75V4a.75.75 0 01.75-.75z"/>
                  </svg>
                  Continuous
                </span>
                <span style={styles.intervalText}>
                  {fullConversation.analysis_interval?.charAt(0).toUpperCase()}
                  {fullConversation.analysis_interval?.slice(1)} analysis
                </span>
              </div>
            </div>

            {periodicAnalyses.length === 0 ? (
              <div style={styles.emptyPeriodic}>
                <h3 style={styles.emptyStateTitle}>No Analysis Yet</h3>
                <p style={styles.emptyStateText}>
                  No periodic analyses have been run for this conversation yet.
                  Click "Run Analysis Now" to generate the first one.
                </p>
              </div>
            ) : (
              <div style={styles.periodicList}>
                {periodicAnalyses.map((pa) => (
                  <Link
                    key={pa.id}
                    to={`/conversations/${id}/analysis/${encodeURIComponent(pa.period_label)}`}
                    style={styles.periodicCard}
                    className="periodic-card"
                  >
                    <div style={styles.periodicCardContent}>
                      <div style={styles.periodLabel}>{pa.period_label}</div>
                      <div style={styles.periodMeta}>
                        <span style={styles.periodDate}>
                          {formatPeriodDate(pa.period_start)} — {formatPeriodDate(pa.period_end)}
                        </span>
                        <span style={styles.responsesBadge}>
                          {pa.total_responses_analyzed || 0} responses
                        </span>
                      </div>
                    </div>
                    <span style={styles.viewArrow}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  if (error || !analysis) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <EmptyState
              type="analysis"
              title="Analysis Not Available"
              description={error || 'No analysis has been run for this conversation yet.'}
              action={
                <button
                  onClick={handleBackClick}
                  style={styles.buttonPrimary}
                  className="analysis-btn-primary"
                >
                  {canAccessConversation ? 'Back to Conversation' : 'Back to Dashboard'}
                </button>
              }
            />
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
                className="analysis-back-link"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 12L6 8L10 4" />
                </svg>
                {canAccessConversation === false ? 'Back to Dashboard' : 'Back to Conversation'}
              </button>
              <h1 style={styles.title}>Analysis Results</h1>
              <p style={styles.subtitle}>{conversation.title}</p>
            </div>
            <button
              onClick={handleExportPDF}
              style={{
                ...styles.buttonSecondary,
                ...(isExporting ? styles.buttonDisabled : {}),
              }}
              className="analysis-btn-secondary"
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </header>

          {/* Overall Summary */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Overall Summary</h2>
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
              <div style={styles.metaItem}>
                <span style={styles.metaLabel}>Processing Time</span>
                <span style={styles.metaValue}>{(analysis.analysis_duration_ms / 1000).toFixed(2)}s</span>
              </div>
            </div>
          </div>

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
          <div style={{ marginBottom: spacing[6] }}>
            <h2 style={{ ...styles.cardTitle, marginBottom: spacing[4] }}>Question-by-Question Analysis</h2>

            {analysis.question_analyses && analysis.question_analyses.length > 0 ? (
              analysis.question_analyses.map((qa, index) => (
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
                      <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.primary[700], marginBottom: spacing[3] }}>Themes</h4>
                      {qa.themes.map((theme, themeIndex) => (
                        <div key={themeIndex} style={styles.themeCard}>
                          <div style={styles.themeHeader}>
                            <span style={styles.themeName}>{theme.theme}</span>
                            <span style={styles.frequencyBadge}>{theme.frequency} responses</span>
                          </div>
                          <p style={styles.themeSummary}>{theme.summary}</p>

                          {theme.perspectives && theme.perspectives.length > 0 && (
                            <div>
                              <h5 style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.primary[600], marginTop: spacing[3], marginBottom: spacing[2] }}>Perspectives</h5>
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
                              <h5 style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.primary[600], marginTop: spacing[3], marginBottom: spacing[2] }}>Key Points</h5>
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
                          <span style={styles.averageScale}> / 10</span>
                        </div>
                        <div style={styles.ratingRange}>
                          <span>Min: {qa.rating_stats.min_value}</span>
                          <span>Max: {qa.rating_stats.max_value}</span>
                        </div>
                      </div>

                      <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.primary[700], marginBottom: spacing[3] }}>Distribution</h4>
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
                      <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.primary[700], marginBottom: spacing[3] }}>Results</h4>
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

                  {/* No themes for text */}
                  {qa.question_type === 'text' && (!qa.themes || qa.themes.length === 0) && (
                    <div>
                      {qa.summary ? (
                        <div>
                          <h4 style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: colors.primary[700], marginBottom: spacing[2] }}>Summary</h4>
                          <p style={styles.summaryText}>{qa.summary}</p>
                        </div>
                      ) : (
                        <p style={styles.noAnalysis}>Not enough responses to generate analysis.</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p style={styles.noAnalysis}>No analysis available.</p>
            )}
          </div>

          {/* Verbatim Responses */}
          {conversation?.show_verbatim_responses && responses.length > 0 && (
            <div style={styles.verbatimSection}>
              <div style={styles.sectionHeader}>
                <div>
                  <h3 style={styles.sectionTitle}>Verbatim Responses</h3>
                  <p style={styles.sectionDescription}>All responses submitted by participants.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <label htmlFor="groupBy" style={{ fontSize: typography.fontSize.sm, color: colors.primary[600] }}>Group by:</label>
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

          {/* Technical Details */}
          <div style={styles.technicalDetails}>
            <h3 style={{ ...styles.sectionTitle, marginBottom: spacing[4] }}>Technical Details</h3>
            <div style={styles.detailsGrid}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Embedding Model</span>
                <span style={styles.detailValue}>{analysis.embedding_provider} / {analysis.embedding_model}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Clustering</span>
                <span style={styles.detailValue}>{analysis.clustering_algorithm.toUpperCase()}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>LLM</span>
                <span style={styles.detailValue}>{analysis.llm_provider} / {analysis.llm_model}</span>
              </div>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Analysis Date</span>
                <span style={styles.detailValue}>{formatDate(analysis.created_at, conversation?.timezone)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

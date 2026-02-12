import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Analysis } from '../types';
import { spacing, typography, borders, shadows } from '../styles/tokens';
import { InlineHint } from '../components/ContextualHint';
import { useOnboarding } from '../hooks/useOnboarding';

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: 'var(--color-primary-100)',
    padding: spacing[6],
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    marginBottom: spacing[6],
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    color: 'var(--color-primary-600)',
    textDecoration: 'none',
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    padding: 0,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  card: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: '1px solid var(--color-primary-200)',
    padding: spacing[6],
    marginBottom: spacing[4],
    boxShadow: shadows.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
  },
  summary: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-700)',
    lineHeight: typography.lineHeight.relaxed,
    whiteSpace: 'pre-wrap' as const,
  },
  insightCard: {
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.md,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  insightTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  insightText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
  },
  loading: {
    textAlign: 'center' as const,
    padding: spacing[12],
    color: 'var(--color-primary-500)',
  },
  error: {
    textAlign: 'center' as const,
    padding: spacing[12],
  },
  errorTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[4],
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[3]} ${spacing[6]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
  },
  meta: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    marginTop: spacing[4],
  },
  questionCard: {
    marginBottom: spacing[4],
  },
  questionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[3],
  },
  themeItem: {
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  themeName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-800)',
  },
  themeDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    marginTop: spacing[1],
  },
  responseCount: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    marginTop: spacing[1],
  },
};

export function AnalysisViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { completeStep } = useOnboarding();

  useEffect(() => {
    if (id) {
      loadAnalysis();
    }
  }, [id]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAnalysis(id!);
      setAnalysis(data);
      // Mark onboarding steps as complete when viewing analysis
      completeStep('run-analysis');
      completeStep('view-insights');
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Analysis not found or you don\'t have access to view it.');
      } else {
        setError('Failed to load analysis. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.loading}>Loading analysis...</div>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.error}>
            <h2 style={styles.errorTitle}>Analysis Not Available</h2>
            <p style={styles.errorText}>{error || 'Analysis not found.'}</p>
            <button style={styles.button} onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <button style={styles.backLink} onClick={() => navigate('/dashboard')}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 12L6 8L10 4" />
            </svg>
            Back to Dashboard
          </button>
          <h1 style={styles.title}>{analysis.conversation_title || 'Analysis Results'}</h1>
        </header>

        {/* Contextual hint about analysis */}
        <InlineHint
          hintId="first-response-received"
          title="Understanding your analysis"
          message="AI has identified key themes and patterns from your responses. Scroll down to see insights for each question."
          icon="info"
          variant="info"
        />

        {/* Overall Summary */}
        {analysis.overall_summary && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Summary</h2>
            <p style={styles.summary}>{analysis.overall_summary}</p>
          </div>
        )}

        {/* Surprising Insights */}
        {analysis.surprising_insights && analysis.surprising_insights.length > 0 && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Key Insights</h2>
            {analysis.surprising_insights.map((insight, index) => (
              <div key={index} style={styles.insightCard}>
                <h3 style={styles.insightTitle}>{insight.title}</h3>
                <p style={styles.insightText}>{insight.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Question Analyses */}
        {analysis.question_analyses && analysis.question_analyses.length > 0 && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Question Breakdown</h2>
            {analysis.question_analyses.map((qa, index) => (
              <div key={index} style={styles.questionCard}>
                <h3 style={styles.questionTitle}>{qa.question_text}</h3>
                {qa.summary && <p style={styles.summary}>{qa.summary}</p>}
                {qa.themes && qa.themes.length > 0 && (
                  <div style={{ marginTop: spacing[3] }}>
                    {qa.themes.map((theme, tIndex) => (
                      <div key={tIndex} style={styles.themeItem}>
                        <div style={styles.themeName}>{theme.theme}</div>
                        {theme.summary && (
                          <div style={styles.themeDescription}>{theme.summary}</div>
                        )}
                        <div style={styles.responseCount}>
                          {theme.frequency} response{theme.frequency !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Meta info */}
        <div style={styles.meta}>
          Analysis completed {new Date(analysis.created_at).toLocaleDateString()}
          {' '}&middot;{' '}
          {analysis.total_responses_analyzed} responses analyzed
        </div>
      </div>
    </div>
  );
}

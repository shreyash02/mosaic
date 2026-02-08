import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { SeriesWithConversations, ConversationListItem, CollectionAnalysis } from '../types';
import { ConversationState } from '../types';
import { formatDateShort } from '../utils/formatting';
import TrendChart from '../components/TrendChart';
import { colors, typography, spacing, borders, shadows, transitions } from '../styles';

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: colors.primary[50],
    padding: spacing[6],
    paddingTop: 'calc(60px + 1.5rem)',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    color: colors.primary[600],
    textDecoration: 'none',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[4],
    transition: transitions.duration.normal,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[8],
    flexWrap: 'wrap' as const,
    gap: spacing[4],
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
    marginBottom: spacing[2],
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.primary[600],
    lineHeight: typography.lineHeight.relaxed,
    maxWidth: '600px',
  },
  headerActions: {
    display: 'flex',
    gap: spacing[3],
    alignItems: 'center',
  },
  buttonPrimary: {
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
    textDecoration: 'none',
  },
  buttonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
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
  buttonDanger: {
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
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  section: {
    marginBottom: spacing[8],
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginBottom: spacing[4],
  },
  card: {
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    border: `1px solid ${colors.primary[200]}`,
    padding: spacing[6],
    marginBottom: spacing[4],
  },
  cardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginBottom: spacing[3],
  },
  cardText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    lineHeight: typography.lineHeight.relaxed,
  },
  insightItem: {
    paddingBottom: spacing[4],
    marginBottom: spacing[4],
    borderBottom: `1px solid ${colors.primary[200]}`,
  },
  insightItemLast: {
    paddingBottom: 0,
    marginBottom: 0,
    borderBottom: 'none',
  },
  insightTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginBottom: spacing[2],
  },
  insightDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    lineHeight: typography.lineHeight.relaxed,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    border: `1px solid ${colors.primary[200]}`,
    padding: spacing[4],
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[500],
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide,
    marginBottom: spacing[1],
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
  },
  conversationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: spacing[4],
  },
  conversationCard: {
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    border: `1px solid ${colors.primary[200]}`,
    padding: spacing[5],
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  conversationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  conversationTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    margin: 0,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${spacing[1]} ${spacing[2]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.full,
    whiteSpace: 'nowrap' as const,
  },
  badgeDraft: {
    backgroundColor: colors.primary[100],
    color: colors.primary[600],
  },
  badgeActive: {
    backgroundColor: colors.primary[900],
    color: colors.primary[50],
  },
  badgeClosed: {
    backgroundColor: colors.primary[200],
    color: colors.primary[700],
  },
  badgeAnalyzed: {
    backgroundColor: colors.primary[800],
    color: colors.primary[50],
  },
  conversationMeta: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[500],
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: `${spacing[12]} ${spacing[6]}`,
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    border: `1px solid ${colors.primary[200]}`,
  },
  emptyStateTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginBottom: spacing[2],
  },
  emptyStateText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    marginBottom: spacing[4],
  },
  loading: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: colors.primary[500],
  },
  error: {
    backgroundColor: colors.primary[100],
    border: `1px solid ${colors.primary[300]}`,
    color: colors.primary[900],
    padding: spacing[4],
    borderRadius: borders.radius.md,
    marginBottom: spacing[4],
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: spacing[4],
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
    maxWidth: '400px',
    width: '100%',
    boxShadow: shadows.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
    marginBottom: spacing[4],
  },
  modalText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[4],
  },
  modalActions: {
    display: 'flex',
    gap: spacing[3],
    justifyContent: 'flex-end',
  },
};

const hoverStyles = `
  .collection-back-link:hover {
    color: ${colors.primary[900]};
  }
  .collection-btn-primary:hover:not(:disabled) {
    background-color: ${colors.primary[800]};
  }
  .collection-btn-secondary:hover:not(:disabled) {
    background-color: ${colors.primary[50]};
    border-color: ${colors.primary[400]};
  }
  .collection-btn-danger:hover:not(:disabled) {
    background-color: ${colors.primary[700]};
  }
  .collection-conversation-card:hover {
    border-color: ${colors.primary[400]};
    box-shadow: ${shadows.md};
  }
`;

export default function CollectionDetailPageNew() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<SeriesWithConversations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<CollectionAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [computing, setComputing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadCollection();
      loadAnalysis();
    }
  }, [id]);

  const loadCollection = async () => {
    if (!id) return;

    try {
      const data = await api.getSeries(id);
      setCollection(data);
    } catch (err: any) {
      setError('Failed to load collection');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysis = async () => {
    if (!id) return;

    setLoadingAnalysis(true);
    try {
      const data = await api.getCollectionAnalysis(id);
      setAnalysis(data);

      if (!data) {
        handleComputeAnalysis(false);
      }
    } catch (err: any) {
      console.error('Failed to load analysis:', err);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleComputeAnalysis = async (force: boolean = true) => {
    if (!id) return;

    setComputing(true);
    try {
      const data = await api.computeCollectionAnalysis(id, force);
      setAnalysis(data);
    } catch (err: any) {
      console.error('Failed to compute analysis:', err);
      setError('Failed to compute analysis');
    } finally {
      setComputing(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    setDeleting(true);
    try {
      await api.deleteSeries(id);
      navigate('/collections');
    } catch (err: any) {
      console.error('Failed to delete collection:', err);
      setError(err.response?.data?.detail || 'Failed to delete collection');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const getStateLabel = (state: ConversationState) => {
    switch (state) {
      case ConversationState.DRAFT:
        return 'Draft';
      case ConversationState.ACTIVE:
        return 'Active';
      case ConversationState.CLOSED:
        return 'Closed';
      case ConversationState.ANALYZED:
        return 'Analyzed';
      case ConversationState.DELETED:
        return 'Deleted';
      default:
        return state;
    }
  };

  const getBadgeStyle = (state: ConversationState) => {
    switch (state) {
      case ConversationState.DRAFT:
        return { ...styles.badge, ...styles.badgeDraft };
      case ConversationState.ACTIVE:
        return { ...styles.badge, ...styles.badgeActive };
      case ConversationState.CLOSED:
        return { ...styles.badge, ...styles.badgeClosed };
      case ConversationState.ANALYZED:
        return { ...styles.badge, ...styles.badgeAnalyzed };
      default:
        return styles.badge;
    }
  };

  if (loading) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.loading}>Loading collection...</div>
          </div>
        </div>
      </>
    );
  }

  if (error || !collection) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.error}>{error || 'Collection not found'}</div>
            <Link to="/collections" style={styles.buttonSecondary} className="collection-btn-secondary">
              Back to Collections
            </Link>
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
          <Link to="/collections" style={styles.backLink} className="collection-back-link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 12L6 8L10 4" />
            </svg>
            Back to Collections
          </Link>

          <header style={styles.header}>
            <div style={styles.headerInfo}>
              <h1 style={styles.title}>{collection.name}</h1>
              {collection.description && (
                <p style={styles.description}>{collection.description}</p>
              )}
            </div>
            <div style={styles.headerActions}>
              <button
                onClick={() => handleComputeAnalysis(true)}
                disabled={computing}
                style={{
                  ...(analysis ? styles.buttonSecondary : styles.buttonPrimary),
                  ...(computing ? styles.buttonDisabled : {}),
                }}
                className={analysis ? 'collection-btn-secondary' : 'collection-btn-primary'}
              >
                {computing
                  ? (analysis ? 'Re-running...' : 'Running...')
                  : (analysis ? 'Re-run Analysis' : 'Run Analysis')}
              </button>
              <button
                style={styles.buttonDanger}
                className="collection-btn-danger"
                onClick={() => setShowDeleteModal(true)}
              >
                Delete
              </button>
            </div>
          </header>

          {/* Analysis Section */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Collection Insights</h2>

            {loadingAnalysis || computing ? (
              <div style={styles.loading}>Loading analysis...</div>
            ) : analysis ? (
              <>
                {/* Stats */}
                <div style={styles.statsGrid}>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>Conversations</div>
                    <div style={styles.statValue}>{analysis.total_conversations}</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>Total Responses</div>
                    <div style={styles.statValue}>{analysis.total_responses}</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>Analyzed</div>
                    <div style={styles.statValue}>{analysis.conversations_analyzed}</div>
                  </div>
                </div>

                {/* Summary */}
                {analysis.overall_summary && (
                  <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Summary</h3>
                    <p style={styles.cardText}>{analysis.overall_summary}</p>
                  </div>
                )}

                {/* Key Insights */}
                {analysis.surprising_insights && analysis.surprising_insights.length > 0 && (
                  <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Key Insights</h3>
                    {analysis.surprising_insights.map((insight, idx) => (
                      <div
                        key={idx}
                        style={idx === analysis.surprising_insights!.length - 1
                          ? { ...styles.insightItem, ...styles.insightItemLast }
                          : styles.insightItem
                        }
                      >
                        <h4 style={styles.insightTitle}>{insight.title}</h4>
                        <p style={styles.insightDescription}>{insight.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Trends */}
                {analysis.trends && analysis.trends.themes && analysis.trends.themes.length > 0 && (
                  <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Trends Over Time</h3>
                    <TrendChart trends={analysis.trends} />
                  </div>
                )}
              </>
            ) : (
              <div style={styles.emptyState}>
                <p style={styles.emptyStateText}>No analysis computed yet.</p>
                <button
                  onClick={() => handleComputeAnalysis(true)}
                  disabled={computing}
                  style={{
                    ...styles.buttonPrimary,
                    ...(computing ? styles.buttonDisabled : {}),
                  }}
                  className="collection-btn-primary"
                >
                  {computing ? 'Running analysis...' : 'Run Analysis'}
                </button>
              </div>
            )}
          </section>

          {/* Conversations Section */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Conversations</h2>

            {collection.conversations.length === 0 ? (
              <div style={styles.emptyState}>
                <h3 style={styles.emptyStateTitle}>No conversations in this collection</h3>
                <p style={styles.emptyStateText}>Conversations added to this collection will appear here</p>
              </div>
            ) : (
              <div style={styles.conversationGrid}>
                {collection.conversations.map((conv: ConversationListItem) => (
                  <div
                    key={conv.id}
                    style={styles.conversationCard}
                    className="collection-conversation-card"
                    onClick={() => navigate(`/conversations/${conv.id}`)}
                  >
                    <div style={styles.conversationHeader}>
                      <h3 style={styles.conversationTitle}>{conv.title}</h3>
                      <span style={getBadgeStyle(conv.state)}>
                        {getStateLabel(conv.state)}
                      </span>
                    </div>
                    <div style={styles.conversationMeta}>
                      <span>Created {formatDateShort(conv.created_at)}</span>
                      {conv.activated_at && (
                        <span> · Activated {formatDateShort(conv.activated_at)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Delete Modal */}
        {showDeleteModal && (
          <div style={styles.modalOverlay} onClick={() => !deleting && setShowDeleteModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Delete Collection</h2>
              <p style={styles.modalText}>
                Are you sure you want to delete <strong>{collection.name}</strong>?
              </p>
              <p style={styles.modalText}>
                This action cannot be undone. The collection will be deleted, but all conversations
                in it will remain and will no longer be part of any collection.
              </p>
              <div style={styles.modalActions}>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setError('');
                  }}
                  style={{
                    ...styles.buttonSecondary,
                    ...(deleting ? styles.buttonDisabled : {}),
                  }}
                  className="collection-btn-secondary"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    ...styles.buttonDanger,
                    ...(deleting ? styles.buttonDisabled : {}),
                  }}
                  className="collection-btn-danger"
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Collection'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

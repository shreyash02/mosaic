import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Conversation, ConversationListItem } from '../types';
import { ConversationState, RecurrencePattern } from '../types';
import { formatDate } from '../utils/formatting';
import { useOrganization } from '../contexts/OrganizationContext';
import { colors, typography, spacing, borders, shadows, transitions } from '../styles';

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
    marginBottom: spacing[6],
    flexWrap: 'wrap' as const,
    gap: spacing[4],
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    flexWrap: 'wrap' as const,
    marginBottom: spacing[2],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
    margin: 0,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.full,
  },
  badgeDraft: {
    backgroundColor: colors.primary[200],
    color: colors.primary[700],
  },
  badgePublished: {
    backgroundColor: colors.primary[900],
    color: colors.primary[50],
  },
  badgeTemplate: {
    backgroundColor: colors.primary[100],
    color: colors.primary[700],
    gap: spacing[1],
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.primary[600],
    lineHeight: typography.lineHeight.relaxed,
  },
  headerActions: {
    display: 'flex',
    gap: spacing[3],
    flexWrap: 'wrap' as const,
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
    textDecoration: 'none',
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
    textDecoration: 'none',
  },
  buttonDanger: {
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
  infoMessage: {
    backgroundColor: colors.primary[100],
    border: `1px solid ${colors.primary[300]}`,
    color: colors.primary[800],
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[6],
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: spacing[6],
    marginBottom: spacing[6],
  },
  card: {
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    border: `1px solid ${colors.primary[200]}`,
    padding: spacing[6],
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginBottom: spacing[4],
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing[3],
    marginBottom: spacing[3],
    borderBottom: `1px solid ${colors.primary[100]}`,
  },
  infoItemLast: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 0,
    marginBottom: 0,
    borderBottom: 'none',
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    fontWeight: typography.fontWeight.medium,
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[900],
    fontWeight: typography.fontWeight.medium,
  },
  questionItem: {
    display: 'flex',
    gap: spacing[3],
    paddingBottom: spacing[3],
    marginBottom: spacing[3],
    borderBottom: `1px solid ${colors.primary[100]}`,
  },
  questionItemLast: {
    display: 'flex',
    gap: spacing[3],
    paddingBottom: 0,
    marginBottom: 0,
    borderBottom: 'none',
  },
  questionNumber: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[400],
    minWidth: '24px',
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[900],
    marginBottom: spacing[1],
  },
  questionType: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[500],
    textTransform: 'capitalize' as const,
  },
  instanceCard: {
    display: 'block',
    padding: spacing[4],
    backgroundColor: colors.primary[50],
    borderRadius: borders.radius.md,
    marginBottom: spacing[3],
    textDecoration: 'none',
    transition: transitions.duration.normal,
  },
  instanceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  instanceTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
  },
  instanceMeta: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[500],
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: spacing[3],
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: colors.primary[500],
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
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
    fontSize: typography.fontSize.sm,
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
    marginBottom: spacing[6],
  },
  modalActions: {
    display: 'flex',
    gap: spacing[3],
    justifyContent: 'flex-end',
  },
};

const hoverStyles = `
  .template-back-link:hover {
    color: ${colors.primary[900]};
  }
  .template-btn-primary:hover:not(:disabled) {
    background-color: ${colors.primary[800]};
  }
  .template-btn-secondary:hover:not(:disabled) {
    background-color: ${colors.primary[50]};
    border-color: ${colors.primary[400]};
  }
  .template-btn-danger:hover:not(:disabled) {
    background-color: ${colors.primary[100]};
  }
  .template-instance-card:hover {
    background-color: ${colors.primary[100]};
  }
`;

export default function TemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrgId } = useOrganization();
  const [template, setTemplate] = useState<Conversation | null>(null);
  const [instances, setInstances] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadTemplate();
    }
  }, [id]);

  useEffect(() => {
    if (template && id) {
      loadInstances();
    }
  }, [template, id]);

  const loadTemplate = async () => {
    try {
      const data = await api.getConversation(id!);

      if (!data.is_template) {
        setError('This is not a template');
        setLoading(false);
        return;
      }

      setTemplate(data);
    } catch (err: any) {
      setError('Failed to load template');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadInstances = async () => {
    if (!template || !id) return;

    try {
      const allConversations = await api.getConversations();
      const templateInstances = allConversations.filter(
        (conv: ConversationListItem) =>
          conv.parent_conversation_id === id ||
          (template.template_series_id && conv.series_id === template.template_series_id)
      );
      setInstances(templateInstances);
    } catch (err: any) {
      console.error('Failed to load instances:', err);
    }
  };

  const handleCreateInstanceNow = () => {
    if (!template) return;

    navigate('/create/from-template/review', {
      state: {
        isFollowUp: true,
        isRecurring: true,
        parentConversationId: id,
        templateSeriesId: template.template_series_id,
        copySettings: true,
        copyInvitations: true,
        copyQuestions: true,
        parentConversation: template,
        instanceNumber: instances.length + 1,
      }
    });
  };

  const handleEdit = () => {
    navigate(`/templates/${id}/edit`);
  };

  const handlePublish = async () => {
    if (!template) return;
    setActionLoading(true);
    try {
      const updated = await api.activateConversation(id!);
      setTemplate(updated);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to publish template');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteConversation(id!);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete template');
      setShowDeleteModal(false);
    }
  };

  const formatRecurrencePattern = (pattern?: RecurrencePattern) => {
    if (!pattern) return '';
    const map: Record<RecurrencePattern, string> = {
      [RecurrencePattern.WEEKLY]: 'Weekly',
      [RecurrencePattern.BIWEEKLY]: 'Every 2 weeks',
      [RecurrencePattern.MONTHLY]: 'Monthly',
      [RecurrencePattern.QUARTERLY]: 'Quarterly',
    };
    return map[pattern] || pattern;
  };

  const formatAnonymityLevel = (level: string) => {
    const map: Record<string, string> = {
      fully_anonymous: 'Fully Anonymous',
      platform_tracked: 'Platform Tracked',
      revealable: 'Revealable',
    };
    return map[level] || level;
  };

  const formatResultsAccess = (access: string) => {
    const map: Record<string, string> = {
      creator_only: 'Creator Only',
      participants: 'Participants',
      public_link: 'Public Link',
    };
    return map[access] || access;
  };

  if (loading) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.loading}>Loading template...</div>
          </div>
        </div>
      </>
    );
  }

  const templateOrgId = template?.organization_id || null;
  const wrongWorkspace = template && templateOrgId !== currentOrgId;

  if (!template || wrongWorkspace) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.card}>
              <h2 style={{ ...styles.cardTitle, marginBottom: spacing[2] }}>Template Not Found</h2>
              <p style={{ color: colors.primary[500], marginBottom: spacing[4] }}>
                This template doesn't exist or you don't have access to it.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                style={styles.buttonSecondary}
                className="template-btn-secondary"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error && template) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.error}>{error}</div>
            <Link to="/dashboard" style={styles.buttonSecondary} className="template-btn-secondary">
              Back to Dashboard
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
          <button
            onClick={() => navigate('/dashboard')}
            style={{ ...styles.backLink, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            className="template-back-link"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 12L6 8L10 4" />
            </svg>
            Back to Dashboard
          </button>

          <header style={styles.header}>
            <div style={styles.headerInfo}>
              <div style={styles.titleRow}>
                <h1 style={styles.title}>{template.title}</h1>
                <span style={{
                  ...styles.badge,
                  ...(template.state === ConversationState.DRAFT ? styles.badgeDraft : styles.badgePublished),
                }}>
                  {template.state === ConversationState.DRAFT ? 'Unpublished' : 'Published'}
                </span>
                <span style={{ ...styles.badge, ...styles.badgeTemplate }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                  </svg>
                  Template
                </span>
              </div>
              {template.description && (
                <p style={styles.description}>{template.description}</p>
              )}
            </div>
            <div style={styles.headerActions}>
              {template.state === ConversationState.DRAFT ? (
                <button
                  onClick={handlePublish}
                  style={{
                    ...styles.buttonPrimary,
                    ...(actionLoading ? styles.buttonDisabled : {}),
                  }}
                  className="template-btn-primary"
                  disabled={actionLoading}
                >
                  Publish Template
                </button>
              ) : (
                <button
                  onClick={handleCreateInstanceNow}
                  style={{
                    ...styles.buttonPrimary,
                    ...(actionLoading ? styles.buttonDisabled : {}),
                  }}
                  className="template-btn-primary"
                  disabled={actionLoading}
                >
                  New Conversation
                </button>
              )}
              <button
                onClick={handleEdit}
                style={{
                  ...styles.buttonSecondary,
                  ...(actionLoading ? styles.buttonDisabled : {}),
                }}
                className="template-btn-secondary"
                disabled={actionLoading}
              >
                Edit Template
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                style={{
                  ...styles.buttonDanger,
                  ...(actionLoading ? styles.buttonDisabled : {}),
                }}
                className="template-btn-danger"
                disabled={actionLoading}
              >
                Delete
              </button>
            </div>
          </header>

          {error && <div style={styles.error}>{error}</div>}

          {template.state === ConversationState.DRAFT && (
            <div style={styles.infoMessage}>
              <strong>Template is unpublished.</strong> Publish this template to enable automatic conversation creation based on the recurrence schedule. You can also create conversations manually anytime.
            </div>
          )}

          <div style={styles.grid}>
            {/* Recurrence Schedule */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Recurrence Schedule</h2>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Pattern</span>
                <span style={styles.infoValue}>{formatRecurrencePattern(template.recurrence_pattern)}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Next Conversation</span>
                <span style={styles.infoValue}>
                  {template.next_instance_date ? formatDate(template.next_instance_date) : 'Not scheduled'}
                </span>
              </div>
              <div style={styles.infoItemLast}>
                <span style={styles.infoLabel}>Ends</span>
                <span style={styles.infoValue}>
                  {template.recurrence_end_date ? formatDate(template.recurrence_end_date) : 'Never'}
                </span>
              </div>
            </div>

            {/* Template Settings */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}>Template Settings</h2>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Anonymity Level</span>
                <span style={styles.infoValue}>{formatAnonymityLevel(template.anonymity_level)}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Results Access</span>
                <span style={styles.infoValue}>{formatResultsAccess(template.results_access)}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Invite Only</span>
                <span style={styles.infoValue}>{template.invite_only ? 'Yes' : 'No'}</span>
              </div>
              <div style={styles.infoItemLast}>
                <span style={styles.infoLabel}>Duration</span>
                <span style={styles.infoValue}>
                  {template.duration_minutes ? `${template.duration_minutes} minutes` : 'Not set'}
                </span>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div style={{ ...styles.card, marginBottom: spacing[6] }}>
            <h2 style={styles.cardTitle}>Questions ({template.questions?.length || 0})</h2>
            {template.questions && template.questions.length > 0 ? (
              template.questions
                .sort((a, b) => a.question_order - b.question_order)
                .map((q, index) => (
                  <div
                    key={q.id}
                    style={index === template.questions!.length - 1 ? styles.questionItemLast : styles.questionItem}
                  >
                    <span style={styles.questionNumber}>{index + 1}.</span>
                    <div style={styles.questionContent}>
                      <p style={styles.questionText}>{q.question_text}</p>
                      <span style={styles.questionType}>{q.question_type?.replace('_', ' ')}</span>
                    </div>
                  </div>
                ))
            ) : (
              <p style={{ color: colors.primary[500], fontSize: typography.fontSize.sm }}>
                No questions defined
              </p>
            )}
          </div>

          {/* Instances */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Conversations Created ({instances.length})</h2>
            {instances.length > 0 ? (
              instances
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((instance) => (
                  <Link
                    key={instance.id}
                    to={`/conversations/${instance.id}`}
                    style={styles.instanceCard}
                    className="template-instance-card"
                  >
                    <div style={styles.instanceHeader}>
                      <span style={styles.instanceTitle}>{instance.title}</span>
                      <span style={{
                        ...styles.badge,
                        ...(instance.state === 'active' ? styles.badgePublished : styles.badgeDraft),
                      }}>
                        {instance.state}
                      </span>
                    </div>
                    <div style={styles.instanceMeta}>
                      <span>Created: {formatDate(instance.created_at)}</span>
                      {instance.activated_at && (
                        <span>Activated: {formatDate(instance.activated_at)}</span>
                      )}
                      {instance.response_count !== undefined && (
                        <span>Responses: {instance.response_count}</span>
                      )}
                    </div>
                  </Link>
                ))
            ) : (
              <div style={styles.emptyState}>
                No instances have been created from this template yet.<br />
                Instances will be created automatically based on the schedule, or you can create one manually.
              </div>
            )}
          </div>
        </div>

        {/* Delete Modal */}
        {showDeleteModal && (
          <div style={styles.modalOverlay} onClick={() => setShowDeleteModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Delete Template?</h2>
              <p style={styles.modalText}>
                Are you sure you want to delete this template? Conversations created from this template will be preserved but will no longer be linked to it. This action cannot be undone.
              </p>
              <div style={styles.modalActions}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  style={styles.buttonSecondary}
                  className="template-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  style={styles.buttonPrimary}
                  className="template-btn-primary"
                >
                  Delete Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

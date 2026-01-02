import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Conversation, ConversationListItem } from '../types';
import { ConversationState, RecurrencePattern } from '../types';
import { formatDate } from '../utils/formatting';
import { useOrganization } from '../contexts/OrganizationContext';

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
      loadInstances();
    }
  }, [id]);

  const loadTemplate = async () => {
    try {
      const data = await api.getConversation(id!);

      // Verify this is actually a template
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
    try {
      // Get all conversations and filter for instances of this template
      // Instances belong to the template's series (template_series_id)
      const allConversations = await api.getConversations();
      const templateInstances = template?.template_series_id
        ? allConversations.filter(
            (conv: ConversationListItem) => conv.series_id === template.template_series_id
          )
        : [];
      setInstances(templateInstances);
    } catch (err: any) {
      console.error('Failed to load instances:', err);
    }
  };

  const handleCreateInstanceNow = () => {
    if (!template) return;

    // Navigate to create page to create a new instance manually
    navigate('/conversations/new', {
      state: {
        isFollowUp: true,
        isRecurring: true,
        parentConversationId: id,
        templateSeriesId: template.template_series_id,  // Pass template's series_id
        copySettings: true,
        copyInvitations: true,
        copyQuestions: true,
        parentConversation: template,
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

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading template...</div>
      </div>
    );
  }

  // Check if template doesn't exist (404 from API) OR belongs to wrong workspace
  const templateOrgId = template?.organization_id || null;
  const wrongWorkspace = template && templateOrgId !== currentOrgId;

  if (!template || wrongWorkspace) {
    return (
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Conversation Not Found</h1>
        </div>
        <div className="empty-state">
          <h3>This conversation doesn't exist or you don't have access to it</h3>
          <p>The conversation may have been deleted or you may not have permission to view it.</p>
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show error if not a valid template
  if (error && template) {
    return (
      <div className="container">
        <div className="error-message">{error}</div>
        <Link to="/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="conversation-detail-page">
      <div className="page-header">
        <div>
          <button onClick={() => navigate('/dashboard')} className="btn-back">
            ← Back to Dashboard
          </button>
          <div className="title-row">
            <h1>
              {template.title}
            </h1>
            <span className={`status-badge-inline status-${template.state}`}>
              {template.state === ConversationState.DRAFT ? 'Unpublished' : 'Published'}
            </span>
            <span className="badge recurring-badge" title="Recurring Template">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
              </svg>
              TEMPLATE
            </span>
          </div>
          {template.description && <p className="description">{template.description}</p>}
        </div>
        <div className="header-actions">
          <div className="conversation-actions-top">
            {template.state === ConversationState.DRAFT ? (
              <button
                onClick={handlePublish}
                className="btn btn-primary btn-small"
                disabled={actionLoading}
              >
                Publish Template
              </button>
            ) : (
              <button
                onClick={handleCreateInstanceNow}
                className="btn btn-primary btn-small"
                disabled={actionLoading}
              >
                New Conversation
              </button>
            )}

            <button
              onClick={handleEdit}
              className="btn btn-outline-secondary btn-small"
              disabled={actionLoading}
            >
              Edit Template
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn btn-outline-danger btn-small"
              disabled={actionLoading}
            >
              Delete Template
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {template.state === ConversationState.DRAFT && (
        <div className="info-message" style={{ margin: '1rem 0', padding: '1rem', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px' }}>
          <strong>Template is unpublished.</strong> Publish this template to enable automatic conversation creation based on the recurrence schedule. You can also create conversations manually anytime.
        </div>
      )}

      <div className="conversation-content">
        <div className="info-panel">
          <h2>Recurrence Schedule</h2>

          {template.state === ConversationState.DRAFT && (
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Automatic conversations will be created once the template is published.
            </p>
          )}

          <div className="info-item">
            <label>Pattern:</label>
            <span>{formatRecurrencePattern(template.recurrence_pattern)}</span>
          </div>

          <div className="info-item">
            <label>Next Conversation:</label>
            <span>{template.next_instance_date ? formatDate(template.next_instance_date) : 'Not scheduled'}</span>
          </div>

          <div className="info-item">
            <label>Ends:</label>
            <span>{template.recurrence_end_date ? formatDate(template.recurrence_end_date) : 'Never (continues indefinitely)'}</span>
          </div>
        </div>

        <div className="info-panel">
          <h2>Template Settings</h2>

          <div className="info-item">
            <label>Anonymity Level:</label>
            <span>{template.anonymity_level}</span>
          </div>

          <div className="info-item">
            <label>Results Access:</label>
            <span>{template.results_access}</span>
          </div>

          <div className="info-item">
            <label>Invite Only:</label>
            <span>{template.invite_only ? 'Yes' : 'No'}</span>
          </div>

          <div className="info-item">
            <label>Auto Analyze:</label>
            <span>{template.auto_analyze ? 'Yes' : 'No'}</span>
          </div>

          {template.duration_minutes && (
            <div className="info-item">
              <label>Duration:</label>
              <span>{template.duration_minutes} minutes</span>
            </div>
          )}
        </div>

        <div className="info-panel">
          <h2>Questions ({template.questions?.length || 0})</h2>

          {template.questions && template.questions.length > 0 ? (
            <div className="questions-list">
              {template.questions
                .sort((a, b) => a.question_order - b.question_order)
                .map((q, index) => (
                  <div key={q.id} className="question-item">
                    <span className="question-number">{index + 1}.</span>
                    <div className="question-content">
                      <p className="question-text">{q.question_text}</p>
                      <span className="question-type">{q.question_type}</span>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="no-data">No questions defined</p>
          )}
        </div>

        <div className="info-panel">
          <h2>Conversations created ({instances.length})</h2>

          {instances.length > 0 ? (
            instances
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((instance) => (
                <div key={instance.id} className="info-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <Link
                    to={`/conversations/${instance.id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '1rem', color: '#2d3748' }}>{instance.title}</strong>
                      <span className={`status-badge-inline status-${instance.state}`}>
                        {instance.state}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#718096', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                      <span>Created: {formatDate(instance.created_at)}</span>
                      {instance.activated_at && (
                        <span>Activated: {formatDate(instance.activated_at)}</span>
                      )}
                      {instance.closed_at && (
                        <span>Closed: {formatDate(instance.closed_at)}</span>
                      )}
                      {instance.response_count !== undefined && (
                        <span>Responses: {instance.response_count}</span>
                      )}
                    </div>
                  </Link>
                </div>
              ))
          ) : (
            <p style={{ color: '#718096', textAlign: 'center', padding: '2rem' }}>
              No instances have been created from this template yet.<br />
              Instances will be created automatically based on the schedule, or you can create one manually.
            </p>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete Template?</h2>
            <p>
              Are you sure you want to delete this template? This will also delete all instances created from this template.
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-danger"
              >
                Delete Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

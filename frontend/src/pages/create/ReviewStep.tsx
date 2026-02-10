import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversationForm } from '../../contexts/ConversationFormContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import ConfigurationSummary from '../../components/ConfigurationSummary';
import ConversationPreview from '../../components/ConversationPreview';
import { INTENT_PRESETS } from '../../types/intentPresets';
import { api } from '../../services/api';
import type { Series } from '../../types';

export default function ReviewStep() {
  const navigate = useNavigate();
  const { formState, updateFormState, resetForm, getStepPath } = useConversationForm();
  const { currentOrgId } = useOrganization();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [showCreateSeriesModal, setShowCreateSeriesModal] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newSeriesDescription, setNewSeriesDescription] = useState('');
  const [creatingSeries, setCreatingSeries] = useState(false);

  useEffect(() => {
    const loadSeries = async () => {
      try {
        const series = await api.listSeries(currentOrgId || undefined);
        setSeriesList(series);
      } catch (err) {
        console.error('Failed to load series:', err);
      }
    };
    loadSeries();
  }, [currentOrgId]);

  const handleCreateSeries = async () => {
    if (!newSeriesName.trim()) {
      setError('Series name is required');
      return;
    }

    setCreatingSeries(true);
    setError('');
    try {
      const newSeries = await api.createSeries({
        name: newSeriesName.trim(),
        description: newSeriesDescription.trim() || undefined,
        organization_id: currentOrgId || undefined,
      });

      const updatedSeries = await api.listSeries(currentOrgId || undefined);
      setSeriesList(updatedSeries);

      updateFormState({ selectedSeriesId: newSeries.id, addToSeries: true });

      setShowCreateSeriesModal(false);
      setNewSeriesName('');
      setNewSeriesDescription('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create series');
    } finally {
      setCreatingSeries(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      // Validate
      if (formState.questions.length === 0) {
        setError('At least one question is required');
        setLoading(false);
        return;
      }

      if (formState.questions.some((q) => !q.question_text.trim())) {
        setError('All questions must have text');
        setLoading(false);
        return;
      }

      if (!formState.inviteOnly && formState.inviteEmails.trim()) {
        setError('Email addresses can only be provided when invite-only mode is enabled');
        setLoading(false);
        return;
      }

      if (formState.scheduleActivation && formState.scheduledActivateAt) {
        const scheduledDate = new Date(formState.scheduledActivateAt);
        const now = new Date();
        if (scheduledDate <= now) {
          setError('Scheduled activation time must be in the future');
          setLoading(false);
          return;
        }
      }

      if (formState.createTemplate && formState.enableRecurring) {
        if (!formState.nextInstanceDate) {
          setError('First instance date is required when recurring schedule is enabled');
          setLoading(false);
          return;
        }
        const firstInstanceDate = new Date(formState.nextInstanceDate);
        const now = new Date();
        if (firstInstanceDate <= now) {
          setError('First instance date must be in the future');
          setLoading(false);
          return;
        }
      }

      // Validate long-running feedback
      if (formState.isLongRunning && !formState.analysisInterval) {
        setError('Analysis interval is required for long-running feedback');
        setLoading(false);
        return;
      }

      // Calculate total minutes (only for limited time)
      const totalMinutes = formState.durationHours * 60 + formState.durationMinutes;

      // Get user's timezone
      let userTimezone = 'UTC';
      try {
        userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch (err) {
        console.warn('Failed to detect timezone, using UTC:', err);
      }

      // Prepare conversation data
      // Strip the 'id' field from questions as it's only used for React keys
      const questionsForApi = formState.questions.map(({ id, ...rest }) => rest);

      const conversationData = {
        title: formState.title,
        ...(formState.participantTitle.trim() && { participant_title: formState.participantTitle.trim() }),
        description: formState.description,
        ...(formState.headerImageUrl && { header_image_url: formState.headerImageUrl }),
        anonymity_level: formState.anonymityLevel,
        results_access: formState.resultsAccess,
        show_verbatim_responses: formState.showVerbatimResponses,
        invite_only: formState.inviteOnly,
        timezone: userTimezone,
        questions: questionsForApi,
        // Duration only applies to limited-time conversations
        ...(!formState.isLongRunning && totalMinutes > 0 && { duration_minutes: totalMinutes }),
        ...(formState.scheduleActivation && formState.scheduledActivateAt && {
          scheduled_activate_at: formState.scheduledActivateAt + ':00'
        }),
        ...(formState.isFollowUp && formState.parentConversationId && {
          parent_conversation_id: formState.parentConversationId
        }),
        is_template: formState.createTemplate || false,
        template_series_id: formState.createTemplate && formState.addToSeries && formState.selectedSeriesId
          ? formState.selectedSeriesId
          : undefined,
        ...(formState.addToSeries && formState.selectedSeriesId && !formState.createTemplate && {
          series_id: formState.selectedSeriesId
        }),
        ...(currentOrgId && { organization_id: currentOrgId }),
        ...(formState.createTemplate && formState.enableRecurring && {
          recurrence_pattern: formState.recurrencePattern,
          ...(formState.nextInstanceDate && { next_instance_date: formState.nextInstanceDate + ':00' }),
          ...(formState.recurrenceEndDate && { recurrence_end_date: formState.recurrenceEndDate + ':00' }),
        }),
        // Long-running feedback (continuous conversations)
        ...(formState.isLongRunning && {
          is_continuous: true,
          analysis_interval: formState.analysisInterval,
          analysis_timezone: userTimezone,
        }),
      };

      // Create or update conversation
      let conversation;
      if (formState.isEditMode && formState.conversationId) {
        // Update existing conversation
        conversation = await api.updateConversation(formState.conversationId, conversationData);
      } else {
        // Create new conversation
        conversation = await api.createConversation(conversationData);
      }

      // Invite users if needed
      if (formState.inviteOnly && formState.inviteEmails.trim()) {
        const emails = formState.inviteEmails
          .split(',')
          .map(e => e.trim())
          .filter(e => e.length > 0 && e.includes('@'));

        if (emails.length > 0) {
          try {
            await api.inviteUsers(conversation.id, emails);
          } catch (inviteErr: any) {
            console.error('Failed to invite users during creation:', inviteErr);
          }
        }
      }

      // Clear form draft
      resetForm();

      // Navigate to appropriate page
      if (conversation.is_template) {
        navigate(`/templates/${conversation.id}`);
      } else {
        navigate(`/conversations/${conversation.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create conversation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="conversation-form">
      <style>{`
        @media (max-width: 768px) {
          .review-summary-box {
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            background-color: transparent !important;
            border-bottom: 1px solid #e2e8f0 !important;
            padding-bottom: 1rem !important;
          }
          .conversation-form .checkbox-label {
            border: none !important;
            border-radius: 0 !important;
            background-color: transparent !important;
            padding: 0.5rem 0 !important;
          }
        }
      `}</style>
      {error && <div className="error-message">{error}</div>}

      <div className="form-section">
        <h2>{formState.createTemplate ? 'Review' : 'Review & Launch'}</h2>
        <p className="form-help-text" style={{ marginBottom: '1.5rem' }}>
          Review your {formState.createTemplate ? 'template' : 'conversation'} and configure final options
        </p>

        {/* Summary */}
        <div
          className="review-summary-box"
          style={{
            backgroundColor: '#f7fafc',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            marginBottom: '1.5rem',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#2d3748', marginBottom: '1rem' }}>
            Summary
          </h3>
          <div style={{ fontSize: '0.875rem', color: '#4a5568', lineHeight: '1.6' }}>
            <p style={{ margin: '0.5rem 0' }}>
              <strong>Title:</strong> {formState.title}
            </p>
            {formState.participantTitle && (
              <p style={{ margin: '0.5rem 0' }}>
                <strong>Display Title:</strong> {formState.participantTitle}
              </p>
            )}
            <p style={{ margin: '0.5rem 0' }}>
              <strong>Questions:</strong> {formState.questions.length} question{formState.questions.length !== 1 ? 's' : ''}
            </p>
            {formState.isLongRunning ? (
              <p style={{ margin: '0.5rem 0' }}>
                <strong>Mode:</strong> Long-running feedback ({formState.analysisInterval} analysis)
              </p>
            ) : (
              <>
                {(formState.durationHours > 0 || formState.durationMinutes > 0) && (
                  <p style={{ margin: '0.5rem 0' }}>
                    <strong>Duration:</strong> {formState.durationHours > 0 && `${formState.durationHours} hour${formState.durationHours !== 1 ? 's' : ''}`}
                    {formState.durationHours > 0 && formState.durationMinutes > 0 && ', '}
                    {formState.durationMinutes > 0 && `${formState.durationMinutes} minute${formState.durationMinutes !== 1 ? 's' : ''}`}
                  </p>
                )}
              </>
            )}
            {formState.scheduleActivation && formState.scheduledActivateAt && (
              <p style={{ margin: '0.5rem 0' }}>
                <strong>Scheduled for:</strong> {new Date(formState.scheduledActivateAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Privacy Configuration (Guided Mode) */}
        {formState.isGuidedMode && formState.selectedIntent && (
          <ConfigurationSummary
            intent={INTENT_PRESETS[formState.selectedIntent]}
            anonymityLevel={formState.anonymityLevel}
            resultsAccess={formState.resultsAccess}
            showVerbatimResponses={formState.showVerbatimResponses}
            inviteOnly={formState.inviteOnly}
            inviteEmails={formState.inviteEmails}
            onAnonymityChange={(val) => updateFormState({ anonymityLevel: val })}
            onResultsAccessChange={(val) => updateFormState({ resultsAccess: val })}
            onShowVerbatimChange={(val) => updateFormState({ showVerbatimResponses: val })}
            onInviteOnlyChange={(val) => updateFormState({ inviteOnly: val })}
            onInviteEmailsChange={(val) => updateFormState({ inviteEmails: val })}
          />
        )}

        {/* Invite Users (Manual Mode) */}
        {!formState.isGuidedMode && formState.inviteOnly && (
          <div className="form-section">
            <h3>Invite Users</h3>
            <div className="form-group">
              <label htmlFor="invite-emails">Invite Users by Email (Optional)</label>
              <textarea
                id="invite-emails"
                value={formState.inviteEmails}
                onChange={(e) => updateFormState({ inviteEmails: e.target.value })}
                placeholder="user1@example.com, user2@example.com"
                rows={3}
              />
              <p className="form-help-text">
                Enter email addresses separated by commas. You can also add more invitations after creating the conversation.
              </p>
            </div>
          </div>
        )}

        {/* Organization */}
        <div className="form-section">
          <h3>Organization (Optional)</h3>
          <div className="form-group">
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <input
                type="checkbox"
                checked={formState.addToSeries}
                onChange={(e) => {
                  updateFormState({ addToSeries: e.target.checked });
                  if (!e.target.checked) {
                    updateFormState({ selectedSeriesId: '' });
                  }
                }}
                style={{ marginRight: '0.5rem' }}
              />
              <span style={{ fontWeight: 600 }}>
                {formState.createTemplate ? 'Set Collection for Instances' : 'Add to Collection'}
              </span>
            </label>
            <p className="form-help-text" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
              {formState.createTemplate
                ? 'Instances created from this template will automatically join the selected collection.'
                : 'Group this conversation with related conversations in a collection.'}
            </p>

            {formState.addToSeries && (
              <div style={{ paddingLeft: '1.5rem', borderLeft: '3px solid #4299e1' }}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label htmlFor="seriesSelect">Select Collection</label>
                    <button
                      type="button"
                      onClick={() => setShowCreateSeriesModal(true)}
                      className="btn btn-secondary btn-small"
                      style={{ fontSize: '0.85rem', padding: '0.25rem 0.75rem' }}
                    >
                      + Create New
                    </button>
                  </div>
                  <select
                    id="seriesSelect"
                    value={formState.selectedSeriesId}
                    onChange={(e) => updateFormState({ selectedSeriesId: e.target.value })}
                    required={formState.addToSeries}
                  >
                    <option value="">-- Select a collection --</option>
                    {seriesList.map((series) => (
                      <option key={series.id} value={series.id}>
                        {series.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="form-actions" style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '2rem',
        paddingTop: '2rem',
        borderTop: '1px solid #e2e8f0',
      }}>
        <button
          type="button"
          onClick={() => {
            // If creating from template, go back to template page
            if (formState.parentConversation?.is_template && formState.parentConversationId) {
              navigate(`/templates/${formState.parentConversationId}`);
            } else {
              navigate(getStepPath('timing'));
            }
          }}
          className="btn btn-secondary"
        >
          ← {formState.parentConversation?.is_template ? 'Back to Template' : 'Back'}
        </button>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="btn btn-secondary btn-large"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="btn btn-primary btn-large"
          >
            {loading
              ? (formState.isEditMode ? 'Updating...' : 'Creating...')
              : formState.isEditMode
                ? (formState.createTemplate ? 'Update Template' : 'Update Conversation')
                : (formState.createTemplate ? 'Create Template' : 'Create Conversation')}
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <ConversationPreview
          title={formState.title}
          participantTitle={formState.participantTitle}
          description={formState.description}
          headerImageUrl={formState.headerImageUrl}
          anonymityLevel={formState.anonymityLevel}
          questions={formState.questions}
          maxResponseLength={10000}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* Create Series Modal */}
      {showCreateSeriesModal && (
        <div className="modal-overlay" onClick={() => {
          if (!creatingSeries) {
            setShowCreateSeriesModal(false);
            setNewSeriesName('');
            setNewSeriesDescription('');
            setError('');
          }
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>Create New Collection</h2>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              Create a new collection to group related conversations together.
            </p>

            <div className="form-group">
              <label htmlFor="newSeriesName">Collection Name *</label>
              <input
                id="newSeriesName"
                type="text"
                value={newSeriesName}
                onChange={(e) => setNewSeriesName(e.target.value)}
                placeholder="e.g., Q1 2025 Retros"
                required
                disabled={creatingSeries}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && newSeriesName.trim() && !creatingSeries) {
                    e.preventDefault();
                    handleCreateSeries();
                  }
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="newSeriesDescription">Description (optional)</label>
              <textarea
                id="newSeriesDescription"
                value={newSeriesDescription}
                onChange={(e) => setNewSeriesDescription(e.target.value)}
                placeholder="Describe what this collection is for..."
                rows={3}
                disabled={creatingSeries}
              />
            </div>

            {error && <div className="error-message" style={{ marginTop: '1rem' }}>{error}</div>}

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  if (!creatingSeries) {
                    setShowCreateSeriesModal(false);
                    setNewSeriesName('');
                    setNewSeriesDescription('');
                    setError('');
                  }
                }}
                className="btn btn-secondary"
                disabled={creatingSeries}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSeries}
                className="btn btn-primary"
                disabled={creatingSeries || !newSeriesName.trim()}
              >
                {creatingSeries ? 'Creating...' : 'Create Collection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

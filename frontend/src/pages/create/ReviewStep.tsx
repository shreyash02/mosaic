import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversationForm } from '../../contexts/ConversationFormContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import ConfigurationSummary from '../../components/ConfigurationSummary';
import ConversationPreview from '../../components/ConversationPreview';
import { INTENT_PRESETS } from '../../types/intentPresets';
import { api } from '../../services/api';
import type { Series } from '../../types';
import { typography, spacing, borders, shadows } from '../../styles';

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
  const [showCollectionDropdown, setShowCollectionDropdown] = useState(false);
  const collectionDropdownRef = useRef<HTMLDivElement>(null);

  // Close collection dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (collectionDropdownRef.current && !collectionDropdownRef.current.contains(event.target as Node)) {
        setShowCollectionDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      if (!formState.title.trim()) {
        setError('Title is required');
        setLoading(false);
        return;
      }

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
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        // Pydantic validation errors come as an array
        const messages = detail.map((e: any) => e.msg || e.message || JSON.stringify(e));
        setError(messages.join('. '));
      } else if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('Failed to create conversation');
      }
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

        {/* Collection */}
        <div className="form-section">
          <h3>Collection (Optional)</h3>
          <p className="form-help-text" style={{ marginBottom: spacing[4] }}>
            {formState.createTemplate
              ? 'Instances created from this template will automatically join the selected collection.'
              : 'Group this conversation with related conversations in a collection.'}
          </p>

          <div className="form-group">
            {formState.selectedSeriesId ? (
              // Show selected collection with remove option
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing[2],
                padding: `${spacing[2]} ${spacing[3]}`,
                backgroundColor: 'var(--color-primary-100)',
                borderRadius: borders.radius.md,
                border: '1px solid var(--color-primary-300)',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-primary-600)' }}>
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-900)' }}>
                  In collection: <strong>{seriesList.find(s => s.id === formState.selectedSeriesId)?.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    updateFormState({ selectedSeriesId: '', addToSeries: false });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    padding: 0,
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: borders.radius.full,
                    cursor: 'pointer',
                    color: 'var(--color-primary-500)',
                  }}
                  title="Remove from collection"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              // Show "Add to Collection" dropdown
              <div ref={collectionDropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  type="button"
                  onClick={() => setShowCollectionDropdown(!showCollectionDropdown)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: spacing[2],
                    padding: `${spacing[2]} ${spacing[3]}`,
                    backgroundColor: 'transparent',
                    border: '1px dashed var(--color-primary-400)',
                    borderRadius: borders.radius.md,
                    fontSize: typography.fontSize.sm,
                    color: 'var(--color-primary-600)',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add to Collection
                </button>

                {showCollectionDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: spacing[1],
                    backgroundColor: 'var(--color-primary-50)',
                    border: '1px solid var(--color-primary-300)',
                    borderRadius: borders.radius.md,
                    boxShadow: shadows.lg,
                    minWidth: '240px',
                    maxHeight: '280px',
                    overflowY: 'auto',
                    zIndex: 100,
                  }}>
                    {seriesList.length === 0 ? (
                      <div style={{ padding: spacing[4], textAlign: 'center', color: 'var(--color-primary-500)', fontSize: typography.fontSize.sm }}>
                        No collections yet
                      </div>
                    ) : (
                      seriesList.map((series) => (
                        <button
                          key={series.id}
                          type="button"
                          onClick={() => {
                            updateFormState({ selectedSeriesId: series.id, addToSeries: true });
                            setShowCollectionDropdown(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: spacing[2],
                            width: '100%',
                            padding: `${spacing[3]} ${spacing[4]}`,
                            backgroundColor: 'transparent',
                            border: 'none',
                            textAlign: 'left',
                            fontSize: typography.fontSize.sm,
                            color: 'var(--color-primary-900)',
                            cursor: 'pointer',
                            borderBottom: '1px solid var(--color-primary-100)',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-50)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-primary-400)', flexShrink: 0 }}>
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {series.name}
                          </span>
                        </button>
                      ))
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowCollectionDropdown(false);
                        setShowCreateSeriesModal(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: spacing[2],
                        width: '100%',
                        padding: `${spacing[3]} ${spacing[4]}`,
                        backgroundColor: 'var(--color-primary-50)',
                        border: 'none',
                        textAlign: 'left',
                        fontSize: typography.fontSize.sm,
                        fontWeight: typography.fontWeight.medium,
                        color: 'var(--color-primary-700)',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-100)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-50)'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Create New Collection
                    </button>
                  </div>
                )}
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

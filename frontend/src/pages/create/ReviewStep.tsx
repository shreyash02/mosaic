import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversationForm } from '../../contexts/ConversationFormContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import ConversationPreview from '../../components/ConversationPreview';
import { INTENT_PRESETS } from '../../types/intentPresets';
import { api } from '../../services/api';
import type { Series } from '../../types';
import { typography, spacing, borders, shadows, transitions } from '../../styles';
import { AnonymityLevel, ResultsAccess, RecurrencePattern } from '../../types';

// Card component for consistent styling
const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[5],
    ...style,
  }}>
    {children}
  </div>
);

// Helper to get question type label
const getQuestionTypeLabel = (type: string) => {
  switch (type) {
    case 'text': return 'text';
    case 'rating': return 'rating';
    case 'single_choice': return 'single choice';
    case 'multiple_choice': return 'multiple choice';
    default: return type;
  }
};

// Helper to get anonymity label
const getAnonymityLabel = (level: AnonymityLevel) => {
  switch (level) {
    case AnonymityLevel.FULLY_ANONYMOUS: return 'Fully Anonymous';
    case AnonymityLevel.OPEN: return 'Open';
    case AnonymityLevel.REVEALABLE: return 'Revealable';
    case AnonymityLevel.PLATFORM_TRACKED: return 'Platform Tracked';
    default: return level;
  }
};

// Helper to get results access label
const getResultsAccessLabel = (access: ResultsAccess) => {
  switch (access) {
    case ResultsAccess.CREATOR_ONLY: return 'Creator only';
    case ResultsAccess.PARTICIPANTS: return 'All respondents';
    case ResultsAccess.PUBLIC_LINK: return 'Public';
    default: return access;
  }
};

// Helper to get recurrence pattern label
const getRecurrencePatternLabel = (pattern: RecurrencePattern) => {
  switch (pattern) {
    case RecurrencePattern.WEEKLY: return 'Weekly';
    case RecurrencePattern.BIWEEKLY: return 'Every 2 weeks';
    case RecurrencePattern.MONTHLY: return 'Monthly';
    case RecurrencePattern.QUARTERLY: return 'Quarterly';
    default: return pattern;
  }
};

// Helper to format date for display
const formatScheduleDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

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
  const [showCustomizePrivacy, setShowCustomizePrivacy] = useState(false);
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

  const handleSubmit = async (saveAsDraft = false) => {
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
        allow_response_editing: formState.allowResponseEditing,
        timezone: userTimezone,
        questions: questionsForApi,
        // Duration only applies to limited-time conversations
        ...(!formState.isLongRunning && totalMinutes > 0 && { duration_minutes: totalMinutes }),
        // If saving as draft, don't schedule activation
        ...(formState.scheduleActivation && formState.scheduledActivateAt && !saveAsDraft && {
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

  // Get activation status text
  const getActivationStatus = () => {
    if (formState.scheduleActivation && formState.scheduledActivateAt) {
      return `Scheduled (${new Date(formState.scheduledActivateAt).toLocaleString()})`;
    }
    return 'Manual (will be created as draft)';
  };

  // Get intent name
  const getIntentName = () => {
    if (formState.selectedIntent && INTENT_PRESETS[formState.selectedIntent]) {
      return INTENT_PRESETS[formState.selectedIntent].label;
    }
    return 'Custom';
  };

  // Collection dropdown component (shared between views)
  const CollectionDropdown = () => (
    <div className="form-group">
      {formState.selectedSeriesId ? (
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
            onClick={() => updateFormState({ selectedSeriesId: '', addToSeries: false })}
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
              border: 'none',
              fontSize: typography.fontSize.sm,
              color: 'var(--color-primary-600)',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add to collection
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
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-100)'}
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
  );

  // New design render
  const renderNewDesign = () => (
    <div style={{
      display: 'flex',
      gap: spacing[5],
      alignItems: 'flex-start',
    }}>
      {/* Main content column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Summary Card */}
        <Card style={{ marginBottom: spacing[4] }}>
          <div style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-700)' }}>
            {/* Conversation Type */}
            <div style={{ marginBottom: spacing[3] }}>
              <div style={{ color: 'var(--color-primary-500)', marginBottom: spacing[1] }}>Conversation Type</div>
              <div style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>{getIntentName()}</div>
            </div>

            {/* Title */}
            <div style={{ marginBottom: spacing[3] }}>
              <div style={{ color: 'var(--color-primary-500)', marginBottom: spacing[1] }}>Title</div>
              <div style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>{formState.title}</div>
            </div>

            {/* Questions */}
            <div style={{ marginBottom: spacing[3] }}>
              <div style={{ color: 'var(--color-primary-500)', marginBottom: spacing[2] }}>Questions</div>
              <ol style={{ margin: 0, paddingLeft: spacing[5], color: 'var(--color-primary-900)' }}>
                {formState.questions.map((q, idx) => (
                  <li key={q.id || idx} style={{ marginBottom: spacing[1] }}>
                    {q.question_text || 'Untitled question'}{' '}
                    <span style={{ color: 'var(--color-primary-400)' }}>({getQuestionTypeLabel(q.question_type || 'text')})</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Duration */}
            {!formState.isLongRunning && (formState.durationHours > 0 || formState.durationMinutes > 0) && (
              <div style={{ marginBottom: spacing[3] }}>
                <div style={{ color: 'var(--color-primary-500)', marginBottom: spacing[1] }}>Duration</div>
                <div style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                  {formState.durationHours} {formState.durationHours === 1 ? 'hour' : 'hours'}
                  {formState.durationMinutes > 0 && ` ${formState.durationMinutes} ${formState.durationMinutes === 1 ? 'minute' : 'minutes'}`}
                </div>
              </div>
            )}

            {/* Long-running mode */}
            {formState.isLongRunning && (
              <div style={{ marginBottom: spacing[3] }}>
                <div style={{ color: 'var(--color-primary-500)', marginBottom: spacing[1] }}>Mode</div>
                <div style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                  Long-running feedback ({formState.analysisInterval} analysis)
                </div>
              </div>
            )}

            {/* Activation - only show for non-templates */}
            {!formState.createTemplate && (
              <div style={{ marginBottom: spacing[3] }}>
                <div style={{ color: 'var(--color-primary-500)', marginBottom: spacing[1] }}>Activation</div>
                <div style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>{getActivationStatus()}</div>
              </div>
            )}

            {/* Recurring Schedule - only show for templates with recurring enabled */}
            {formState.createTemplate && formState.enableRecurring && (
              <div style={{
                marginTop: spacing[3],
                paddingTop: spacing[3],
                borderTop: '1px solid var(--color-primary-200)',
              }}>
                <div style={{ color: 'var(--color-primary-500)', marginBottom: spacing[2], display: 'flex', alignItems: 'center', gap: spacing[2] }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                  </svg>
                  Recurring Schedule
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[3] }}>
                  <div>
                    <div style={{ color: 'var(--color-primary-400)', fontSize: typography.fontSize.xs, marginBottom: spacing[1] }}>Frequency</div>
                    <div style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                      {getRecurrencePatternLabel(formState.recurrencePattern)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-primary-400)', fontSize: typography.fontSize.xs, marginBottom: spacing[1] }}>First Instance</div>
                    <div style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                      {formState.nextInstanceDate ? formatScheduleDate(formState.nextInstanceDate) : 'Not set'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-primary-400)', fontSize: typography.fontSize.xs, marginBottom: spacing[1] }}>Timezone</div>
                    <div style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                      {Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')}
                    </div>
                  </div>
                  {formState.recurrenceEndDate && (
                    <div>
                      <div style={{ color: 'var(--color-primary-400)', fontSize: typography.fontSize.xs, marginBottom: spacing[1] }}>Ends</div>
                      <div style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                        {formatScheduleDate(formState.recurrenceEndDate)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Privacy & Access Settings Card */}
        <Card style={{ marginBottom: spacing[4] }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-primary-900)' }}>
              Privacy & Access Settings
            </h3>
            <button
              type="button"
              onClick={() => setShowCustomizePrivacy(!showCustomizePrivacy)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing[1],
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: typography.fontSize.sm,
                color: 'var(--color-primary-600)',
                cursor: 'pointer',
              }}
            >
              {showCustomizePrivacy ? (
                'Done'
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Customize
                </>
              )}
            </button>
          </div>

          {/* Info banner */}
          {formState.selectedIntent && (
            <div style={{
              backgroundColor: 'var(--color-info-50, #eff6ff)',
              border: `1px solid var(--color-info-200, #bfdbfe)`,
              borderRadius: borders.radius.md,
              padding: spacing[3],
              marginBottom: spacing[4],
              fontSize: typography.fontSize.sm,
              color: 'var(--color-info-700, #1d4ed8)',
            }}>
              These settings have been configured for {getIntentName()}. Click "Customize" to adjust them.
            </div>
          )}

          {/* 2x2 Grid of settings */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: spacing[4] }}>
            {/* Anonymity */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[2] }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="2" style={{ marginTop: '2px', flexShrink: 0 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <div>
                <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)', marginBottom: spacing[1] }}>Anonymity</div>
                <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                  {getAnonymityLabel(formState.anonymityLevel)}
                </div>
              </div>
            </div>

            {/* Access */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[2] }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="2" style={{ marginTop: '2px', flexShrink: 0 }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <div>
                <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)', marginBottom: spacing[1] }}>Access</div>
                <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                  {formState.inviteOnly ? 'Invite-only' : 'Open to all'}
                </div>
              </div>
            </div>

            {/* Results Visibility */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[2] }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="2" style={{ marginTop: '2px', flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <div>
                <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)', marginBottom: spacing[1] }}>Results Visibility</div>
                <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                  {getResultsAccessLabel(formState.resultsAccess)}
                </div>
              </div>
            </div>

            {/* Verbatim Responses */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing[2] }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-400)" strokeWidth="2" style={{ marginTop: '2px', flexShrink: 0 }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <div>
                <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)', marginBottom: spacing[1] }}>Verbatim Responses</div>
                <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                  {formState.showVerbatimResponses ? 'Visible' : 'Summaries only'}
                </div>
              </div>
            </div>
          </div>

          {/* Expandable customization panel */}
          {showCustomizePrivacy && (
            <div style={{ marginTop: spacing[4], paddingTop: spacing[4], borderTop: '1px solid var(--color-primary-200)' }}>
              {/* How anonymous are responses? */}
              <div style={{ marginBottom: spacing[5] }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-500)" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                    How anonymous are responses?
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                  {[
                    { value: AnonymityLevel.OPEN, label: 'Does not matter', desc: 'Anyone can respond. Identity recorded if logged in.' },
                    { value: AnonymityLevel.FULLY_ANONYMOUS, label: 'Fully anonymous', desc: 'No identity tracking. Requires secret codes.' },
                    { value: AnonymityLevel.PLATFORM_TRACKED, label: 'Anonymous to you', desc: 'Login required. Platform tracks, hidden from you.' },
                    { value: AnonymityLevel.REVEALABLE, label: 'Revealable', desc: 'Login required. You can reveal identities later.' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: spacing[3],
                        padding: spacing[3],
                        borderRadius: borders.radius.md,
                        border: formState.anonymityLevel === option.value ? '1px solid var(--color-primary-500)' : '1px solid var(--color-primary-200)',
                        backgroundColor: formState.anonymityLevel === option.value ? 'var(--color-primary-50)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="anonymity"
                        checked={formState.anonymityLevel === option.value}
                        onChange={() => updateFormState({ anonymityLevel: option.value })}
                        style={{ marginTop: '2px', accentColor: 'var(--color-primary-600)' }}
                      />
                      <div>
                        <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>{option.label}</div>
                        <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)' }}>{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Who can respond? */}
              <div style={{ marginBottom: spacing[5] }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-500)" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                    Who can respond?
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                  {[
                    { value: false, label: 'Anyone with the link', desc: 'Share the link publicly or with specific people.' },
                    { value: true, label: 'Invite-only', desc: 'Only invited participants can respond.' },
                  ].map((option) => (
                    <label
                      key={String(option.value)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: spacing[3],
                        padding: spacing[3],
                        borderRadius: borders.radius.md,
                        border: formState.inviteOnly === option.value ? '1px solid var(--color-primary-500)' : '1px solid var(--color-primary-200)',
                        backgroundColor: formState.inviteOnly === option.value ? 'var(--color-primary-50)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="access"
                        checked={formState.inviteOnly === option.value}
                        onChange={() => updateFormState({ inviteOnly: option.value })}
                        style={{ marginTop: '2px', accentColor: 'var(--color-primary-600)' }}
                      />
                      <div>
                        <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>{option.label}</div>
                        <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)' }}>{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Who can see results? */}
              <div style={{ marginBottom: spacing[5] }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-500)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <span style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                    Who can see results?
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                  {[
                    { value: ResultsAccess.CREATOR_ONLY, label: 'Only me', desc: 'Respondents see a confirmation but not the results.' },
                    { value: ResultsAccess.PARTICIPANTS, label: 'All respondents', desc: 'Anyone who responds can view all results and analysis.' },
                    { value: ResultsAccess.PUBLIC_LINK, label: 'Anyone with link', desc: 'Results are public to anyone with the results link.' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: spacing[3],
                        padding: spacing[3],
                        borderRadius: borders.radius.md,
                        border: formState.resultsAccess === option.value ? '1px solid var(--color-primary-500)' : '1px solid var(--color-primary-200)',
                        backgroundColor: formState.resultsAccess === option.value ? 'var(--color-primary-50)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="results"
                        checked={formState.resultsAccess === option.value}
                        onChange={() => updateFormState({ resultsAccess: option.value })}
                        style={{ marginTop: '2px', accentColor: 'var(--color-primary-600)' }}
                      />
                      <div>
                        <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>{option.label}</div>
                        <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)' }}>{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Show verbatim responses */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: spacing[3],
                  padding: spacing[3],
                  borderRadius: borders.radius.md,
                  border: '1px solid var(--color-primary-200)',
                  backgroundColor: formState.showVerbatimResponses ? 'var(--color-primary-50)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={formState.showVerbatimResponses}
                  onChange={(e) => updateFormState({ showVerbatimResponses: e.target.checked })}
                  style={{ marginTop: '2px', accentColor: 'var(--color-primary-600)' }}
                />
                <div>
                  <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>Show verbatim responses</div>
                  <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)' }}>When disabled, viewers only see AI-generated summaries.</div>
                </div>
              </label>

              {/* Allow response editing */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: spacing[3],
                  padding: spacing[3],
                  borderRadius: borders.radius.md,
                  border: '1px solid var(--color-primary-200)',
                  backgroundColor: formState.allowResponseEditing ? 'var(--color-primary-50)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={formState.allowResponseEditing}
                  onChange={(e) => updateFormState({ allowResponseEditing: e.target.checked })}
                  style={{ marginTop: '2px', accentColor: 'var(--color-primary-600)' }}
                />
                <div>
                  <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>Allow response editing</div>
                  <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)' }}>Participants can edit their submitted responses while the conversation is active.</div>
                </div>
              </label>
            </div>
          )}
        </Card>

        {/* Collection Card */}
        <Card style={{ marginBottom: spacing[4] }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-primary-900)', marginBottom: spacing[2] }}>
            Collection (Optional)
          </h3>
          <p style={{ margin: 0, fontSize: typography.fontSize.sm, color: 'var(--color-primary-500)', marginBottom: spacing[3] }}>
            {formState.createTemplate
              ? 'Instances created from this template will automatically join the selected collection.'
              : 'Group this conversation with related conversations in a collection.'}
          </p>
          <CollectionDropdown />
        </Card>

        {/* Invite Users (Manual Mode) */}
        {!formState.isGuidedMode && formState.inviteOnly && (
          <Card style={{ marginBottom: spacing[4] }}>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-primary-900)', marginBottom: spacing[3] }}>
              Invite Users
            </h3>
            <div className="form-group">
              <label htmlFor="invite-emails">Invite Users by Email (Optional)</label>
              <textarea
                id="invite-emails"
                value={formState.inviteEmails}
                onChange={(e) => updateFormState({ inviteEmails: e.target.value })}
                placeholder="user1@example.com, user2@example.com"
                rows={3}
                style={{ fontFamily: 'inherit' }}
              />
              <p className="form-help-text">
                Enter email addresses separated by commas. You can also add more invitations after creating the conversation.
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Sidebar - Respondent Preview */}
      <div style={{ width: '260px', flexShrink: 0 }}>
        <Card>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-primary-900)', marginBottom: spacing[4] }}>
            Respondent Preview
          </h3>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing[2],
              width: '100%',
              padding: spacing[3],
              backgroundColor: 'var(--color-primary-50)',
              border: '1px solid var(--color-primary-300)',
              borderRadius: borders.radius.md,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: 'var(--color-primary-700)',
              cursor: 'pointer',
              transition: `all ${transitions.duration.fast} ${transitions.timing.ease}`,
              marginBottom: spacing[3],
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Show Preview
          </button>
          <div style={{
            backgroundColor: 'var(--color-info-50, #eff6ff)',
            border: `1px solid var(--color-info-200, #bfdbfe)`,
            borderRadius: borders.radius.md,
            padding: spacing[3],
            fontSize: typography.fontSize.xs,
            color: 'var(--color-info-700, #1d4ed8)',
          }}>
            This is how respondents will see your conversation
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="conversation-form">
      {error && <div className="error-message">{error}</div>}

      <div className="section-header">
        <h2>{formState.createTemplate ? 'Review' : 'Review & Launch'}</h2>
      </div>
      <p className="form-help-text" style={{ marginBottom: '1.5rem' }}>
        Review your {formState.createTemplate ? 'template' : 'conversation'} and configure final options
      </p>

      {renderNewDesign()}

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
          {!formState.isEditMode && (
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="btn btn-secondary btn-large"
            >
              Save as Draft
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={loading}
            className="btn btn-primary btn-large"
            style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}
          >
            {!loading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
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

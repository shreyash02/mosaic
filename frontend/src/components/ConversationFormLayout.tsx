import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useConversationForm } from '../contexts/ConversationFormContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useFeature } from '../contexts/FeaturesContext';
import SetupModeToggle from './SetupModeToggle';
import { api } from '../services/api';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';

interface Step {
  id: string;
  label: string;
  path: string;
  guidedOnly?: boolean;
  manualOnly?: boolean;
}

const STEPS: Step[] = [
  { id: 'intent', label: 'Goal', path: 'intent', guidedOnly: true },
  { id: 'details', label: 'Details', path: 'details' },
  { id: 'privacy', label: 'Privacy', path: 'privacy', manualOnly: true },
  { id: 'questions', label: 'Questions', path: 'questions' },
  { id: 'timing', label: 'Timing', path: 'timing' },
  { id: 'notifications', label: 'Notifications', path: 'notifications' },
  { id: 'review', label: 'Review', path: 'review' },
];

// Steps for edit mode (no intent)
const EDIT_STEPS: Step[] = [
  { id: 'details', label: 'Details', path: 'details' },
  { id: 'privacy', label: 'Privacy', path: 'privacy' },
  { id: 'questions', label: 'Questions', path: 'questions' },
  { id: 'timing', label: 'Timing', path: 'timing' },
  { id: 'notifications', label: 'Notifications', path: 'notifications' },
  { id: 'review', label: 'Review', path: 'review' },
];

export default function ConversationFormLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { formState, toggleMode, updateFormState, getStepPath } = useConversationForm();
  const { currentOrgId } = useOrganization();
  const slackEnabled = useFeature('slack_integration');
  const showNotificationsStep = slackEnabled && !!currentOrgId;
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Check if we're on the intent step
  const isIntentStep = location.pathname.includes('/intent');

  const handleSaveAsDraft = async () => {
    // Validate minimum required field
    if (!formState.title.trim()) {
      setDraftError('Please enter a title before saving');
      return;
    }

    setSavingDraft(true);
    setDraftError('');
    setDraftSaved(false);

    try {
      // Get user's timezone
      let userTimezone = 'UTC';
      try {
        userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch (err) {
        console.warn('Failed to detect timezone, using UTC:', err);
      }

      // Calculate total minutes (only for limited time)
      const totalMinutes = formState.durationHours * 60 + formState.durationMinutes;

      // Strip the 'id' field from questions as it's only used for React keys
      const questionsForApi = formState.questions
        .filter(q => q.question_text.trim())
        .map(({ id: _id, ...rest }) => rest);

      // Prepare conversation data with current form state
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

      // Ensure at least one question exists
      if (conversationData.questions.length === 0) {
        conversationData.questions = [
          { question_text: 'Question 1', question_type: 'text', question_order: 0, is_required: false }
        ];
      }

      // Create or update conversation
      let conversation;
      if (formState.isEditMode && formState.conversationId) {
        conversation = await api.updateConversation(formState.conversationId, conversationData);
      } else {
        conversation = await api.createConversation(conversationData);
        // Update form state to reflect we're now editing an existing conversation
        updateFormState({
          isEditMode: true,
          conversationId: conversation.id,
        });
        // Update URL to edit mode without navigating away
        const currentStep = location.pathname.split('/').pop();
        navigate(`/edit/conversation/${conversation.id}/${currentStep}`, { replace: true });
      }

      // Show success message
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000);
    } catch (err: any) {
      setDraftError(err.response?.data?.detail || 'Failed to save draft');
    } finally {
      setSavingDraft(false);
    }
  };

  // Get visible steps based on mode (edit mode always uses edit steps, no intent)
  const allSteps = formState.isEditMode ? EDIT_STEPS : STEPS;
  const visibleSteps = allSteps.filter(step => {
    if (step.guidedOnly && !formState.isGuidedMode) return false;
    if (step.manualOnly && formState.isGuidedMode) return false;

    // Hide notifications step when there's nothing to configure (no org or no Slack)
    if (step.id === 'notifications' && !showNotificationsStep) return false;

    // Preset-specific step skipping (only in guided mode, not edit mode)
    // Uses presetSkipSteps which is set for both system presets and user presets
    if (formState.isGuidedMode && !formState.isEditMode) {
      if (formState.presetSkipSteps?.includes(step.id as 'timing' | 'notifications')) {
        return false;
      }
    }

    return true;
  });

  // Find current step index
  const currentStepIndex = visibleSteps.findIndex(step =>
    location.pathname.includes(step.path)
  );

  const handleBack = () => {
    // If editing a template, go back to template page
    if (formState.isEditMode && formState.createTemplate && formState.conversationId) {
      navigate(`/templates/${formState.conversationId}`);
    // If editing a regular conversation, go back to conversation page
    } else if (formState.isEditMode && formState.conversationId) {
      navigate(`/conversations/${formState.conversationId}`);
    // If creating from template, go back to template page
    } else if (formState.parentConversation?.is_template && formState.parentConversationId) {
      navigate(`/templates/${formState.parentConversationId}`);
    } else {
      navigate('/dashboard');
    }
  };

  const getTitle = () => {
    if (formState.isEditMode) {
      return formState.createTemplate ? 'Edit Template' : 'Edit Conversation';
    }
    if (formState.createTemplate) return 'Create Template';
    if (formState.parentConversation?.is_template) return 'Create Conversation from Template';
    if (formState.isFollowUp) return 'Create Follow-up Conversation';
    return 'Create New Conversation';
  };

  // Intent step has its own full-page layout
  if (isIntentStep) {
    return <Outlet />;
  }

  return (
    <div className="new-design-wrapper" style={{
      minHeight: '100vh',
      backgroundColor: 'var(--color-primary-100)',
      padding: spacing[8],
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div
          className="form-layout-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: spacing[8],
          }}
        >
          <h1 style={{
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: 'var(--color-primary-900)',
            margin: 0,
          }}>
            {getTitle()}
          </h1>
          <div className="form-layout-header-buttons" style={{ display: 'flex', gap: spacing[3] }}>
            <button
              onClick={handleSaveAsDraft}
              disabled={savingDraft}
              className="form-layout-save-draft-btn"
              style={{
                padding: `${spacing[3]} ${spacing[6]}`,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: 'var(--color-primary-50)',
                backgroundColor: 'var(--color-primary-900)',
                border: `${borders.width.thin} solid var(--color-primary-900)`,
                borderRadius: borders.radius.md,
                cursor: savingDraft ? 'not-allowed' : 'pointer',
                opacity: savingDraft ? 0.6 : 1,
                transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
              }}
            >
              {savingDraft ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              onClick={handleBack}
              className="form-layout-cancel-btn"
              style={{
                padding: `${spacing[3]} ${spacing[6]}`,
                fontSize: typography.fontSize.sm,
                fontWeight: typography.fontWeight.medium,
                color: 'var(--color-primary-700)',
                backgroundColor: 'var(--color-primary-50)',
                border: `${borders.width.thin} solid var(--color-primary-400)`,
                borderRadius: borders.radius.md,
                cursor: 'pointer',
                transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
              }}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Draft Error Message */}
        {draftError && (
          <div style={{
            backgroundColor: 'var(--color-error-light)',
            border: '1px solid var(--color-error)',
            color: 'var(--color-error)',
            padding: `${spacing[3]} ${spacing[4]}`,
            borderRadius: borders.radius.md,
            marginBottom: spacing[6],
            fontSize: typography.fontSize.sm,
          }}>
            {draftError}
          </div>
        )}

        {/* Toast Notification */}
        {draftSaved && (
          <div style={{
            position: 'fixed',
            top: 'calc(var(--header-height) + 16px)',
            right: spacing[6],
            backgroundColor: 'var(--color-primary-900)',
            color: 'var(--color-primary-50)',
            padding: `${spacing[3]} ${spacing[5]}`,
            borderRadius: borders.radius.md,
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            boxShadow: shadows.md,
            zIndex: 1000,
            animation: 'slideInRight 0.3s ease-out',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Draft saved
          </div>
        )}

        {/* Form Container */}
        <div
          className="form-layout-container"
          style={{
            backgroundColor: formState.createTemplate ? 'transparent' : 'var(--color-primary-50)',
            borderRadius: formState.createTemplate ? 0 : borders.radius.xl,
            border: formState.createTemplate ? 'none' : `${borders.width.thin} solid var(--color-primary-300)`,
            padding: formState.createTemplate ? 0 : spacing[8],
          }}
        >
          {/* Mode Toggle (only shown in create mode, not edit) */}
          {!formState.isEditMode && (
            <SetupModeToggle
              isGuidedMode={formState.isGuidedMode}
              onToggle={toggleMode}
            />
          )}

          {/* Progress Indicator */}
          <div
            className="form-layout-progress"
            style={{
              maxWidth: '600px',
              margin: '0 auto',
              marginBottom: spacing[8],
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
            }}>
              {/* Progress Line */}
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '0',
                right: '0',
                height: '2px',
                backgroundColor: 'var(--color-primary-300)',
                zIndex: 0,
              }}>
                <div style={{
                  height: '100%',
                  backgroundColor: 'var(--color-primary-900)',
                  width: `${(currentStepIndex / (visibleSteps.length - 1)) * 100}%`,
                  transition: `width ${transitions.duration.slow} ${transitions.timing.ease}`,
                }} />
              </div>

              {/* Step Circles */}
              {visibleSteps.map((step, index) => {
                const isActive = index === currentStepIndex;
                const isCompleted = index < currentStepIndex;
                const isClickable = index <= currentStepIndex;

                return (
                  <div
                    key={step.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      zIndex: 1,
                      cursor: isClickable ? 'pointer' : 'default',
                      flex: 1,
                    }}
                    onClick={() => {
                      if (isClickable) {
                        navigate(getStepPath(step.path));
                      }
                    }}
                  >
                    {/* Circle */}
                    <div
                      className="form-layout-step-circle"
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: borders.radius.full,
                        backgroundColor: isCompleted || isActive ? 'var(--color-primary-900)' : 'var(--color-primary-50)',
                        border: `2px solid ${isCompleted || isActive ? 'var(--color-primary-900)' : 'var(--color-primary-400)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: typography.fontWeight.semibold,
                        fontSize: typography.fontSize.sm,
                        color: isCompleted || isActive ? 'var(--color-primary-50)' : 'var(--color-primary-500)',
                        transition: `all ${transitions.duration.slow} ${transitions.timing.ease}`,
                        marginBottom: spacing[2],
                      }}
                    >
                      {isCompleted ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : index + 1}
                    </div>

                    {/* Label */}
                    <div
                      className="form-layout-step-label"
                      style={{
                        fontSize: typography.fontSize.xs,
                        fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.normal,
                        color: isActive ? 'var(--color-primary-900)' : 'var(--color-primary-600)',
                        textAlign: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <Outlet />
          </div>
        </div>
      </div>

      {/* Override styles for child components */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .form-layout-save-draft-btn:hover:not(:disabled) {
          background-color: var(--color-primary-800) !important;
          border-color: var(--color-primary-800) !important;
        }
        .form-layout-cancel-btn:hover {
          background-color: var(--color-primary-100) !important;
          border-color: var(--color-primary-500) !important;
        }

        /* Primary button overrides */
        .new-design-wrapper .btn-primary,
        .new-design-wrapper .btn.btn-primary {
          background-color: var(--color-primary-900) !important;
          border-color: var(--color-primary-900) !important;
          color: var(--color-primary-50) !important;
        }
        .new-design-wrapper .btn-primary:hover,
        .new-design-wrapper .btn.btn-primary:hover {
          background-color: var(--color-primary-800) !important;
          border-color: var(--color-primary-800) !important;
        }
        .new-design-wrapper .btn-primary:disabled,
        .new-design-wrapper .btn.btn-primary:disabled {
          background-color: var(--color-primary-400) !important;
          border-color: var(--color-primary-400) !important;
          cursor: not-allowed;
        }

        /* Secondary button overrides */
        .new-design-wrapper .btn-secondary,
        .new-design-wrapper .btn.btn-secondary {
          background-color: var(--color-primary-50) !important;
          border: 1px solid var(--color-primary-400) !important;
          color: var(--color-primary-700) !important;
        }
        .new-design-wrapper .btn-secondary:hover,
        .new-design-wrapper .btn.btn-secondary:hover {
          background-color: var(--color-primary-100) !important;
          border-color: var(--color-primary-500) !important;
        }

        /* Form elements */
        .new-design-wrapper input[type="text"],
        .new-design-wrapper input[type="email"],
        .new-design-wrapper input[type="url"],
        .new-design-wrapper input[type="number"],
        .new-design-wrapper textarea,
        .new-design-wrapper select {
          border: 1px solid var(--color-primary-400) !important;
          border-radius: ${borders.radius.md} !important;
        }
        .new-design-wrapper input:focus,
        .new-design-wrapper textarea:focus,
        .new-design-wrapper select:focus {
          border-color: var(--color-primary-600) !important;
          outline: none !important;
          box-shadow: 0 0 0 2px var(--color-primary-200) !important;
        }

        /* Form section styling */
        .new-design-wrapper .form-section {
          background-color: var(--color-primary-50);
          border-radius: ${borders.radius.lg};
          padding: ${spacing[6]};
          border: 1px solid var(--color-primary-200);
        }

        /* Labels */
        .new-design-wrapper label {
          color: var(--color-primary-900) !important;
          font-weight: ${typography.fontWeight.medium} !important;
        }

        /* Help text */
        .new-design-wrapper .form-help-text {
          color: var(--color-primary-600) !important;
        }

        /* Error message */
        .new-design-wrapper .error-message {
          background-color: var(--color-error-light) !important;
          border: 1px solid var(--color-error) !important;
          color: var(--color-error) !important;
          border-radius: ${borders.radius.md} !important;
        }

        /* Section titles */
        .new-design-wrapper h2 {
          color: var(--color-primary-900) !important;
        }

        /* Borders */
        .new-design-wrapper .form-actions {
          border-top-color: var(--color-primary-200) !important;
        }

        /* Mobile responsive styles */
        @media (max-width: 768px) {
          .new-design-wrapper {
            padding: ${spacing[4]} !important;
          }
          .form-layout-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: ${spacing[4]} !important;
          }
          .form-layout-header h1 {
            font-size: ${typography.fontSize['2xl']} !important;
          }
          .form-layout-header-buttons {
            width: 100%;
            flex-direction: row !important;
          }
          .form-layout-header-buttons button {
            flex: 1;
            padding: ${spacing[2]} ${spacing[3]} !important;
            font-size: ${typography.fontSize.xs} !important;
          }
          .form-layout-container {
            padding: ${spacing[3]} !important;
            border: none !important;
            border-radius: 0 !important;
            background-color: transparent !important;
          }
          .form-layout-progress {
            margin-bottom: ${spacing[6]} !important;
          }
          .form-layout-step-label {
            display: none !important;
          }
          .form-layout-step-circle {
            width: 28px !important;
            height: 28px !important;
            font-size: ${typography.fontSize.xs} !important;
          }
          .new-design-wrapper .form-actions {
            flex-direction: column !important;
            gap: ${spacing[3]} !important;
          }
          .new-design-wrapper .form-actions button,
          .new-design-wrapper .form-actions a {
            width: 100% !important;
            justify-content: center !important;
            text-align: center !important;
          }
        }
      `}</style>
    </div>
  );
}

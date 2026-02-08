import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useConversationForm } from '../contexts/ConversationFormContext';
import SetupModeToggle from './SetupModeToggle';
import DesignToggle from './DesignToggle';
import { colors, typography, spacing, borders, transitions } from '../styles/tokens';

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
  { id: 'review', label: 'Review', path: 'review' },
];

// Steps for edit mode (no intent)
const EDIT_STEPS: Step[] = [
  { id: 'details', label: 'Details', path: 'details' },
  { id: 'privacy', label: 'Privacy', path: 'privacy' },
  { id: 'questions', label: 'Questions', path: 'questions' },
  { id: 'timing', label: 'Timing', path: 'timing' },
  { id: 'review', label: 'Review', path: 'review' },
];

function ConversationFormLayoutOld() {
  const navigate = useNavigate();
  const location = useLocation();
  const { formState, toggleMode } = useConversationForm();

  // Get visible steps based on mode (edit mode always uses edit steps, no intent)
  const allSteps = formState.isEditMode ? EDIT_STEPS : STEPS;
  const visibleSteps = allSteps.filter(step => {
    if (step.guidedOnly && !formState.isGuidedMode) return false;
    if (step.manualOnly && formState.isGuidedMode) return false;
    return true;
  });

  // Find current step index
  const currentStepIndex = visibleSteps.findIndex(step =>
    location.pathname.includes(step.path)
  );

  const handleBack = () => {
    navigate('/dashboard');
  };

  return (
    <div className="create-conversation-page">
      {/* Header */}
      <div className="page-header">
        <h1>
          {formState.isEditMode
            ? (formState.createTemplate ? 'Edit Template' : 'Edit Conversation')
            : formState.createTemplate
              ? 'Create Template'
              : formState.parentConversation?.is_template
                ? 'Create Conversation from Template'
                : formState.isFollowUp
                  ? 'Create Follow-up Conversation'
                  : 'Create New Conversation'}
        </h1>
        <button onClick={handleBack} className="btn btn-secondary">
          Cancel
        </button>
      </div>

      {/* Mode Toggle (only shown in create mode, not edit) */}
      {!formState.isEditMode && (
        <SetupModeToggle
          isGuidedMode={formState.isGuidedMode}
          onToggle={toggleMode}
        />
      )}

      {/* Progress Indicator */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto 2rem auto',
        padding: '0 1rem',
      }}>
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
            backgroundColor: '#e2e8f0',
            zIndex: 0,
          }}>
            <div style={{
              height: '100%',
              backgroundColor: '#4299e1',
              width: `${(currentStepIndex / (visibleSteps.length - 1)) * 100}%`,
              transition: 'width 0.3s ease',
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
                    navigate(`/create/conversation/${step.path}`);
                  }
                }}
              >
                {/* Circle */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: isCompleted || isActive ? '#4299e1' : 'white',
                  border: `2px solid ${isCompleted || isActive ? '#4299e1' : '#cbd5e0'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: isCompleted || isActive ? 'white' : '#a0aec0',
                  transition: 'all 0.3s ease',
                  marginBottom: '0.5rem',
                }}>
                  {isCompleted ? '✓' : index + 1}
                </div>

                {/* Label */}
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#2d3748' : '#718096',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}>
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '0 1rem',
      }}>
        <Outlet />
      </div>
    </div>
  );
}

function ConversationFormLayoutNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { formState, toggleMode } = useConversationForm();

  // Get visible steps based on mode (edit mode always uses edit steps, no intent)
  const allSteps = formState.isEditMode ? EDIT_STEPS : STEPS;
  const visibleSteps = allSteps.filter(step => {
    if (step.guidedOnly && !formState.isGuidedMode) return false;
    if (step.manualOnly && formState.isGuidedMode) return false;
    return true;
  });

  // Find current step index
  const currentStepIndex = visibleSteps.findIndex(step =>
    location.pathname.includes(step.path)
  );

  const handleBack = () => {
    navigate('/dashboard');
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

  return (
    <div className="new-design-wrapper" style={{
      minHeight: '100vh',
      backgroundColor: colors.primary[100],
      padding: spacing[8],
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing[8],
        }}>
          <h1 style={{
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.primary[900],
            margin: 0,
          }}>
            {getTitle()}
          </h1>
          <button
            onClick={handleBack}
            className="form-layout-cancel-btn"
            style={{
              padding: `${spacing[3]} ${spacing[6]}`,
              fontSize: typography.fontSize.sm,
              fontWeight: typography.fontWeight.medium,
              color: colors.primary[700],
              backgroundColor: colors.primary[50],
              border: `${borders.width.thin} solid ${colors.primary[400]}`,
              borderRadius: borders.radius.md,
              cursor: 'pointer',
              transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
            }}
          >
            Cancel
          </button>
        </div>

        {/* Form Container */}
        <div style={{
          backgroundColor: colors.primary[50],
          borderRadius: borders.radius.xl,
          border: `${borders.width.thin} solid ${colors.primary[300]}`,
          padding: spacing[8],
        }}>
          {/* Mode Toggle (only shown in create mode, not edit) */}
          {!formState.isEditMode && (
            <SetupModeToggle
              isGuidedMode={formState.isGuidedMode}
              onToggle={toggleMode}
            />
          )}

          {/* Progress Indicator */}
          <div style={{
            maxWidth: '700px',
            margin: '0 auto',
            marginBottom: spacing[8],
          }}>
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
                backgroundColor: colors.primary[300],
                zIndex: 0,
              }}>
                <div style={{
                  height: '100%',
                  backgroundColor: colors.primary[900],
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
                        navigate(`/create/conversation/${step.path}`);
                      }
                    }}
                  >
                    {/* Circle */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: borders.radius.full,
                      backgroundColor: isCompleted || isActive ? colors.primary[900] : colors.primary[50],
                      border: `2px solid ${isCompleted || isActive ? colors.primary[900] : colors.primary[400]}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: typography.fontWeight.semibold,
                      fontSize: typography.fontSize.sm,
                      color: isCompleted || isActive ? colors.primary[50] : colors.primary[500],
                      transition: `all ${transitions.duration.slow} ${transitions.timing.ease}`,
                      marginBottom: spacing[2],
                    }}>
                      {isCompleted ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : index + 1}
                    </div>

                    {/* Label */}
                    <div style={{
                      fontSize: typography.fontSize.xs,
                      fontWeight: isActive ? typography.fontWeight.semibold : typography.fontWeight.normal,
                      color: isActive ? colors.primary[900] : colors.primary[600],
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}>
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <Outlet />
          </div>
        </div>
      </div>

      {/* Override styles for child components */}
      <style>{`
        .form-layout-cancel-btn:hover {
          background-color: ${colors.primary[100]} !important;
          border-color: ${colors.primary[500]} !important;
        }

        /* Primary button overrides */
        .new-design-wrapper .btn-primary,
        .new-design-wrapper .btn.btn-primary {
          background-color: ${colors.primary[900]} !important;
          border-color: ${colors.primary[900]} !important;
          color: ${colors.primary[50]} !important;
        }
        .new-design-wrapper .btn-primary:hover,
        .new-design-wrapper .btn.btn-primary:hover {
          background-color: ${colors.primary[800]} !important;
          border-color: ${colors.primary[800]} !important;
        }
        .new-design-wrapper .btn-primary:disabled,
        .new-design-wrapper .btn.btn-primary:disabled {
          background-color: ${colors.primary[400]} !important;
          border-color: ${colors.primary[400]} !important;
          cursor: not-allowed;
        }

        /* Secondary button overrides */
        .new-design-wrapper .btn-secondary,
        .new-design-wrapper .btn.btn-secondary {
          background-color: ${colors.primary[50]} !important;
          border: 1px solid ${colors.primary[400]} !important;
          color: ${colors.primary[700]} !important;
        }
        .new-design-wrapper .btn-secondary:hover,
        .new-design-wrapper .btn.btn-secondary:hover {
          background-color: ${colors.primary[100]} !important;
          border-color: ${colors.primary[500]} !important;
        }

        /* Form elements */
        .new-design-wrapper input[type="text"],
        .new-design-wrapper input[type="email"],
        .new-design-wrapper input[type="url"],
        .new-design-wrapper input[type="number"],
        .new-design-wrapper textarea,
        .new-design-wrapper select {
          border: 1px solid ${colors.primary[400]} !important;
          border-radius: ${borders.radius.md} !important;
        }
        .new-design-wrapper input:focus,
        .new-design-wrapper textarea:focus,
        .new-design-wrapper select:focus {
          border-color: ${colors.primary[600]} !important;
          outline: none !important;
          box-shadow: 0 0 0 2px ${colors.primary[200]} !important;
        }

        /* Form section styling */
        .new-design-wrapper .form-section {
          background-color: ${colors.primary[50]};
          border-radius: ${borders.radius.lg};
          padding: ${spacing[6]};
          border: 1px solid ${colors.primary[200]};
        }

        /* Labels */
        .new-design-wrapper label {
          color: ${colors.primary[900]} !important;
          font-weight: ${typography.fontWeight.medium} !important;
        }

        /* Help text */
        .new-design-wrapper .form-help-text {
          color: ${colors.primary[600]} !important;
        }

        /* Error message */
        .new-design-wrapper .error-message {
          background-color: ${colors.semantic.error.light} !important;
          border: 1px solid ${colors.semantic.error.main} !important;
          color: ${colors.semantic.error.text} !important;
          border-radius: ${borders.radius.md} !important;
        }

        /* Section titles */
        .new-design-wrapper h2 {
          color: ${colors.primary[900]} !important;
        }

        /* Borders */
        .new-design-wrapper .form-actions {
          border-top-color: ${colors.primary[200]} !important;
        }
      `}</style>
    </div>
  );
}

// Wrapper with design toggle
export default function ConversationFormLayout() {
  const [isNewDesign, setIsNewDesign] = useState(true);

  return (
    <>
      <DesignToggle
        isNewDesign={isNewDesign}
        onToggle={() => setIsNewDesign(!isNewDesign)}
      />
      {isNewDesign ? <ConversationFormLayoutNew /> : <ConversationFormLayoutOld />}
    </>
  );
}

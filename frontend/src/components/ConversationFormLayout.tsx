import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useConversationForm } from '../contexts/ConversationFormContext';
import SetupModeToggle from './SetupModeToggle';

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

export default function ConversationFormLayout() {
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

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useConversationForm } from '../../contexts/ConversationFormContext';
import IntentSelection from '../../components/IntentSelection';

interface LocationState {
  createTemplate?: boolean;
}

export default function IntentStep() {
  const navigate = useNavigate();
  const location = useLocation();
  const { formState, applyIntentPreset, applyUserPreset, updateFormState } = useConversationForm();

  // Read location state on mount and update form state
  useEffect(() => {
    const state = location.state as LocationState | null;
    if (state?.createTemplate && !formState.createTemplate) {
      updateFormState({ createTemplate: true });
    }
  }, [location.state, formState.createTemplate, updateFormState]);

  const handleContinue = () => {
    if (formState.selectedIntent === 'custom') {
      // Custom setup switches to manual mode and skips to details
      updateFormState({ isGuidedMode: false });
    }
    // Both system presets and user presets continue to details
    navigate('/create/conversation/details');
  };

  const handleSwitchToManual = () => {
    updateFormState({ isGuidedMode: false });
    navigate('/create/conversation/details');
  };

  return (
    <IntentSelection
      selectedIntent={formState.selectedIntent}
      selectedUserPresetId={formState.selectedUserPresetId}
      onSelectIntent={applyIntentPreset}
      onSelectUserPreset={applyUserPreset}
      onContinue={handleContinue}
      onSwitchToManual={handleSwitchToManual}
    />
  );
}

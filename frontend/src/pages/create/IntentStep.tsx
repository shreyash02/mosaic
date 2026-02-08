import { useNavigate } from 'react-router-dom';
import { useConversationForm } from '../../contexts/ConversationFormContext';
import IntentSelection from '../../components/IntentSelection';

export default function IntentStep() {
  const navigate = useNavigate();
  const { formState, applyIntentPreset, updateFormState } = useConversationForm();

  const handleContinue = () => {
    if (formState.selectedIntent === 'custom') {
      // Custom setup switches to manual mode and skips to details
      updateFormState({ isGuidedMode: false });
      navigate('/create/conversation/details');
    } else {
      // Guided mode continues to details
      navigate('/create/conversation/details');
    }
  };

  const handleSwitchToManual = () => {
    updateFormState({ isGuidedMode: false });
    navigate('/create/conversation/details');
  };

  return (
    <IntentSelection
      selectedIntent={formState.selectedIntent}
      onSelectIntent={applyIntentPreset}
      onContinue={handleContinue}
      onSwitchToManual={handleSwitchToManual}
    />
  );
}

import IntentSelectionCard from './IntentSelectionCard';
import { INTENT_PRESETS, IntentType } from '../types/intentPresets';

interface IntentSelectionProps {
  selectedIntent: IntentType | null;
  onSelectIntent: (intent: IntentType) => void;
  onContinue: () => void;
  onSwitchToManual: () => void;
}

export default function IntentSelection({
  selectedIntent,
  onSelectIntent,
  onContinue,
  onSwitchToManual,
}: IntentSelectionProps) {
  const intents: IntentType[] = [
    'personal_feedback',
    'team_collaboration',
    'anonymous_survey',
    'public_poll',
    'custom',
  ];

  return (
    <div className="intent-selection" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem', color: '#2d3748' }}>
          What's your goal?
        </h2>
        <p style={{ fontSize: '1rem', color: '#718096' }}>
          Choose the option that best describes what you want to accomplish
        </p>
      </div>

      {/* Intent Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        {intents.map((intentId) => {
          const intent = INTENT_PRESETS[intentId];
          return (
            <IntentSelectionCard
              key={intentId}
              intent={intent}
              selected={selectedIntent === intentId}
              onSelect={() => onSelectIntent(intentId)}
            />
          );
        })}
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1rem',
        paddingTop: '1rem',
        borderTop: '1px solid #e2e8f0',
      }}>
        <button
          type="button"
          onClick={onSwitchToManual}
          className="btn btn-secondary"
          style={{ fontSize: '0.875rem' }}
        >
          Switch to Manual Setup
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!selectedIntent}
          className="btn btn-primary btn-large"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

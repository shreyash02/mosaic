import IntentSelectionCard from './IntentSelectionCard';
import { INTENT_PRESETS, IntentType } from '../types/intentPresets';
import { colors, typography, spacing, borders, shadows, transitions } from '../styles/tokens';

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
      <div style={{ marginBottom: spacing[8], textAlign: 'center' }}>
        <h2 style={{
          fontSize: typography.fontSize['2xl'],
          fontWeight: typography.fontWeight.bold,
          marginBottom: spacing[2],
          color: colors.primary[900],
        }}>
          What's your goal?
        </h2>
        <p style={{
          fontSize: typography.fontSize.base,
          color: colors.primary[600],
        }}>
          Choose the option that best describes what you want to accomplish
        </p>
      </div>

      {/* Intent Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: spacing[6],
        marginBottom: spacing[8],
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
        gap: spacing[4],
        paddingTop: spacing[4],
        borderTop: `${borders.width.thin} solid ${colors.primary[300]}`,
      }}>
        <button
          type="button"
          onClick={onSwitchToManual}
          className="intent-btn-secondary"
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
          Switch to Manual Setup
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!selectedIntent}
          className="intent-btn-primary"
          style={{
            padding: `${spacing[3]} ${spacing[8]}`,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.medium,
            color: colors.primary[50],
            backgroundColor: selectedIntent ? colors.primary[900] : colors.primary[400],
            border: 'none',
            borderRadius: borders.radius.md,
            cursor: selectedIntent ? 'pointer' : 'not-allowed',
            transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
          }}
        >
          Continue
        </button>
      </div>

      {/* Hover styles */}
      <style>{`
        .intent-btn-secondary:hover {
          background-color: ${colors.primary[100]} !important;
          border-color: ${colors.primary[500]} !important;
        }
        .intent-btn-primary:not(:disabled):hover {
          background-color: ${colors.primary[800]} !important;
          box-shadow: ${shadows.sm} !important;
        }
      `}</style>
    </div>
  );
}

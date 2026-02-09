import { Link } from 'react-router-dom';
import IntentSelectionCard from './IntentSelectionCard';
import { INTENT_PRESETS, IntentType } from '../types/intentPresets';
import { GearIcon } from './icons';
import { typography, spacing, transitions } from '../styles/tokens';

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
  // Only show the 4 main intents (not custom)
  const intents: IntentType[] = [
    'personal_feedback',
    'team_collaboration',
    'anonymous_survey',
    'public_poll',
  ];

  const handleCardSelect = (intentId: IntentType) => {
    onSelectIntent(intentId);
    // Auto-continue when selecting a card
    setTimeout(() => {
      onContinue();
    }, 150);
  };

  return (
    <div
      className="intent-selection-page"
      style={{
        minHeight: 'calc(100vh - var(--header-height))',
        backgroundColor: 'var(--color-primary-100)',
        padding: `${spacing[6]} ${spacing[8]}`,
      }}
    >
      {/* Back to dashboard link */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        marginBottom: spacing[8],
      }}>
        <Link
          to="/dashboard"
          className="back-to-dashboard-link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing[2],
            color: 'var(--color-primary-900)',
            textDecoration: 'none',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.medium,
            transition: `color ${transitions.duration.normal} ${transitions.timing.ease}`,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to dashboard
        </Link>
      </div>

      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: spacing[10],
      }}>
        <h1 style={{
          fontSize: typography.fontSize['2xl'],
          fontWeight: typography.fontWeight.bold,
          color: 'var(--color-primary-900)',
          margin: 0,
          marginBottom: spacing[2],
        }}>
          What type of conversation do you want to create?
        </h1>
        <p style={{
          fontSize: typography.fontSize.base,
          color: 'var(--color-primary-600)',
          margin: 0,
        }}>
          We'll configure the privacy settings based on your choice
        </p>
      </div>

      {/* Intent Cards Grid - 2x2 */}
      <div
        className="intent-selection-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: spacing[6],
          maxWidth: '900px',
          margin: '0 auto',
          marginBottom: spacing[10],
        }}
      >
        {intents.map((intentId) => {
          const intent = INTENT_PRESETS[intentId];
          return (
            <IntentSelectionCard
              key={intentId}
              intent={intent}
              selected={selectedIntent === intentId}
              onSelect={() => handleCardSelect(intentId)}
            />
          );
        })}
      </div>

      {/* Manual configuration link */}
      <div style={{
        textAlign: 'center',
      }}>
        <button
          type="button"
          onClick={onSwitchToManual}
          className="manual-config-link"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing[2],
            color: 'var(--color-primary-600)',
            backgroundColor: 'transparent',
            border: 'none',
            fontSize: typography.fontSize.sm,
            fontWeight: typography.fontWeight.normal,
            cursor: 'pointer',
            padding: spacing[2],
            transition: `color ${transitions.duration.normal} ${transitions.timing.ease}`,
          }}
        >
          <GearIcon size={16} />
          I want to configure everything manually
        </button>
      </div>

      {/* Hover styles */}
      <style>{`
        .back-to-dashboard-link:hover {
          color: var(--color-primary-700) !important;
        }
        .manual-config-link:hover {
          color: var(--color-primary-900) !important;
        }

        /* Responsive: stack cards on smaller screens */
        @media (max-width: 768px) {
          .intent-selection-page {
            padding: ${spacing[4]} ${spacing[4]} !important;
          }
          .intent-selection-grid {
            grid-template-columns: 1fr !important;
            gap: ${spacing[4]} !important;
          }
        }
      `}</style>
    </div>
  );
}

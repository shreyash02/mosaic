import { IntentPreset, IntentType } from '../types/intentPresets';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { InboxIcon, UsersIcon, LockIcon, GlobeIcon, LightningIcon } from './icons';

interface IntentSelectionCardProps {
  intent: IntentPreset;
  selected: boolean;
  onSelect: () => void;
}

// Map intent IDs to their corresponding SVG icons
const intentIcons: Record<IntentType, React.ComponentType<{ size?: number; className?: string }>> = {
  personal_feedback: InboxIcon,
  team_collaboration: UsersIcon,
  anonymous_survey: LockIcon,
  public_poll: GlobeIcon,
  quick_poll: LightningIcon,
  custom: InboxIcon, // Not used in this component
};

export default function IntentSelectionCard({ intent, selected, onSelect }: IntentSelectionCardProps) {
  const IconComponent = intentIcons[intent.id];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="intent-card-new"
      style={{
        border: selected
          ? `${borders.width.medium} solid var(--color-primary-900)`
          : `${borders.width.thin} solid var(--color-primary-300)`,
        borderRadius: borders.radius.lg,
        padding: spacing[6],
        backgroundColor: 'var(--color-primary-50)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
        display: 'flex',
        flexDirection: 'row',
        gap: spacing[4],
        width: '100%',
        position: 'relative',
      }}
    >
      {/* Icon */}
      <div style={{
        width: '48px',
        height: '48px',
        minWidth: '48px',
        backgroundColor: 'var(--color-primary-100)',
        borderRadius: borders.radius.lg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-primary-700)',
      }}>
        <IconComponent size={24} />
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        {/* Label and Description */}
        <div style={{ marginBottom: spacing[3] }}>
          <h3 style={{
            margin: 0,
            fontSize: typography.fontSize.base,
            fontWeight: typography.fontWeight.semibold,
            color: 'var(--color-primary-900)',
            marginBottom: spacing[1],
          }}>
            {intent.label}
          </h3>
          <p style={{
            margin: 0,
            fontSize: typography.fontSize.sm,
            color: 'var(--color-primary-600)',
          }}>
            {intent.description}
          </p>
        </div>

        {/* Explanation bullets */}
        <ul style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          fontSize: typography.fontSize.xs,
          color: 'var(--color-primary-500)',
        }}>
          {intent.explanation.map((item, index) => (
            <li key={index} style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              marginBottom: index < intent.explanation.length - 1 ? spacing[1] : 0,
            }}>
              <span style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary-400)',
                flexShrink: 0,
              }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CSS for hover state */}
      <style>{`
        .intent-card-new:hover {
          border-color: var(--color-primary-400) !important;
          box-shadow: ${shadows.sm} !important;
        }
        @media (max-width: 768px) {
          .intent-card-new {
            padding: ${spacing[4]} !important;
          }
        }
      `}</style>
    </button>
  );
}

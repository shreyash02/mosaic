import { IntentPreset, IntentType } from '../types/intentPresets';
import { colors, typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { InboxIcon, UsersIcon, LockIcon, GlobeIcon, GearIcon } from './icons';

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
  custom: GearIcon,
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
          ? `${borders.width.medium} solid ${colors.primary[900]}`
          : `${borders.width.thin} solid ${colors.primary[300]}`,
        borderRadius: borders.radius.lg,
        padding: spacing[6],
        backgroundColor: selected ? colors.primary[100] : colors.primary[50],
        cursor: 'pointer',
        textAlign: 'left',
        transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[3],
        width: '100%',
        position: 'relative',
      }}
    >
      {/* Icon */}
      <div style={{
        width: '48px',
        height: '48px',
        backgroundColor: selected ? colors.primary[200] : colors.primary[100],
        borderRadius: borders.radius.lg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.primary[700],
        transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
      }}>
        <IconComponent size={24} />
      </div>

      {/* Label and Description */}
      <div>
        <h3 style={{
          margin: 0,
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.semibold,
          color: colors.primary[900],
          marginBottom: spacing[1],
        }}>
          {intent.label}
        </h3>
        <p style={{
          margin: 0,
          fontSize: typography.fontSize.sm,
          color: colors.primary[600],
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
        color: colors.primary[600],
      }}>
        {intent.explanation.map((item, index) => (
          <li key={index} style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            marginBottom: index < intent.explanation.length - 1 ? spacing[1] : 0,
          }}>
            <span style={{
              color: colors.semantic.success.main,
              fontSize: typography.fontSize.xs,
              flexShrink: 0,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {/* Selected indicator */}
      {selected && (
        <div style={{
          position: 'absolute',
          top: spacing[4],
          right: spacing[4],
          width: '24px',
          height: '24px',
          borderRadius: borders.radius.full,
          backgroundColor: colors.primary[900],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.primary[50],
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* CSS for hover state */}
      <style>{`
        .intent-card-new:hover {
          border-color: ${colors.primary[400]} !important;
          box-shadow: ${shadows.sm} !important;
        }
        .intent-card-new:hover[style*="primary-900"] {
          border-color: ${colors.primary[900]} !important;
        }
      `}</style>
    </button>
  );
}

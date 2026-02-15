import { ConversationPreset, AnonymityLevel, ResultsAccess, PresetIcon } from '../types';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import {
  CheckListIcon,
  LightningIcon,
  ChartIcon,
  ChatBubbleIcon,
  TargetIcon,
  UsersIcon,
  LockIcon,
  GlobeIcon,
  InboxIcon,
} from './icons';

// Map icon names to components
const ICON_MAP: Record<PresetIcon, React.ComponentType<{ size?: number }>> = {
  clipboard: CheckListIcon,
  lightning: LightningIcon,
  chart: ChartIcon,
  chat: ChatBubbleIcon,
  target: TargetIcon,
  users: UsersIcon,
  lock: LockIcon,
  globe: GlobeIcon,
  inbox: InboxIcon,
};

interface UserPresetCardProps {
  preset: ConversationPreset;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}

// Helper to generate explanation text for preset settings
function getExplanation(preset: ConversationPreset): string[] {
  const explanations: string[] = [];

  // Anonymity level
  switch (preset.anonymity_level) {
    case AnonymityLevel.FULLY_ANONYMOUS:
      explanations.push('Fully anonymous');
      break;
    case AnonymityLevel.PLATFORM_TRACKED:
      explanations.push('Platform-tracked');
      break;
    case AnonymityLevel.REVEALABLE:
      explanations.push('Revealable identity');
      break;
    default:
      explanations.push('Open');
  }

  // Results access
  switch (preset.results_access) {
    case ResultsAccess.CREATOR_ONLY:
      explanations.push('Results visible to: creator only');
      break;
    case ResultsAccess.PARTICIPANTS:
      explanations.push('Results visible to: participants');
      break;
    case ResultsAccess.PUBLIC_LINK:
      explanations.push('Results visible to: anyone with link');
      break;
  }

  // Invite only
  explanations.push(preset.invite_only ? 'Invite-only' : 'Open to anyone');

  return explanations;
}

export default function UserPresetCard({ preset, selected, onSelect, onEdit }: UserPresetCardProps) {
  const explanation = getExplanation(preset);
  const IconComponent = ICON_MAP[preset.icon] || InboxIcon;

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className="user-preset-card"
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
      {/* Edit button */}
      <button
        type="button"
        onClick={handleEditClick}
        className="preset-edit-btn"
        style={{
          position: 'absolute',
          top: spacing[2],
          right: spacing[2],
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: borders.radius.md,
          color: 'var(--color-primary-400)',
          cursor: 'pointer',
          opacity: 0,
          transition: 'opacity 150ms, color 150ms, background-color 150ms',
        }}
        title="Edit preset"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>

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
            {preset.name}
          </h3>
          {preset.description && (
            <p style={{
              margin: 0,
              fontSize: typography.fontSize.sm,
              color: 'var(--color-primary-600)',
            }}>
              {preset.description}
            </p>
          )}
        </div>

        {/* Explanation bullets */}
        <ul style={{
          margin: 0,
          padding: 0,
          listStyle: 'none',
          fontSize: typography.fontSize.xs,
          color: 'var(--color-primary-500)',
        }}>
          {explanation.map((item, index) => (
            <li key={index} style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
              marginBottom: index < explanation.length - 1 ? spacing[1] : 0,
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
        .user-preset-card:hover {
          border-color: var(--color-primary-400) !important;
          box-shadow: ${shadows.sm} !important;
        }
        .user-preset-card:hover .preset-edit-btn {
          opacity: 1 !important;
        }
        .preset-edit-btn:hover {
          color: var(--color-primary-700) !important;
          background-color: var(--color-primary-100) !important;
        }
        @media (max-width: 768px) {
          .user-preset-card {
            padding: ${spacing[4]} !important;
          }
        }
      `}</style>
    </button>
  );
}

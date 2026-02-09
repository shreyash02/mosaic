import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { TargetIcon, GearIcon } from './icons';

interface SetupModeToggleProps {
  isGuidedMode: boolean;
  onToggle: () => void;
}

// Use CSS custom properties for dark mode support
export default function SetupModeToggle({ isGuidedMode, onToggle }: SetupModeToggleProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      marginBottom: spacing[8],
      padding: spacing[4],
      backgroundColor: 'var(--color-primary-100)',
      borderRadius: borders.radius.lg,
      border: `${borders.width.thin} solid var(--color-primary-300)`,
    }}>
      <div style={{
        display: 'inline-flex',
        backgroundColor: 'var(--color-primary-50)',
        borderRadius: borders.radius.md,
        padding: spacing[1],
        boxShadow: shadows.sm,
      }}>
        <button
          type="button"
          onClick={() => !isGuidedMode && onToggle()}
          style={{
            padding: `${spacing[2]} ${spacing[6]}`,
            border: 'none',
            borderRadius: borders.radius.sm,
            backgroundColor: isGuidedMode ? 'var(--color-primary-900)' : 'transparent',
            color: isGuidedMode ? 'var(--color-primary-50)' : 'var(--color-primary-600)',
            fontWeight: isGuidedMode ? typography.fontWeight.semibold : typography.fontWeight.normal,
            cursor: isGuidedMode ? 'default' : 'pointer',
            transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
            fontSize: typography.fontSize.sm,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
          }}
        >
          <TargetIcon size={16} />
          Guided Setup
        </button>
        <button
          type="button"
          onClick={() => isGuidedMode && onToggle()}
          style={{
            padding: `${spacing[2]} ${spacing[6]}`,
            border: 'none',
            borderRadius: borders.radius.sm,
            backgroundColor: !isGuidedMode ? 'var(--color-primary-900)' : 'transparent',
            color: !isGuidedMode ? 'var(--color-primary-50)' : 'var(--color-primary-600)',
            fontWeight: !isGuidedMode ? typography.fontWeight.semibold : typography.fontWeight.normal,
            cursor: !isGuidedMode ? 'default' : 'pointer',
            transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
            fontSize: typography.fontSize.sm,
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
          }}
        >
          <GearIcon size={16} />
          Manual Setup
        </button>
      </div>
    </div>
  );
}

import { colors, typography, spacing, borders, shadows } from '../styles';

interface DesignToggleProps {
  isNewDesign: boolean;
  onToggle: () => void;
}

const styles = {
  container: {
    position: 'fixed' as const,
    top: '12px',
    right: '12px',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.primary[50],
    padding: `${spacing[2]} ${spacing[4]}`,
    borderRadius: borders.radius.full,
    boxShadow: shadows.lg,
    border: `1px solid ${colors.primary[300]}`,
  },
  label: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[600],
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide,
  },
  toggle: {
    position: 'relative' as const,
    width: '56px',
    height: '28px',
    backgroundColor: colors.primary[300],
    borderRadius: borders.radius.full,
    cursor: 'pointer',
    transition: 'background-color 200ms',
    border: 'none',
    padding: 0,
  },
  toggleActive: {
    backgroundColor: colors.primary[900],
  },
  toggleKnob: {
    position: 'absolute' as const,
    top: '2px',
    left: '2px',
    width: '24px',
    height: '24px',
    backgroundColor: colors.primary[50],
    borderRadius: borders.radius.full,
    transition: 'transform 200ms',
    boxShadow: shadows.sm,
  },
  toggleKnobActive: {
    transform: 'translateX(28px)',
  },
  optionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[500],
    minWidth: '32px',
    textAlign: 'center' as const,
  },
  optionLabelActive: {
    color: colors.primary[900],
    fontWeight: typography.fontWeight.semibold,
  },
};

export default function DesignToggle({ isNewDesign, onToggle }: DesignToggleProps) {
  return (
    <div style={styles.container}>
      <span style={styles.label}>Design:</span>
      <span
        style={{
          ...styles.optionLabel,
          ...(!isNewDesign ? styles.optionLabelActive : {}),
        }}
      >
        Old
      </span>
      <button
        onClick={onToggle}
        style={{
          ...styles.toggle,
          ...(isNewDesign ? styles.toggleActive : {}),
        }}
        aria-label={`Switch to ${isNewDesign ? 'old' : 'new'} design`}
      >
        <div
          style={{
            ...styles.toggleKnob,
            ...(isNewDesign ? styles.toggleKnobActive : {}),
          }}
        />
      </button>
      <span
        style={{
          ...styles.optionLabel,
          ...(isNewDesign ? styles.optionLabelActive : {}),
        }}
      >
        New
      </span>
    </div>
  );
}

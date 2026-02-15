import { typography, spacing, borders, transitions } from '../styles';

interface RatingButtonsProps {
  min: number;
  max: number;
  step: number;
  value: number | null;
  onChange: (value: number) => void;
  showLabels?: boolean;
  minLabel?: string;
  maxLabel?: string;
}

const styles = {
  container: {
    marginTop: spacing[3],
  },
  buttonsWrapper: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: spacing[2],
    justifyContent: 'center',
  },
  button: {
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    cursor: 'pointer',
    transition: transitions.duration.fast,
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none' as const,
  },
  buttonSelected: {
    backgroundColor: 'var(--color-primary-900)',
    borderColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
  },
  labels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: spacing[2],
    paddingLeft: spacing[1],
    paddingRight: spacing[1],
  },
  label: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  selectedValue: {
    textAlign: 'center' as const,
    marginTop: spacing[3],
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
};

export default function RatingButtons({
  min,
  max,
  step,
  value,
  onChange,
  showLabels = true,
  minLabel,
  maxLabel,
}: RatingButtonsProps) {
  // Generate array of values from min to max with step
  const values: number[] = [];
  for (let i = min; i <= max; i += step) {
    values.push(i);
  }

  // For many buttons (more than 11), use a more compact layout
  const isCompact = values.length > 11;
  const buttonSize = isCompact ? '36px' : '44px';
  const fontSize = isCompact ? typography.fontSize.base : typography.fontSize.lg;

  return (
    <div style={styles.container}>
      <div style={styles.buttonsWrapper}>
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            style={{
              ...styles.button,
              width: buttonSize,
              height: buttonSize,
              fontSize,
              ...(v === value ? styles.buttonSelected : {}),
            }}
            aria-label={`Rate ${v}`}
            aria-pressed={v === value}
          >
            {v}
          </button>
        ))}
      </div>

      {showLabels && (minLabel || maxLabel) && (
        <div style={styles.labels}>
          <span style={styles.label}>{minLabel || min}</span>
          <span style={styles.label}>{maxLabel || max}</span>
        </div>
      )}

      <div style={styles.selectedValue}>
        {value !== null ? (
          <>Selected: <strong>{value}</strong></>
        ) : (
          <span style={{ color: 'var(--color-primary-400)' }}>Tap to select a rating</span>
        )}
      </div>
    </div>
  );
}

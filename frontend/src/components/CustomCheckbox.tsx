import { typography, spacing, borders, transitions } from '../styles';

interface CustomCheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

const s = {
  wrapper: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing[2],
    cursor: 'pointer',
  },
  wrapperDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  box: {
    width: '18px',
    height: '18px',
    minWidth: '18px',
    borderRadius: borders.radius.sm,
    border: '2px solid var(--color-primary-400)',
    backgroundColor: 'var(--color-primary-50)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `all ${transitions.duration.fast}`,
    marginTop: '1px',
  },
  boxChecked: {
    backgroundColor: 'var(--color-primary-900)',
    borderColor: 'var(--color-primary-900)',
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    lineHeight: typography.lineHeight.normal,
    userSelect: 'none' as const,
  },
  description: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    marginTop: '1px',
    lineHeight: typography.lineHeight.relaxed,
  },
};

export default function CustomCheckbox({ id, checked, onChange, label, description, disabled }: CustomCheckboxProps) {
  return (
    <label
      htmlFor={id}
      style={{
        ...s.wrapper,
        ...(disabled ? s.wrapperDisabled : {}),
      }}
      onClick={(e) => {
        e.preventDefault();
        if (!disabled) onChange(!checked);
      }}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={() => {}}
        disabled={disabled}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
      />
      <span style={{ ...s.box, ...(checked ? s.boxChecked : {}) }}>
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-50)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      {(label || description) && (
        <span>
          {label && <span style={s.label}>{label}</span>}
          {description && <div style={s.description}>{description}</div>}
        </span>
      )}
    </label>
  );
}

import { useRef, useImperativeHandle, forwardRef } from 'react';
import { colors, typography, spacing, borders, transitions } from '../styles';

interface CustomFileInputProps {
  id?: string;
  accept?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  label?: string;
}

export interface CustomFileInputRef {
  clear: () => void;
}

const styles = {
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[3],
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: colors.primary[50],
    color: colors.primary[700],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: `1px solid ${colors.primary[300]}`,
    cursor: 'pointer',
    transition: `all ${transitions.duration.normal}`,
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  hiddenInput: {
    display: 'none',
  },
  icon: {
    width: '16px',
    height: '16px',
  },
};

const hoverStyles = `
  .custom-file-input-btn:hover:not(:disabled) {
    background-color: ${colors.primary[100]};
    border-color: ${colors.primary[400]};
  }
`;

const CustomFileInput = forwardRef<CustomFileInputRef, CustomFileInputProps>(
  function CustomFileInput(
    { id, accept, onChange, disabled = false, label = 'Choose File' },
    ref
  ) {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      clear: () => {
        if (inputRef.current) {
          inputRef.current.value = '';
        }
      },
    }));

    const handleClick = () => {
      if (!disabled && inputRef.current) {
        inputRef.current.click();
      }
    };

    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.container}>
          <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            style={{
              ...styles.button,
              ...(disabled ? styles.buttonDisabled : {}),
            }}
            className="custom-file-input-btn"
          >
            <svg
              style={styles.icon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {label}
          </button>
          <input
            ref={inputRef}
            type="file"
            id={id}
            accept={accept}
            onChange={onChange}
            disabled={disabled}
            style={styles.hiddenInput}
          />
        </div>
      </>
    );
  }
);

export default CustomFileInput;

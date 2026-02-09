import { useState, useRef, useEffect } from 'react';
import { typography, spacing, borders, shadows } from '../styles';

interface Option {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  id?: string;
  value: string | number;
  options: Option[];
  onChange: (value: string | number) => void;
  placeholder?: string;
  minWidth?: string;
}

const s = {
  container: {
    position: 'relative' as const,
    display: 'inline-block',
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    padding: `${spacing[3]} ${spacing[4]}`,
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-300)'}`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-900)',
    backgroundColor: 'var(--color-primary-50)',
    cursor: 'pointer',
    transition: 'border-color 150ms, box-shadow 150ms',
    minWidth: '140px',
  },
  triggerOpen: {
    borderColor: 'var(--color-primary-500)',
    boxShadow: `0 0 0 2px ${'var(--color-primary-100)'}`,
  },
  chevron: {
    width: '16px',
    height: '16px',
    color: 'var(--color-primary-500)',
    transition: 'transform 150ms',
    flexShrink: 0,
  },
  chevronOpen: {
    transform: 'rotate(180deg)',
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing[1],
    backgroundColor: 'white',
    border: `1px solid ${'var(--color-primary-200)'}`,
    borderRadius: borders.radius.md,
    boxShadow: shadows.lg,
    zIndex: 50,
    maxHeight: '240px',
    overflowY: 'auto' as const,
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-900)',
    cursor: 'pointer',
    transition: 'background-color 100ms',
  },
  optionSelected: {
    backgroundColor: 'var(--color-primary-100)',
    fontWeight: typography.fontWeight.medium,
  },
  checkIcon: {
    width: '16px',
    height: '16px',
    color: 'var(--color-primary-700)',
  },
  optionLabel: {
    flex: 1,
  },
};

export default function CustomSelect({
  id,
  value,
  options,
  onChange,
  placeholder = 'Select...',
  minWidth = '140px',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
    // Remove focus from the trigger button to clear the focus outline
    triggerRef.current?.blur();
  };

  return (
    <div ref={containerRef} style={s.container}>
      <style>{`
        .custom-select-trigger:hover {
          border-color: ${'var(--color-primary-400)'};
        }
        .custom-select-option:hover {
          background-color: ${'var(--color-primary-50)'};
        }
      `}</style>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...s.trigger,
          minWidth,
          ...(isOpen ? s.triggerOpen : {}),
        }}
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <svg
          style={{
            ...s.chevron,
            ...(isOpen ? s.chevronOpen : {}),
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div style={s.dropdown} role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <div
                key={option.value}
                onClick={() => handleSelect(option.value)}
                style={{
                  ...s.option,
                  ...(isSelected ? s.optionSelected : {}),
                }}
                className="custom-select-option"
                role="option"
                aria-selected={isSelected}
              >
                {isSelected && (
                  <svg style={s.checkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
                <span style={{ ...s.optionLabel, marginLeft: isSelected ? 0 : '24px' }}>
                  {option.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

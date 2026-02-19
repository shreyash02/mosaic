import { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { typography, spacing, borders } from '../styles';

interface DateOnlyPickerProps {
  value: string;                    // Format: YYYY-MM-DD
  onChange: (value: string) => void;
  min?: string;                     // Format: YYYY-MM-DD
  placeholder?: string;
  disabled?: boolean;
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value + 'T00:00:00');
  return isNaN(date.getTime()) ? null : date;
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const CustomInput = forwardRef<HTMLButtonElement, { value?: string; onClick?: () => void; placeholder?: string; disabled?: boolean; onClear?: () => void }>(
  ({ value, onClick, placeholder, disabled, onClear }, ref) => (
    <button
      type="button"
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className="date-only-picker-input"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing[2],
        padding: `${spacing[3]} ${spacing[4]}`,
        borderRadius: borders.radius.md,
        border: '1px solid var(--color-primary-300)',
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: value ? 'var(--color-primary-900)' : 'var(--color-primary-500)',
        backgroundColor: 'var(--color-primary-50)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'border-color 150ms, box-shadow 150ms',
        width: '100%',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span style={{ flex: 1, textAlign: 'left' }}>{value || placeholder}</span>
      {value && onClear ? (
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary-300)',
            color: 'var(--color-primary-700)',
            fontSize: '12px',
            lineHeight: 1,
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          &times;
        </span>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--color-primary-500)', flexShrink: 0 }}
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )}
    </button>
  )
);

CustomInput.displayName = 'DateOnlyPickerInput';

export default function DateOnlyPicker({
  value,
  onChange,
  min,
  placeholder = 'Select date',
  disabled = false,
}: DateOnlyPickerProps) {
  const selectedDate = parseDate(value);
  const minDate = parseDate(min || '');

  const handleChange = (date: Date | null) => {
    onChange(date ? formatDate(date) : '');
  };

  return (
    <div className="date-only-picker-wrapper">
      <style>{`
        .date-only-picker-input:hover:not(:disabled) {
          border-color: var(--color-primary-400);
        }
        .date-only-picker-input:focus {
          outline: none;
          border-color: var(--color-primary-500);
          box-shadow: 0 0 0 2px var(--color-primary-100);
        }

        .date-only-picker-wrapper .react-datepicker {
          font-family: ${typography.fontFamily.sans};
          border: 1px solid var(--color-primary-200);
          border-radius: ${borders.radius.lg};
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          background-color: var(--color-primary-50);
        }

        .date-only-picker-wrapper .react-datepicker__header {
          background-color: var(--color-primary-100);
          border-bottom: 1px solid var(--color-primary-200);
          padding-top: ${spacing[3]};
        }

        .date-only-picker-wrapper .react-datepicker__current-month {
          color: var(--color-primary-900);
          font-weight: ${typography.fontWeight.semibold};
          font-size: ${typography.fontSize.sm};
        }

        .date-only-picker-wrapper .react-datepicker__day-name {
          color: var(--color-primary-600);
          font-weight: ${typography.fontWeight.medium};
          font-size: ${typography.fontSize.xs};
        }

        .date-only-picker-wrapper .react-datepicker__day {
          color: var(--color-primary-900);
          border-radius: ${borders.radius.md};
          font-size: ${typography.fontSize.sm};
        }

        .date-only-picker-wrapper .react-datepicker__day:hover {
          background-color: var(--color-primary-100);
          border-radius: ${borders.radius.md};
        }

        .date-only-picker-wrapper .react-datepicker__day--selected,
        .date-only-picker-wrapper .react-datepicker__day--keyboard-selected {
          background-color: var(--color-primary-900) !important;
          color: var(--color-primary-50) !important;
        }

        .date-only-picker-wrapper .react-datepicker__day--today {
          font-weight: ${typography.fontWeight.bold};
          border: 1px solid var(--color-primary-400);
        }

        .date-only-picker-wrapper .react-datepicker__day--disabled {
          color: var(--color-primary-400);
        }

        .date-only-picker-wrapper .react-datepicker__navigation-icon::before {
          border-color: var(--color-primary-600);
        }

        .date-only-picker-wrapper .react-datepicker__navigation:hover *::before {
          border-color: var(--color-primary-900);
        }

        .date-only-picker-wrapper .react-datepicker-popper {
          z-index: 50;
        }

        html.dark .date-only-picker-wrapper .react-datepicker {
          background-color: var(--color-primary-50);
          border-color: var(--color-primary-300);
        }

        html.dark .date-only-picker-wrapper .react-datepicker__header {
          background-color: var(--color-primary-100);
          border-color: var(--color-primary-300);
        }
      `}</style>
      <DatePicker
        selected={selectedDate}
        onChange={handleChange}
        dateFormat="d MMM yyyy"
        minDate={minDate || undefined}
        disabled={disabled}
        placeholderText={placeholder}
        customInput={<CustomInput placeholder={placeholder} disabled={disabled} onClear={() => onChange('')} />}
        popperPlacement="bottom-start"
        showPopperArrow={false}
      />
    </div>
  );
}

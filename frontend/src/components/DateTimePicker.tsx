import { forwardRef, useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { typography, spacing, borders } from '../styles';
import CustomSelect from './CustomSelect';

interface DateTimePickerProps {
  id?: string;
  value: string;                    // Format: YYYY-MM-DDTHH:mm
  onChange: (value: string) => void;
  min?: string;                     // Format: YYYY-MM-DDTHH:mm
  max?: string;                     // Format: YYYY-MM-DDTHH:mm
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

// Convert YYYY-MM-DDTHH:mm string to Date object
function parseValue(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

// Convert Date object to YYYY-MM-DDTHH:mm string
function formatValue(date: Date | null): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Convert 24h to 12h format
function to12Hour(hour24: number): { hour: number; period: 'AM' | 'PM' } {
  if (hour24 === 0) return { hour: 12, period: 'AM' };
  if (hour24 === 12) return { hour: 12, period: 'PM' };
  if (hour24 > 12) return { hour: hour24 - 12, period: 'PM' };
  return { hour: hour24, period: 'AM' };
}

// Convert 12h to 24h format
function to24Hour(hour: number, period: 'AM' | 'PM'): number {
  if (period === 'AM') {
    return hour === 12 ? 0 : hour;
  }
  return hour === 12 ? 12 : hour + 12;
}

// Custom input component to match our design system
const CustomInput = forwardRef<HTMLButtonElement, { value?: string; onClick?: () => void; onToggle?: () => void; placeholder?: string; disabled?: boolean; id?: string }>(
  ({ value, onClick: _onClick, onToggle, placeholder, disabled, id }, ref) => (
    <button
      type="button"
      ref={ref}
      id={id}
      onClick={onToggle || _onClick}
      disabled={disabled}
      className="datetime-picker-input"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing[3],
        padding: `${spacing[3]} ${spacing[4]}`,
        borderRadius: borders.radius.md,
        border: '1px solid var(--color-primary-300)',
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
        color: value ? 'var(--color-primary-900)' : 'var(--color-primary-500)',
        backgroundColor: 'var(--color-primary-50)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'border-color 150ms, box-shadow 150ms',
        minWidth: '220px',
        width: '100%',
        maxWidth: '280px',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span>{value || placeholder}</span>
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
    </button>
  )
);

CustomInput.displayName = 'CustomInput';

// Custom time input with Today button and separate hour, minute, AM/PM selectors
interface CustomTimeInputProps {
  date: Date | null;
  onTimeChange: (hour: number, minute: number) => void;
  onTodayClick: () => void;
}

const HOUR_OPTIONS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(h => ({
  value: h,
  label: String(h),
}));

const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => ({
  value: m,
  label: String(m).padStart(2, '0'),
}));

const PERIOD_OPTIONS = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];

function CustomTimeInput({ date, onTimeChange, onTodayClick }: CustomTimeInputProps) {
  const currentHour24 = date?.getHours() ?? 9;
  const currentMinute = date?.getMinutes() ?? 0;
  const { hour: hour12, period } = to12Hour(currentHour24);

  const [selectedHour, setSelectedHour] = useState(hour12);
  const [selectedMinute, setSelectedMinute] = useState(currentMinute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(period);

  // Sync state when date prop changes
  useEffect(() => {
    if (date) {
      const { hour, period } = to12Hour(date.getHours());
      setSelectedHour(hour);
      setSelectedMinute(date.getMinutes());
      setSelectedPeriod(period);
    }
  }, [date]);

  const handleHourChange = (value: string | number) => {
    const newHour = Number(value);
    setSelectedHour(newHour);
    onTimeChange(to24Hour(newHour, selectedPeriod), selectedMinute);
  };

  const handleMinuteChange = (value: string | number) => {
    const newMinute = Number(value);
    setSelectedMinute(newMinute);
    onTimeChange(to24Hour(selectedHour, selectedPeriod), newMinute);
  };

  const handlePeriodChange = (value: string | number) => {
    const newPeriod = value as 'AM' | 'PM';
    setSelectedPeriod(newPeriod);
    onTimeChange(to24Hour(selectedHour, newPeriod), selectedMinute);
  };

  return (
    <div>
      <style>{`
        .datetime-time-select .custom-select-trigger {
          min-width: 0 !important;
          width: 100% !important;
          padding: ${spacing[2]} ${spacing[3]} !important;
          box-sizing: border-box !important;
        }
        .datetime-today-btn:hover {
          background-color: var(--color-primary-200) !important;
        }
      `}</style>
      <div style={{
        borderTop: '1px solid var(--color-primary-200)',
        backgroundColor: 'var(--color-primary-50)',
      }}>
        <button
          type="button"
          className="datetime-today-btn"
          onClick={onTodayClick}
          style={{
            display: 'block',
            width: '100%',
            padding: `${spacing[2]} ${spacing[4]}`,
            border: 'none',
            backgroundColor: 'var(--color-primary-100)',
            color: 'var(--color-primary-700)',
            fontWeight: typography.fontWeight.medium,
            fontSize: typography.fontSize.sm,
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          Today
        </button>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing[2],
        padding: `${spacing[2]} ${spacing[3]}`,
        borderTop: '1px solid var(--color-primary-200)',
        backgroundColor: 'var(--color-primary-50)',
        boxSizing: 'border-box',
        width: '100%',
      }}>
        <div className="datetime-time-select" style={{ flex: 1, minWidth: 0 }}>
          <CustomSelect
            value={selectedHour}
            options={HOUR_OPTIONS}
            onChange={handleHourChange}
            minWidth="100%"
          />
        </div>
        <span style={{ color: 'var(--color-primary-600)', fontWeight: typography.fontWeight.medium, flexShrink: 0 }}>:</span>
        <div className="datetime-time-select" style={{ flex: 1, minWidth: 0 }}>
          <CustomSelect
            value={selectedMinute}
            options={MINUTE_OPTIONS}
            onChange={handleMinuteChange}
            minWidth="100%"
          />
        </div>
        <div className="datetime-time-select" style={{ flex: 1, minWidth: 0 }}>
          <CustomSelect
            value={selectedPeriod}
            options={PERIOD_OPTIONS}
            onChange={handlePeriodChange}
            minWidth="100%"
          />
        </div>
      </div>
    </div>
  );
}

export default function DateTimePicker({
  id,
  value,
  onChange,
  min,
  max,
  required: _required,
  disabled = false,
  placeholder = 'Select date and time',
}: DateTimePickerProps) {
  const selectedDate = parseValue(value);
  const minDate = parseValue(min || '');
  const maxDate = parseValue(max || '');

  // Controlled open state for proper toggle-to-close behavior
  const [isOpen, setIsOpen] = useState(false);
  const closedAtRef = useRef(0);

  const handleToggle = () => {
    // Guard against close-then-reopen race (onClickOutside fires before click)
    if (Date.now() - closedAtRef.current < 200) return;
    setIsOpen(prev => !prev);
  };

  const handleClickOutside = (event: Event) => {
    // Don't close if clicking inside a portaled CustomSelect dropdown
    const dropdown = document.getElementById('custom-select-dropdown');
    if (dropdown && dropdown.contains(event.target as Node)) return;

    closedAtRef.current = Date.now();
    setIsOpen(false);
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      // Preserve existing time if we have one, otherwise use current time
      if (selectedDate) {
        date.setHours(selectedDate.getHours(), selectedDate.getMinutes());
      }
      onChange(formatValue(date));
    } else {
      onChange('');
    }
  };

  const handleTodayClick = () => {
    const today = new Date();
    // Preserve existing time or use current time
    if (selectedDate) {
      today.setHours(selectedDate.getHours(), selectedDate.getMinutes());
    }
    onChange(formatValue(today));
  };

  const handleTimeChange = (hour: number, minute: number) => {
    const date = selectedDate ? new Date(selectedDate) : new Date();
    date.setHours(hour, minute);
    onChange(formatValue(date));
  };

  return (
    <div className="datetime-picker-wrapper">
      <style>{`
        .datetime-picker-input:hover:not(:disabled) {
          border-color: var(--color-primary-400);
        }
        .datetime-picker-input:focus {
          outline: none;
          border-color: var(--color-primary-500);
          box-shadow: 0 0 0 2px var(--color-primary-100);
        }

        /* Override react-datepicker styles to match our design */
        .react-datepicker {
          font-family: ${typography.fontFamily.sans};
          border: 1px solid var(--color-primary-200);
          border-radius: ${borders.radius.lg};
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          background-color: var(--color-primary-50);
          display: inline-block;
          overflow: hidden;
          min-width: 304px;
        }

        .react-datepicker__month-container {
          float: none;
        }

        .react-datepicker__header {
          background-color: var(--color-primary-100);
          border-bottom: 1px solid var(--color-primary-200);
          padding-top: ${spacing[3]};
        }

        .react-datepicker__current-month {
          color: var(--color-primary-900);
          font-weight: ${typography.fontWeight.semibold};
          font-size: ${typography.fontSize.sm};
        }

        .react-datepicker__day-name {
          color: var(--color-primary-600);
          font-weight: ${typography.fontWeight.medium};
          font-size: ${typography.fontSize.xs};
        }

        .react-datepicker__day {
          color: var(--color-primary-900);
          border-radius: ${borders.radius.md};
          font-size: ${typography.fontSize.sm};
        }

        .react-datepicker__day:hover {
          background-color: var(--color-primary-100);
          border-radius: ${borders.radius.md};
        }

        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background-color: var(--color-primary-900) !important;
          color: var(--color-primary-50) !important;
        }

        .react-datepicker__day--today {
          font-weight: ${typography.fontWeight.bold};
          border: 1px solid var(--color-primary-400);
        }

        .react-datepicker__day--disabled {
          color: var(--color-primary-400);
        }

        .react-datepicker__navigation {
          top: 6px;
          border: none;
          outline: none;
        }

        .react-datepicker__navigation:focus-visible {
          outline: 2px solid var(--color-primary-400);
          outline-offset: 2px;
          border-radius: ${borders.radius.sm};
        }

        .react-datepicker__navigation-icon::before {
          border-color: var(--color-primary-600);
        }

        .react-datepicker__navigation:hover *::before {
          border-color: var(--color-primary-900);
        }

        /* Hide built-in time picker */
        .react-datepicker__time-container {
          display: none;
        }

        /* Popper positioning */
        .react-datepicker-popper {
          z-index: 9999;
        }

        /* Custom time input styles */
        .datetime-picker-wrapper .react-datepicker__children-container {
          width: 100%;
          padding: 0;
        }

        /* Remove default outline on all datepicker buttons */
        .react-datepicker button:focus {
          outline: none;
        }

        /* Dark mode support */
        html.dark .react-datepicker {
          background-color: var(--color-primary-50);
          border-color: var(--color-primary-300);
        }

        html.dark .react-datepicker__header {
          background-color: var(--color-primary-100);
          border-color: var(--color-primary-300);
        }
      `}</style>
      <DatePicker
        id={id}
        selected={selectedDate}
        onChange={handleDateChange}
        open={isOpen}
        onClickOutside={handleClickOutside}
        dateFormat="d MMM yyyy, h:mm aa"
        minDate={minDate || undefined}
        maxDate={maxDate || undefined}
        disabled={disabled}
        placeholderText={placeholder}
        customInput={<CustomInput placeholder={placeholder} disabled={disabled} id={id} onToggle={handleToggle} />}
        popperPlacement="bottom-start"
        showPopperArrow={false}
        shouldCloseOnSelect={false}
        fixedHeight
      >
        <CustomTimeInput date={selectedDate} onTimeChange={handleTimeChange} onTodayClick={handleTodayClick} />
      </DatePicker>
    </div>
  );
}

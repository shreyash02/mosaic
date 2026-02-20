import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversationForm } from '../../contexts/ConversationFormContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useFeature } from '../../contexts/FeaturesContext';
import { RecurrencePattern, type AnalysisInterval } from '../../types';
import { formatDateForDateTimeLocal } from '../../utils/formatting';
import { typography, spacing, borders } from '../../styles';
import CustomSelect from '../../components/CustomSelect';
import DateTimePicker from '../../components/DateTimePicker';

const INTERVAL_OPTIONS = [
  { value: 'every_10_minutes', label: 'Every 10 min (dev)' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const hour = i === 0 ? 12 : i;
  return { value: hour, label: `${hour}:00` };
});

const PERIOD_OPTIONS = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];

// Convert 24-hour time string to 12-hour components
const parse24HourTime = (time: string): { hour: number; period: 'AM' | 'PM' } => {
  const hour24 = parseInt(time.split(':')[0], 10);
  if (hour24 === 0) return { hour: 12, period: 'AM' };
  if (hour24 === 12) return { hour: 12, period: 'PM' };
  if (hour24 > 12) return { hour: hour24 - 12, period: 'PM' };
  return { hour: hour24, period: 'AM' };
};

// Convert 12-hour components to 24-hour time string
const to24HourTime = (hour: number, period: 'AM' | 'PM'): string => {
  let hour24: number;
  if (period === 'AM') {
    hour24 = hour === 12 ? 0 : hour;
  } else {
    hour24 = hour === 12 ? 12 : hour + 12;
  }
  return `${hour24.toString().padStart(2, '0')}:00`;
};

const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}${getOrdinalSuffix(i + 1)}`,
}));

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// Use CSS custom properties for dark mode support
const s = {
  radioGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  radioOption: {
    display: 'flex',
    flexDirection: 'column' as const,
    padding: spacing[4],
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.lg,
    cursor: 'pointer',
    transition: 'border-color 200ms, background-color 200ms',
  },
  radioOptionSelected: {
    borderColor: 'var(--color-primary-500)',
    backgroundColor: 'var(--color-primary-50)',
  },
  radioHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
  },
  radioInput: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
  },
  radioLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
  },
  radioDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    marginTop: spacing[1],
    marginLeft: '32px',
  },
  radioContent: {
    marginLeft: '32px',
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTop: '1px solid var(--color-primary-200)',
  },
  scheduleGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: spacing[3],
    alignItems: 'flex-end',
  },
  scheduleField: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[1],
  },
  scheduleLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
  },
  infoBox: {
    background: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    padding: spacing[4],
    marginTop: spacing[4],
  },
  infoText: {
    margin: 0,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
  },
  sectionDivider: {
    borderTop: '1px solid var(--color-primary-200)',
    marginTop: spacing[6],
    paddingTop: spacing[6],
  },
};

function DurationInput({ id, value, min, max, onChange, onOverflow, label, padDigits }: {
  id: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  onOverflow?: (direction: 'up' | 'down') => void;
  label: string;
  padDigits?: number;
}) {
  const increment = () => {
    if (value >= max && onOverflow) {
      onOverflow('up');
    } else {
      onChange(Math.min(max, value + 1));
    }
  };
  const decrement = () => {
    if (value <= min && onOverflow) {
      onOverflow('down');
    } else {
      onChange(Math.max(min, value - 1));
    }
  };

  return (
    <div>
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <style>{`
          .duration-number-input::-webkit-inner-spin-button,
          .duration-number-input::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .duration-number-input { -moz-appearance: textfield; }
        `}</style>
        <input
          id={id}
          type={padDigits ? 'text' : 'number'}
          inputMode={padDigits ? 'numeric' : undefined}
          className="duration-number-input"
          value={padDigits ? String(value).padStart(padDigits, '0') : value}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '');
            onChange(parseInt(raw) || 0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              increment();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              decrement();
            }
          }}
          style={{
            width: '72px',
            padding: `${spacing[2]} ${spacing[3]}`,
            paddingRight: '32px',
            border: '1px solid var(--color-primary-300)',
            borderRadius: borders.radius.md,
            fontSize: typography.fontSize.base,
            fontFamily: 'inherit',
            textAlign: 'center',
            backgroundColor: 'var(--color-primary-50)',
            color: 'var(--color-primary-900)',
          }}
        />
        <div style={{
          position: 'absolute',
          right: '4px',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
        }}>
          <button
            type="button"
            onClick={increment}
            disabled={value >= max && !onOverflow}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '22px',
              height: '14px',
              padding: 0,
              border: 'none',
              borderRadius: '3px',
              background: 'var(--color-primary-200)',
              color: 'var(--color-primary-600)',
              cursor: value >= max && !onOverflow ? 'default' : 'pointer',
              opacity: value >= max && !onOverflow ? 0.4 : 1,
            }}
          >
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4.5L5 1.5L9 4.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={decrement}
            disabled={value <= min && !onOverflow}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '22px',
              height: '14px',
              padding: 0,
              border: 'none',
              borderRadius: '3px',
              background: 'var(--color-primary-200)',
              color: 'var(--color-primary-600)',
              cursor: value <= min && !onOverflow ? 'default' : 'pointer',
              opacity: value <= min && !onOverflow ? 0.4 : 1,
            }}
          >
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 1.5L5 4.5L9 1.5" />
            </svg>
          </button>
        </div>
      </div>
      <label htmlFor={id} className="duration-label">{label}</label>
    </div>
  );
}

export default function TimingStep() {
  const navigate = useNavigate();
  const { formState, updateFormState, getStepPath } = useConversationForm();
  const { currentOrgId } = useOrganization();
  const slackEnabled = useFeature('slack_integration');
  const recurringEnabled = useFeature('recurring_conversations');
  const continuousEnabled = useFeature('continuous_conversations');
  const showNotificationsStep = slackEnabled && !!currentOrgId;
  const [showMinutesInput, setShowMinutesInput] = useState(formState.durationMinutes > 0);

  const isTemplate = formState.createTemplate;

  const isZeroDuration = !formState.isLongRunning && formState.durationHours === 0 && formState.durationMinutes === 0;

  const handleNext = () => {
    // Validate scheduled activation
    if (formState.activationMode === 'scheduled' && !formState.scheduledActivateAt) {
      alert('Please select a scheduled activation date and time');
      return;
    }
    // Validate recurring schedule
    if (isTemplate && formState.enableRecurring && !formState.nextInstanceDate) {
      alert('Please select when to create the first instance');
      return;
    }
    navigate(getStepPath(showNotificationsStep ? 'notifications' : 'review'));
  };

  // When switching to long-running, disable recurring (mutually exclusive for templates)
  const handleDurationModeChange = (isLongRunning: boolean) => {
    updateFormState({
      isLongRunning,
      // Clear recurring when switching to long-running
      ...(isLongRunning && { enableRecurring: false }),
    });
  };

  return (
    <div className="conversation-form">
      <style>{`
        @media (max-width: 768px) {
          .timing-radio-option {
            padding: ${spacing[3]} !important;
            border: none !important;
            border-bottom: 1px solid var(--color-primary-200) !important;
            border-radius: 0 !important;
          }
          .timing-radio-option:last-child {
            border-bottom: none !important;
          }
          .timing-radio-content {
            padding-left: 0 !important;
            border-top: none !important;
            margin-top: ${spacing[2]} !important;
            padding-top: 0 !important;
          }
        }
      `}</style>
      <div>
        <h2 className="form-section-title">Timing Settings</h2>
        <p className="form-help-text" style={{ marginBottom: '1.5rem' }}>
          Configure when and how long this conversation will be available
        </p>

        {/* SECTION 1: Duration */}
        <div className="form-group">
          <label style={{ marginBottom: spacing[3], display: 'block' }}>How long should responses be collected?</label>

          <div style={{ display: 'flex', gap: spacing[6], marginBottom: spacing[4] }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: spacing[2], cursor: 'pointer' }}>
              <input
                type="radio"
                name="durationMode"
                checked={!formState.isLongRunning}
                onChange={() => handleDurationModeChange(false)}
                style={{ width: '18px', height: '18px' }}
              />
              <span style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                Limited time
              </span>
            </label>
            {continuousEnabled && (
              <label style={{ display: 'flex', alignItems: 'center', gap: spacing[2], cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="durationMode"
                  checked={formState.isLongRunning}
                  onChange={() => handleDurationModeChange(true)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                  Indefinitely
                </span>
              </label>
            )}
          </div>

          {/* Limited time options */}
          {!formState.isLongRunning && (
            <div style={{ marginLeft: spacing[1] }}>
              <p className="form-help-text" style={{ marginBottom: spacing[3] }}>
                The conversation will automatically close after this duration
              </p>
              <div style={{ display: 'flex', gap: spacing[3], alignItems: 'flex-start' }}>
                <DurationInput
                  id="durationHours"
                  value={formState.durationHours}
                  min={showMinutesInput ? 0 : 1}
                  max={168}
                  onChange={(v) => updateFormState({ durationHours: Math.max(showMinutesInput ? 0 : 1, Math.min(168, v)) })}
                  label="Hours"
                />
                {showMinutesInput ? (
                  <DurationInput
                    id="durationMinutes"
                    value={formState.durationMinutes}
                    min={0}
                    max={59}
                    padDigits={2}
                    onChange={(raw) => {
                      if (raw >= 60) {
                        const extraHours = Math.floor(raw / 60);
                        const remainingMinutes = raw % 60;
                        updateFormState({
                          durationHours: Math.min(168, formState.durationHours + extraHours),
                          durationMinutes: remainingMinutes,
                        });
                      } else {
                        updateFormState({ durationMinutes: Math.max(0, raw) });
                      }
                    }}
                    onOverflow={(dir) => {
                      if (dir === 'up' && formState.durationHours < 168) {
                        updateFormState({ durationHours: formState.durationHours + 1, durationMinutes: 0 });
                      } else if (dir === 'down' && formState.durationHours > 0) {
                        updateFormState({ durationHours: formState.durationHours - 1, durationMinutes: 59 });
                      }
                    }}
                    label="Minutes"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowMinutesInput(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: `${spacing[2]} 0`,
                      fontSize: typography.fontSize.sm,
                      color: 'var(--color-primary-500)',
                      cursor: 'pointer',
                    }}
                  >
                    + Minutes
                  </button>
                )}
              </div>
              <p className="form-help-text" style={{ marginTop: spacing[2] }}>
                Maximum: 168 hours (1 week)
              </p>
              {isZeroDuration && (
                <p style={{ marginTop: spacing[2], fontSize: typography.fontSize.sm, color: 'var(--color-error)' }}>
                  Duration must be at least 1 minute
                </p>
              )}
            </div>
          )}

          {/* Long-running options */}
          {formState.isLongRunning && (
            <div style={{ marginLeft: spacing[1] }}>
              <p className="form-help-text" style={{ marginBottom: spacing[3] }}>
                The conversation stays open until you manually close it. Set up periodic analysis to summarize responses.
              </p>
              <div style={s.scheduleGrid}>
                    <div style={s.scheduleField}>
                      <label style={s.scheduleLabel}>
                        Run analysis
                      </label>
                      <CustomSelect
                        id="analysisInterval"
                        value={formState.analysisInterval}
                        options={INTERVAL_OPTIONS}
                        onChange={(value) => {
                          const interval = value as AnalysisInterval;
                          updateFormState({
                            analysisInterval: interval,
                            // Reset day when changing interval
                            analysisScheduleDay: interval === 'monthly' ? 1 : 1,
                          });
                        }}
                        minWidth="160px"
                      />
                    </div>

                    {/* Day selector - only for weekly/biweekly/monthly */}
                    {formState.analysisInterval !== 'daily' && (
                      <div style={s.scheduleField}>
                        <label style={s.scheduleLabel}>
                          {formState.analysisInterval === 'monthly' ? 'On day' : 'On'}
                        </label>
                        <CustomSelect
                          id="analysisScheduleDay"
                          value={formState.analysisScheduleDay}
                          options={formState.analysisInterval === 'monthly' ? DAYS_OF_MONTH : DAYS_OF_WEEK}
                          onChange={(value) => updateFormState({ analysisScheduleDay: value as number })}
                          minWidth="140px"
                        />
                      </div>
                    )}

                    {/* Time selector - hour */}
                    <div style={s.scheduleField}>
                      <label style={s.scheduleLabel}>
                        At
                      </label>
                      <CustomSelect
                        id="analysisScheduleHour"
                        value={parse24HourTime(formState.analysisScheduleTime).hour}
                        options={HOUR_OPTIONS}
                        onChange={(value) => {
                          const { period } = parse24HourTime(formState.analysisScheduleTime);
                          updateFormState({ analysisScheduleTime: to24HourTime(value as number, period) });
                        }}
                        minWidth="100px"
                      />
                    </div>

                    {/* Time selector - AM/PM */}
                    <div style={s.scheduleField}>
                      <label style={s.scheduleLabel}>&nbsp;</label>
                      <CustomSelect
                        id="analysisSchedulePeriod"
                        value={parse24HourTime(formState.analysisScheduleTime).period}
                        options={PERIOD_OPTIONS}
                        onChange={(value) => {
                          const { hour } = parse24HourTime(formState.analysisScheduleTime);
                          updateFormState({ analysisScheduleTime: to24HourTime(hour, value as 'AM' | 'PM') });
                        }}
                        minWidth="80px"
                      />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: When to Activate - Only for conversations, not templates */}
        {!isTemplate && (
          <div className="form-group" style={s.sectionDivider}>
            <label style={{ marginBottom: spacing[3], display: 'block' }}>When should it become active?</label>

            <div style={{ display: 'flex', gap: spacing[6], marginBottom: spacing[4], flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: spacing[2], cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="activationMode"
                  checked={formState.activationMode === 'immediate'}
                  onChange={() => {
                    updateFormState({ activationMode: 'immediate', scheduleActivation: false, scheduledActivateAt: '' });
                  }}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                  Immediately
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: spacing[2], cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="activationMode"
                  checked={formState.activationMode === 'scheduled'}
                  onChange={() => {
                    const defaultTime = new Date();
                    defaultTime.setHours(defaultTime.getHours() + 1, 0, 0, 0);
                    updateFormState({
                      activationMode: 'scheduled',
                      scheduleActivation: true,
                      scheduledActivateAt: formatDateForDateTimeLocal(defaultTime),
                    });
                  }}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                  Scheduled
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: spacing[2], cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="activationMode"
                  checked={formState.activationMode === 'manual'}
                  onChange={() => {
                    updateFormState({ activationMode: 'manual', scheduleActivation: false, scheduledActivateAt: '' });
                  }}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                  Manually
                </span>
              </label>
            </div>

            {formState.activationMode === 'immediate' && (
              <p className="form-help-text">
                The conversation will be active as soon as you create it.
              </p>
            )}

            {formState.activationMode === 'scheduled' && (
              <div style={{ marginLeft: spacing[1] }}>
                <p className="form-help-text" style={{ marginBottom: spacing[3] }}>
                  The conversation will activate at the specified date and time.
                </p>
                <DateTimePicker
                  id="scheduledActivateAt"
                  value={formState.scheduledActivateAt}
                  onChange={(value) => updateFormState({ scheduledActivateAt: value })}
                  min={formatDateForDateTimeLocal(new Date())}
                  required
                />
              </div>
            )}

            {formState.activationMode === 'manual' && (
              <p className="form-help-text">
                The conversation will be created as a draft. You can activate it later from the dashboard.
              </p>
            )}
          </div>
        )}

        {/* Flexible timing info banner */}
        {!isTemplate && !formState.isLongRunning && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: spacing[3],
            padding: spacing[4],
            backgroundColor: 'var(--color-info-50, #eff6ff)',
            border: `1px solid var(--color-info-200, #bfdbfe)`,
            borderRadius: borders.radius.lg,
            marginBottom: spacing[4],
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-info-500, #3b82f6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <div>
              <div style={{ fontWeight: typography.fontWeight.semibold, color: 'var(--color-info-700, #1d4ed8)', marginBottom: spacing[1] }}>
                Flexible timing
              </div>
              <div style={{ fontSize: typography.fontSize.sm, color: 'var(--color-info-600, #2563eb)' }}>
                You can manually close the conversation early or extend it at any time from the dashboard, regardless of these settings.
              </div>
            </div>
          </div>
        )}

        {/* Recurring Schedule - Only for templates and when NOT long-running */}
        {recurringEnabled && isTemplate && !formState.isLongRunning && (
          <div className="form-group" style={s.sectionDivider}>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <input
                type="checkbox"
                checked={formState.enableRecurring}
                onChange={(e) => updateFormState({ enableRecurring: e.target.checked })}
                style={{ marginRight: '0.5rem' }}
              />
              <span style={{ fontWeight: 600 }}>
                Enable Recurring Schedule
              </span>
            </label>
            <p className="form-help-text" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
              Optional: Set a schedule to automatically create conversation instances from this template.
            </p>

            {formState.enableRecurring && (
              <div className="recurring-schedule-config" style={{ paddingLeft: '1.5rem', borderLeft: '3px solid var(--color-primary-500)' }}>
                {/* Timezone indicator */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[2],
                  marginBottom: spacing[4],
                  padding: `${spacing[2]} ${spacing[3]}`,
                  backgroundColor: 'var(--color-primary-100)',
                  borderRadius: borders.radius.md,
                  fontSize: typography.fontSize.sm,
                  color: 'var(--color-primary-700)',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  All times are in {Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ')}
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="recurrencePattern">Frequency</label>
                  <CustomSelect
                    id="recurrencePattern"
                    value={formState.recurrencePattern}
                    options={[
                      { value: RecurrencePattern.WEEKLY, label: 'Weekly' },
                      { value: RecurrencePattern.BIWEEKLY, label: 'Every 2 weeks' },
                      { value: RecurrencePattern.MONTHLY, label: 'Monthly' },
                      { value: RecurrencePattern.QUARTERLY, label: 'Quarterly (every 3 months)' },
                    ]}
                    onChange={(value) => updateFormState({ recurrencePattern: value as RecurrencePattern })}
                    minWidth="220px"
                  />
                  <p className="form-help-text">
                    How often should new instances be created automatically?
                  </p>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="nextInstanceDate">Create First Instance On</label>
                  <DateTimePicker
                    id="nextInstanceDate"
                    value={formState.nextInstanceDate}
                    onChange={(value) => updateFormState({ nextInstanceDate: value })}
                    required
                  />
                  <p className="form-help-text">
                    When should the first recurring instance be created? Subsequent instances will be created based on the frequency.
                  </p>
                </div>

                <div className="form-group">
                  <label htmlFor="recurrenceEndDate">End Recurring Schedule (Optional)</label>
                  <DateTimePicker
                    id="recurrenceEndDate"
                    value={formState.recurrenceEndDate}
                    onChange={(value) => updateFormState({ recurrenceEndDate: value })}
                  />
                  <p className="form-help-text">
                    When should the recurring schedule stop? Leave empty to continue indefinitely.
                  </p>
                </div>

                <div style={s.infoBox}>
                  <p style={s.infoText}>
                    <strong>Note:</strong> New instances will be created automatically with the same questions, settings, and invitations.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Navigation */}
      <div className="form-actions" style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '2rem',
        paddingTop: '2rem',
        borderTop: '1px solid #e2e8f0',
      }}>
        <button
          type="button"
          onClick={() => navigate(getStepPath('questions'))}
          className="btn btn-secondary"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={isZeroDuration}
          className="btn btn-primary btn-large"
        >
          Next: Notifications →
        </button>
      </div>
    </div>
  );
}

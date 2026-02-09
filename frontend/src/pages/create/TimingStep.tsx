import { useNavigate } from 'react-router-dom';
import { useConversationForm } from '../../contexts/ConversationFormContext';
import { RecurrencePattern, type AnalysisInterval } from '../../types';
import { formatDateForDateTimeLocal } from '../../utils/formatting';
import { colors, typography, spacing, borders } from '../../styles';
import CustomSelect from '../../components/CustomSelect';

const INTERVAL_OPTIONS = [
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
    border: `1px solid ${colors.primary[300]}`,
    borderRadius: borders.radius.lg,
    cursor: 'pointer',
    transition: 'border-color 200ms, background-color 200ms',
  },
  radioOptionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
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
    color: colors.primary[900],
  },
  radioDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    marginTop: spacing[1],
    marginLeft: '32px',
  },
  radioContent: {
    marginLeft: '32px',
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTop: `1px solid ${colors.primary[200]}`,
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
    color: colors.primary[700],
  },
  infoBox: {
    background: colors.primary[100],
    border: `1px solid ${colors.primary[300]}`,
    borderRadius: borders.radius.md,
    padding: spacing[4],
    marginTop: spacing[4],
  },
  infoText: {
    margin: 0,
    fontSize: typography.fontSize.sm,
    color: colors.primary[700],
  },
};

export default function TimingStep() {
  const navigate = useNavigate();
  const { formState, updateFormState, getStepPath } = useConversationForm();

  const isTemplate = formState.createTemplate;

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
      <div className="form-section">
        <h2>Timing Settings</h2>
        <p className="form-help-text" style={{ marginBottom: '1.5rem' }}>
          Configure when and how long this conversation will be available
        </p>

        {/* Collection Duration - Radio toggle */}
        <div className="form-group">
          <label style={{ marginBottom: spacing[3], display: 'block' }}>Collection Duration</label>

          <div style={s.radioGroup}>
            {/* Limited Time Option */}
            <div
              style={{
                ...s.radioOption,
                ...(formState.isLongRunning ? {} : s.radioOptionSelected),
              }}
              onClick={() => handleDurationModeChange(false)}
            >
              <div style={s.radioHeader}>
                <input
                  type="radio"
                  id="limitedTime"
                  name="durationMode"
                  checked={!formState.isLongRunning}
                  onChange={() => handleDurationModeChange(false)}
                  style={s.radioInput}
                />
                <label htmlFor="limitedTime" style={s.radioLabel}>Limited time</label>
              </div>
              <p style={s.radioDescription}>
                Conversation closes automatically after a set duration
              </p>

              {!formState.isLongRunning && (
                <div style={s.radioContent}>
                  {/* Duration inputs */}
                  <div className="form-group" style={{ marginBottom: spacing[4] }}>
                    <label style={{ ...s.scheduleLabel, marginBottom: spacing[2] }}>
                      Response Window
                    </label>
                    <div className="duration-inputs">
                      <div className="duration-input-group">
                        <input
                          id="durationHours"
                          type="number"
                          min="0"
                          max="168"
                          value={formState.durationHours}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(168, parseInt(e.target.value) || 0));
                            updateFormState({ durationHours: value });
                          }}
                          placeholder="0"
                        />
                        <label htmlFor="durationHours" className="duration-label">Hours</label>
                      </div>
                      <div className="duration-input-group">
                        <input
                          id="durationMinutes"
                          type="number"
                          min="0"
                          max="59"
                          value={formState.durationMinutes}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                            updateFormState({ durationMinutes: value });
                          }}
                          placeholder="0"
                        />
                        <label htmlFor="durationMinutes" className="duration-label">Minutes</label>
                      </div>
                    </div>
                    <p className="form-help-text" style={{ marginTop: spacing[2] }}>
                      Maximum duration is 168 hours (1 week). Leave empty or set to 0 for no auto-close.
                    </p>
                  </div>

                  {/* Schedule activation - only for conversations, not templates */}
                  {!isTemplate && (
                    <div className="form-group checkbox-group" style={{ marginTop: spacing[4], marginBottom: 0 }}>
                      <label htmlFor="scheduleActivation">
                        <input
                          id="scheduleActivation"
                          type="checkbox"
                          checked={formState.scheduleActivation}
                          onChange={(e) => {
                            updateFormState({ scheduleActivation: e.target.checked });
                            if (e.target.checked) {
                              const defaultTime = new Date();
                              updateFormState({ scheduledActivateAt: formatDateForDateTimeLocal(defaultTime) });
                            } else {
                              updateFormState({ scheduledActivateAt: '' });
                            }
                          }}
                        />
                        <span>Schedule activation for a future date and time</span>
                      </label>

                      {formState.scheduleActivation && (
                        <div style={{ marginTop: spacing[3] }}>
                          <input
                            id="scheduledActivateAt"
                            type="datetime-local"
                            value={formState.scheduledActivateAt}
                            onChange={(e) => updateFormState({ scheduledActivateAt: e.target.value })}
                            min={formatDateForDateTimeLocal(new Date())}
                            required={formState.scheduleActivation}
                            style={{ width: '100%', maxWidth: '280px' }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Long-running Option */}
            <div
              style={{
                ...s.radioOption,
                ...(formState.isLongRunning ? s.radioOptionSelected : {}),
              }}
              onClick={() => handleDurationModeChange(true)}
            >
              <div style={s.radioHeader}>
                <input
                  type="radio"
                  id="longRunning"
                  name="durationMode"
                  checked={formState.isLongRunning}
                  onChange={() => handleDurationModeChange(true)}
                  style={s.radioInput}
                />
                <label htmlFor="longRunning" style={s.radioLabel}>Long-running feedback</label>
              </div>
              <p style={s.radioDescription}>
                Stays open indefinitely with periodic analysis at scheduled intervals
              </p>

              {formState.isLongRunning && (
                <div style={s.radioContent}>
                  {/* Analysis interval */}
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

                  <div style={s.infoBox}>
                    <p style={s.infoText}>
                      The conversation will stay open until you manually close it. Analysis will run automatically at the scheduled time, summarizing all responses since the last analysis.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recurring Schedule - Only for templates and when NOT long-running */}
        {isTemplate && !formState.isLongRunning && (
          <div className="form-group">
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
              <div className="recurring-schedule-config" style={{ paddingLeft: '1.5rem', borderLeft: `3px solid ${colors.primary[500]}` }}>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="recurrencePattern">Frequency</label>
                  <select
                    id="recurrencePattern"
                    value={formState.recurrencePattern}
                    onChange={(e) => updateFormState({ recurrencePattern: e.target.value as RecurrencePattern })}
                    required
                  >
                    <option value={RecurrencePattern.WEEKLY}>Weekly</option>
                    <option value={RecurrencePattern.BIWEEKLY}>Every 2 weeks</option>
                    <option value={RecurrencePattern.MONTHLY}>Monthly</option>
                    <option value={RecurrencePattern.QUARTERLY}>Quarterly (every 3 months)</option>
                  </select>
                  <p className="form-help-text">
                    How often should new instances be created automatically?
                  </p>
                </div>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="nextInstanceDate">Create First Instance On</label>
                  <input
                    type="datetime-local"
                    id="nextInstanceDate"
                    value={formState.nextInstanceDate}
                    onChange={(e) => updateFormState({ nextInstanceDate: e.target.value })}
                    required
                  />
                  <p className="form-help-text">
                    When should the first recurring instance be created? Subsequent instances will be created based on the frequency.
                  </p>
                </div>

                <div className="form-group">
                  <label htmlFor="recurrenceEndDate">End Recurring Schedule (Optional)</label>
                  <input
                    type="datetime-local"
                    id="recurrenceEndDate"
                    value={formState.recurrenceEndDate}
                    onChange={(e) => updateFormState({ recurrenceEndDate: e.target.value })}
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
          onClick={() => navigate(getStepPath('review'))}
          className="btn btn-primary btn-large"
        >
          Next: Review →
        </button>
      </div>
    </div>
  );
}

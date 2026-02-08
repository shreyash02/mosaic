import { useNavigate } from 'react-router-dom';
import { useConversationForm } from '../../contexts/ConversationFormContext';
import { RecurrencePattern } from '../../types';
import { formatDateForDateTimeLocal } from '../../utils/formatting';

export default function TimingStep() {
  const navigate = useNavigate();
  const { formState, updateFormState } = useConversationForm();

  const isTemplate = formState.createTemplate;

  return (
    <div className="conversation-form">
      <div className="form-section">
        <h2>Timing Settings</h2>
        <p className="form-help-text" style={{ marginBottom: '1.5rem' }}>
          Configure when and how long this conversation will be available
        </p>

        {/* Schedule activation only applies to conversations, not templates */}
        {!isTemplate && (
          <>
            <div className="form-group checkbox-group" style={{ marginTop: '0' }}>
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
              <p className="form-help-text">
                If enabled, the conversation will be automatically activated at the specified time.
                Otherwise, you can activate it manually after creation.
              </p>
            </div>

            {formState.scheduleActivation && (
              <div className="form-group">
                <label htmlFor="scheduledActivateAt">Scheduled Activation Date & Time *</label>
                <input
                  id="scheduledActivateAt"
                  type="datetime-local"
                  value={formState.scheduledActivateAt}
                  onChange={(e) => updateFormState({ scheduledActivateAt: e.target.value })}
                  min={formatDateForDateTimeLocal(new Date())}
                  required={formState.scheduleActivation}
                />
                <p className="form-help-text">
                  The conversation will be automatically activated at this time.
                </p>
              </div>
            )}
          </>
        )}

        <div className="form-group">
          <label htmlFor="durationHours">Response Window (optional)</label>
          <p className="form-help-text" style={{ marginBottom: '10px' }}>
            How long should this conversation remain open for responses after activation?
          </p>
          <div className="duration-inputs">
            <div className="duration-input-group">
              <input
                id="durationHours"
                type="number"
                min="0"
                max="48"
                value={formState.durationHours}
                onChange={(e) => {
                  const value = Math.max(0, Math.min(48, parseInt(e.target.value) || 0));
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
          <p className="form-help-text">
            Maximum duration is 48 hours. Leave empty or set to 0 for no auto-close.
          </p>
        </div>

        {/* Recurring Schedule - Only for templates */}
        {isTemplate && (
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
              <div className="recurring-schedule-config" style={{ paddingLeft: '1.5rem', borderLeft: '3px solid #4299e1' }}>
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

                <div style={{
                  background: '#EBF8FF',
                  border: '1px solid #90CDF4',
                  borderRadius: '6px',
                  padding: '1rem',
                  marginTop: '1rem'
                }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#2C5282' }}>
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
          onClick={() => navigate('/create/conversation/questions')}
          className="btn btn-secondary"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => navigate('/create/conversation/review')}
          className="btn btn-primary btn-large"
        >
          Next: Review →
        </button>
      </div>
    </div>
  );
}

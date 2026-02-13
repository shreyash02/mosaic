import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { Reminder, NonRespondersCount } from '../types';
import { typography, spacing, borders } from '../styles';
import DateTimePicker from './DateTimePicker';
import CollapsibleSection from './CollapsibleSection';
import { getErrorMessage } from '../utils/errorMessages';
import { formatDate } from '../utils/formatting';

interface Props {
  conversationId: string;
  isActive: boolean;
}

const styles = {
  statsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing[3]} 0`,
    borderBottom: '1px solid var(--color-primary-200)',
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
  statValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
  },
  buttonRow: {
    display: 'flex',
    gap: spacing[2],
    marginTop: spacing[4],
    flexWrap: 'wrap' as const,
  },
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    padding: `${spacing[2]} ${spacing[4]}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    border: 'none',
    cursor: 'pointer',
  },
  buttonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: 'transparent',
    color: 'var(--color-primary-900)',
    padding: `${spacing[2]} ${spacing[4]}`,
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    border: '1px solid var(--color-primary-400)',
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  scheduleForm: {
    marginTop: spacing[4],
    padding: spacing[4],
    backgroundColor: 'var(--color-primary-100)',
    borderRadius: borders.radius.md,
  },
  scheduleLabel: {
    display: 'block',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[2],
  },
  reminderList: {
    marginTop: spacing[4],
  },
  reminderItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing[3]} 0`,
    borderBottom: '1px solid var(--color-primary-200)',
  },
  reminderInfo: {
    flex: 1,
  },
  reminderType: {
    fontSize: typography.fontSize.xs,
    textTransform: 'uppercase' as const,
    color: 'var(--color-primary-500)',
    marginBottom: spacing[1],
  },
  reminderDate: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-900)',
  },
  reminderStatus: {
    fontSize: typography.fontSize.xs,
    padding: `${spacing[1]} ${spacing[2]}`,
    borderRadius: borders.radius.full,
    fontWeight: typography.fontWeight.medium,
  },
  statusPending: {
    backgroundColor: 'var(--color-warning-light)',
    color: 'var(--color-warning-text)',
  },
  statusSent: {
    backgroundColor: 'var(--color-success-light)',
    color: 'var(--color-success-text)',
  },
  statusCancelled: {
    backgroundColor: 'var(--color-primary-200)',
    color: 'var(--color-primary-600)',
  },
  cancelButton: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-error)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: spacing[1],
  },
  error: {
    color: 'var(--color-error)',
    fontSize: typography.fontSize.sm,
    marginTop: spacing[2],
  },
  successToast: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: 'var(--color-success-light)',
    border: '1px solid var(--color-success)',
    color: 'var(--color-success-text)',
    padding: spacing[3],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginTop: spacing[3],
  },
  noData: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    fontStyle: 'italic',
    padding: `${spacing[3]} 0`,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: `${spacing[6]} ${spacing[4]}`,
  },
  emptyIcon: {
    width: '48px',
    height: '48px',
    margin: '0 auto',
    marginBottom: spacing[3],
    color: 'var(--color-primary-300)',
  },
  emptyTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    marginBottom: spacing[4],
    lineHeight: '1.5',
  },
  historyTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-700)',
    marginTop: spacing[5],
    marginBottom: spacing[3],
    paddingTop: spacing[4],
    borderTop: '1px solid var(--color-primary-200)',
  },
};

export default function ReminderManager({ conversationId, isActive }: Props) {
  const [nonRespondersCount, setNonRespondersCount] = useState<NonRespondersCount | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [countData, reminderData] = await Promise.all([
        api.getNonRespondersCount(conversationId),
        api.listReminders(conversationId),
      ]);
      setNonRespondersCount(countData);
      setReminders(reminderData.reminders);
    } catch (err) {
      console.error('Failed to load reminder data:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-dismiss success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleSendNow = async () => {
    if (!nonRespondersCount || nonRespondersCount.non_responders === 0) return;

    try {
      setSending(true);
      setError(null);
      setSuccess(null);
      await api.createReminder(conversationId);
      setSuccess('Reminder sent successfully!');
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'send the reminder'));
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduledDate) {
      setError('Please select a date and time');
      return;
    }

    try {
      setSending(true);
      setError(null);
      setSuccess(null);
      await api.createReminder(conversationId, new Date(scheduledDate).toISOString());
      setSuccess('Reminder scheduled successfully!');
      setShowScheduleForm(false);
      setScheduledDate('');
      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'schedule the reminder'));
    } finally {
      setSending(false);
    }
  };

  const handleCancel = async (reminderId: string) => {
    try {
      await api.cancelReminder(conversationId, reminderId);
      await loadData();
    } catch (err) {
      console.error('Failed to cancel reminder:', err);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return { ...styles.reminderStatus, ...styles.statusPending };
      case 'sent':
        return { ...styles.reminderStatus, ...styles.statusSent };
      case 'cancelled':
        return { ...styles.reminderStatus, ...styles.statusCancelled };
      default:
        return styles.reminderStatus;
    }
  };

  const hasReminders = reminders.length > 0;
  const hasNonResponders = nonRespondersCount && nonRespondersCount.non_responders > 0;
  const showEmptyState = !loading && !hasReminders && isActive && !showScheduleForm;

  // Badge showing pending reminders count
  const pendingCount = reminders.filter(r => r.status === 'pending').length;
  const badge = pendingCount > 0 ? (
    <span style={{
      fontSize: typography.fontSize.xs,
      backgroundColor: 'var(--color-warning-light)',
      color: 'var(--color-warning-text)',
      padding: `${spacing[1]} ${spacing[2]}`,
      borderRadius: borders.radius.full,
      fontWeight: typography.fontWeight.medium,
    }}>
      {pendingCount} scheduled
    </span>
  ) : null;

  return (
    <CollapsibleSection title="Reminders" defaultExpanded={true} badge={badge}>
      {loading ? (
        <div style={styles.noData}>Loading...</div>
      ) : (
        <>
          {/* Empty state when no reminders have been set up */}
          {showEmptyState && !hasNonResponders && (
            <div style={styles.emptyState}>
              <svg style={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <div style={styles.emptyTitle}>No reminders yet</div>
              <div style={styles.emptyText}>
                All participants have responded. You can send reminders when new non-responders appear.
              </div>
            </div>
          )}

          {showEmptyState && hasNonResponders && (
            <div style={styles.emptyState}>
              <svg style={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <div style={styles.emptyTitle}>No reminders sent yet</div>
              <div style={styles.emptyText}>
                Send a reminder to {nonRespondersCount?.non_responders} participant{nonRespondersCount?.non_responders !== 1 ? 's' : ''} who haven't responded yet.
              </div>
              <div style={{ display: 'flex', gap: spacing[2], justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  style={{
                    ...styles.buttonPrimary,
                    ...(sending ? styles.buttonDisabled : {}),
                  }}
                  onClick={handleSendNow}
                  disabled={sending}
                >
                  {sending ? 'Sending...' : 'Send Now'}
                </button>
                <button
                  style={styles.buttonSecondary}
                  onClick={() => setShowScheduleForm(true)}
                >
                  Schedule
                </button>
              </div>
            </div>
          )}

          {/* Stats and actions when we have data or reminders */}
          {!showEmptyState && nonRespondersCount && (
            <>
              <div style={styles.statsRow}>
                <span style={styles.statLabel}>Total invited</span>
                <span style={styles.statValue}>{nonRespondersCount.total_invitations}</span>
              </div>
              <div style={styles.statsRow}>
                <span style={styles.statLabel}>Responded</span>
                <span style={styles.statValue}>{nonRespondersCount.responded}</span>
              </div>
              <div style={{ ...styles.statsRow, borderBottom: 'none' }}>
                <span style={styles.statLabel}>Not responded</span>
                <span style={styles.statValue}>{nonRespondersCount.non_responders}</span>
              </div>

              {isActive && hasNonResponders && (
                <div style={styles.buttonRow}>
                  <button
                    style={{
                      ...styles.buttonPrimary,
                      ...(sending ? styles.buttonDisabled : {}),
                    }}
                    onClick={handleSendNow}
                    disabled={sending}
                  >
                    {sending ? 'Sending...' : 'Send Reminder Now'}
                  </button>
                  <button
                    style={styles.buttonSecondary}
                    onClick={() => setShowScheduleForm(!showScheduleForm)}
                  >
                    {showScheduleForm ? 'Cancel' : 'Schedule Reminder'}
                  </button>
                </div>
              )}

              {isActive && !hasNonResponders && (
                <div style={styles.noData}>
                  All invited participants have responded.
                </div>
              )}
            </>
          )}

          {showScheduleForm && (
            <div style={styles.scheduleForm}>
              <label style={styles.scheduleLabel}>Schedule for:</label>
              <DateTimePicker
                value={scheduledDate}
                onChange={setScheduledDate}
                min={new Date().toISOString().slice(0, 16)}
              />
              <div style={{ marginTop: spacing[3] }}>
                <button
                  style={{
                    ...styles.buttonPrimary,
                    ...(sending ? styles.buttonDisabled : {}),
                  }}
                  onClick={handleSchedule}
                  disabled={sending}
                >
                  {sending ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}
          {success && (
            <div style={styles.successToast}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {success}
            </div>
          )}

          {hasReminders && (
            <div style={styles.reminderList}>
              <div style={styles.historyTitle}>History</div>
              {reminders.map((reminder) => (
                <div key={reminder.id} style={styles.reminderItem}>
                  <div style={styles.reminderInfo}>
                    <div style={styles.reminderType}>
                      {reminder.reminder_type === 'scheduled' ? 'Scheduled' : 'Immediate'}
                    </div>
                    <div style={styles.reminderDate}>
                      {reminder.status === 'sent' && reminder.sent_at
                        ? `Sent ${formatDate(reminder.sent_at)} to ${reminder.recipients_count} participant(s)`
                        : reminder.scheduled_at
                        ? `Scheduled for ${formatDate(reminder.scheduled_at)}`
                        : `Created ${formatDate(reminder.created_at)}`}
                    </div>
                  </div>
                  <span style={getStatusStyle(reminder.status)}>
                    {reminder.status}
                  </span>
                  {reminder.status === 'pending' && reminder.reminder_type === 'scheduled' && (
                    <button
                      style={styles.cancelButton}
                      onClick={() => handleCancel(reminder.id)}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isActive && (
            <div style={styles.noData}>
              Reminders can only be sent for active conversations.
            </div>
          )}
        </>
      )}
    </CollapsibleSection>
  );
}

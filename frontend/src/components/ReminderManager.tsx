import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { Reminder, NonRespondersCount } from '../types';
import { typography, spacing, borders } from '../styles';
import DateTimePicker from './DateTimePicker';

interface Props {
  conversationId: string;
  isActive: boolean;
}

const styles = {
  container: {
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.lg,
    padding: spacing[5],
  },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
    paddingBottom: spacing[3],
    borderBottom: '1px solid var(--color-primary-200)',
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
  },
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
  success: {
    color: 'var(--color-success)',
    fontSize: typography.fontSize.sm,
    marginTop: spacing[2],
  },
  noData: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
    fontStyle: 'italic',
    padding: `${spacing[3]} 0`,
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
      setError(err instanceof Error ? err.message : 'Failed to send reminder');
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
      setError(err instanceof Error ? err.message : 'Failed to schedule reminder');
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
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

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.title}>Reminders</div>
        <div style={styles.noData}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>
        <span>Reminders</span>
      </div>

      {nonRespondersCount && (
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
        </>
      )}

      {isActive && nonRespondersCount && nonRespondersCount.non_responders > 0 && (
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
      {success && <div style={styles.success}>{success}</div>}

      {reminders.length > 0 && (
        <div style={styles.reminderList}>
          <div style={{ ...styles.title, marginTop: spacing[4] }}>History</div>
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

      {isActive && nonRespondersCount && nonRespondersCount.non_responders === 0 && (
        <div style={styles.noData}>
          All invited participants have responded.
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { Announcement } from '../types';
import { typography, spacing, borders } from '../styles';

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
  form: {
    marginBottom: spacing[4],
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    padding: spacing[3],
    fontSize: typography.fontSize.sm,
    fontFamily: 'inherit',
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  charCount: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    textAlign: 'right' as const,
    marginTop: spacing[1],
  },
  charCountWarning: {
    color: 'var(--color-warning)',
  },
  charCountError: {
    color: 'var(--color-error)',
  },
  buttonRow: {
    display: 'flex',
    gap: spacing[2],
    marginTop: spacing[3],
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
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  announcementList: {
    marginTop: spacing[4],
  },
  announcementItem: {
    padding: spacing[4],
    backgroundColor: 'var(--color-warning-light)',
    borderLeft: '4px solid var(--color-warning)',
    borderRadius: `0 ${borders.radius.md} ${borders.radius.md} 0`,
    marginBottom: spacing[3],
  },
  announcementMessage: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-900)',
    whiteSpace: 'pre-wrap' as const,
    marginBottom: spacing[2],
  },
  announcementMeta: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-600)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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

const MAX_MESSAGE_LENGTH = 2000;

export default function AnnouncementManager({ conversationId, isActive }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.listAnnouncements(conversationId);
      setAnnouncements(data.announcements);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      setError(`Message is too long (max ${MAX_MESSAGE_LENGTH} characters)`);
      return;
    }

    try {
      setSending(true);
      setError(null);
      setSuccess(null);
      await api.createAnnouncement(conversationId, message.trim());
      setSuccess('Announcement sent successfully!');
      setMessage('');
      await loadAnnouncements();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send announcement');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getCharCountStyle = () => {
    if (message.length > MAX_MESSAGE_LENGTH) {
      return { ...styles.charCount, ...styles.charCountError };
    }
    if (message.length > MAX_MESSAGE_LENGTH * 0.9) {
      return { ...styles.charCount, ...styles.charCountWarning };
    }
    return styles.charCount;
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.title}>Announcements</div>
        <div style={styles.noData}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>
        <span>Announcements</span>
      </div>

      {isActive && (
        <div style={styles.form}>
          <textarea
            style={styles.textarea}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write an announcement to share with participants..."
            maxLength={MAX_MESSAGE_LENGTH + 100}
          />
          <div style={getCharCountStyle()}>
            {message.length} / {MAX_MESSAGE_LENGTH}
          </div>
          <div style={styles.buttonRow}>
            <button
              style={{
                ...styles.buttonPrimary,
                ...(sending || !message.trim() || message.length > MAX_MESSAGE_LENGTH
                  ? styles.buttonDisabled
                  : {}),
              }}
              onClick={handleSend}
              disabled={sending || !message.trim() || message.length > MAX_MESSAGE_LENGTH}
            >
              {sending ? 'Sending...' : 'Send Announcement'}
            </button>
          </div>
          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}
        </div>
      )}

      {!isActive && (
        <div style={styles.noData}>
          Announcements can only be sent for active conversations.
        </div>
      )}

      {announcements.length > 0 && (
        <div style={styles.announcementList}>
          <div style={{ ...styles.title, marginTop: isActive ? spacing[4] : 0 }}>
            Past Announcements
          </div>
          {announcements.map((announcement) => (
            <div key={announcement.id} style={styles.announcementItem}>
              <div style={styles.announcementMessage}>
                {announcement.message}
              </div>
              <div style={styles.announcementMeta}>
                <span>
                  {announcement.sent_at
                    ? formatDate(announcement.sent_at)
                    : formatDate(announcement.created_at)}
                </span>
                <span>Sent to {announcement.recipients_count} participant(s)</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {announcements.length === 0 && isActive && (
        <div style={styles.noData}>
          No announcements yet. Use the form above to send one.
        </div>
      )}
    </div>
  );
}

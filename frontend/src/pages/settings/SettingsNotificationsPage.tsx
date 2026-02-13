import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { typography, spacing, borders } from '../../styles';
import type { EmailPreferences } from '../../types';

const styles = {
  card: {
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  cardDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[6],
  },
  errorMessage: {
    backgroundColor: 'var(--color-error-light)',
    border: '1px solid var(--color-error)',
    color: 'var(--color-error-text)',
    padding: spacing[3],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  preferenceGroup: {
    marginBottom: spacing[4],
  },
  preferenceGroupTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-800)',
    marginBottom: spacing[3],
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  preferenceItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: spacing[3],
    padding: `${spacing[3]} 0`,
    borderBottom: '1px solid var(--color-primary-100)',
  },
  preferenceItemLast: {
    borderBottom: 'none',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    marginTop: '2px',
    accentColor: 'var(--color-primary-900)',
    cursor: 'pointer',
  },
  preferenceContent: {
    flex: 1,
  },
  preferenceName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[1],
  },
  preferenceDescription: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-600)',
    lineHeight: '1.4',
  },
  loadingText: {
    color: 'var(--color-primary-600)',
    fontSize: typography.fontSize.sm,
  },
};

// Email preference definitions with descriptions
const EMAIL_PREFERENCE_ITEMS: Array<{
  key: keyof EmailPreferences;
  name: string;
  description: string;
  group: string;
}> = [
  {
    key: 'conversation_invitations',
    name: 'Conversation Invitations',
    description: 'When someone invites you to participate in a conversation',
    group: 'Invitations',
  },
  {
    key: 'organization_invitations',
    name: 'Organization Invitations',
    description: 'When someone invites you to join an organization',
    group: 'Invitations',
  },
  {
    key: 'closing_reminders',
    name: 'Closing Reminders',
    description: "Reminder when a conversation you're invited to is about to close",
    group: 'Reminders',
  },
  {
    key: 'conversation_closed',
    name: 'Conversation Closed',
    description: 'Notification when a conversation you participated in has closed',
    group: 'Results',
  },
  {
    key: 'analysis_ready',
    name: 'Analysis Ready',
    description: 'When analysis results are available for a conversation',
    group: 'Results',
  },
  {
    key: 'periodic_analysis',
    name: 'Periodic Analysis',
    description: 'New insights from continuous feedback conversations',
    group: 'Results',
  },
  {
    key: 'recurring_instances',
    name: 'Recurring Conversations',
    description: 'When a new round of a recurring conversation starts',
    group: 'Updates',
  },
];

export default function SettingsNotificationsPage() {
  const [emailPrefs, setEmailPrefs] = useState<EmailPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefsData = await api.getEmailPreferences();
      setEmailPrefs(prefsData);
    } catch (err: any) {
      setError('Failed to load email preferences');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = async (key: keyof EmailPreferences, value: boolean) => {
    if (!emailPrefs) return;

    const newPrefs = { ...emailPrefs, [key]: value };
    setEmailPrefs(newPrefs);

    setSavingPrefs(true);
    setError('');
    try {
      await api.updateEmailPreferences(newPrefs);
    } catch (err: any) {
      // Revert on error
      setEmailPrefs(emailPrefs);
      setError('Failed to save email preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  // Group preferences by category
  const groupedPrefs = EMAIL_PREFERENCE_ITEMS.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof EMAIL_PREFERENCE_ITEMS>);

  if (loading) {
    return <p style={styles.loadingText}>Loading preferences...</p>;
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>Email Notifications</h2>
      <p style={styles.cardDescription}>
        Choose which emails you'd like to receive from Mosaic.
      </p>

      {error && <div style={styles.errorMessage}>{error}</div>}

      {emailPrefs && Object.entries(groupedPrefs).map(([group, items]) => (
        <div key={group} style={styles.preferenceGroup}>
          <div style={styles.preferenceGroupTitle}>{group}</div>
          {items.map((item, idx) => (
            <div
              key={item.key}
              style={{
                ...styles.preferenceItem,
                ...(idx === items.length - 1 ? styles.preferenceItemLast : {}),
              }}
            >
              <input
                type="checkbox"
                id={`pref-${item.key}`}
                checked={emailPrefs[item.key]}
                onChange={(e) => handlePreferenceChange(item.key, e.target.checked)}
                style={styles.checkbox}
                disabled={savingPrefs}
              />
              <label htmlFor={`pref-${item.key}`} style={styles.preferenceContent}>
                <div style={styles.preferenceName}>{item.name}</div>
                <div style={styles.preferenceDescription}>{item.description}</div>
              </label>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

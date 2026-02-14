import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { SlackChannel, SlackWorkspaceStatus } from '../types';
import { colors, spacing, typography, borders } from '../styles/tokens';
import { SkeletonText } from './Skeleton';
import CustomSelect from './CustomSelect';

interface SlackChannelNotificationsCardProps {
  organizationId: string;
  channelId?: string;
  channelName?: string;
  notifyOnActivate: boolean;
  notifyOnClose: boolean;
  notifyOnAnalysis: boolean;
  onChange: (settings: {
    slack_channel_id?: string;
    slack_channel_name?: string;
    slack_notify_on_activate: boolean;
    slack_notify_on_close: boolean;
    slack_notify_on_analysis: boolean;
  }) => void;
  disabled?: boolean;
}

export function SlackChannelNotificationsCard({
  organizationId,
  channelId,
  channelName,
  notifyOnActivate,
  notifyOnClose,
  notifyOnAnalysis,
  onChange,
  disabled = false,
}: SlackChannelNotificationsCardProps) {
  const [slackStatus, setSlackStatus] = useState<SlackWorkspaceStatus | null>(null);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSlackStatus();
  }, [organizationId]);

  useEffect(() => {
    if (slackStatus?.connected) {
      loadChannels();
    }
  }, [slackStatus?.connected, organizationId]);

  const loadSlackStatus = async () => {
    try {
      setLoadingStatus(true);
      const data = await api.getSlackStatus(organizationId);
      setSlackStatus(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load Slack status:', err);
      setSlackStatus({ connected: false });
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadChannels = async () => {
    try {
      setLoadingChannels(true);
      setError(null);
      const data = await api.listSlackChannels(organizationId);
      setChannels(data.channels);
    } catch (err: any) {
      console.error('Failed to load Slack channels:', err);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('Failed to load Slack channels');
      }
    } finally {
      setLoadingChannels(false);
    }
  };

  const handleChannelChange = (value: string | number) => {
    const selectedId = String(value);
    if (!selectedId || selectedId === 'none') {
      onChange({
        slack_channel_id: undefined,
        slack_channel_name: undefined,
        slack_notify_on_activate: false,
        slack_notify_on_close: false,
        slack_notify_on_analysis: false,
      });
    } else {
      const channel = channels.find(c => c.id === selectedId);
      onChange({
        slack_channel_id: selectedId,
        slack_channel_name: channel ? `${channel.is_private ? '' : '#'}${channel.name}` : undefined,
        slack_notify_on_activate: notifyOnActivate,
        slack_notify_on_close: notifyOnClose,
        slack_notify_on_analysis: notifyOnAnalysis,
      });
    }
  };

  const handleToggle = (field: 'slack_notify_on_activate' | 'slack_notify_on_close' | 'slack_notify_on_analysis', value: boolean) => {
    onChange({
      slack_channel_id: channelId,
      slack_channel_name: channelName,
      slack_notify_on_activate: field === 'slack_notify_on_activate' ? value : notifyOnActivate,
      slack_notify_on_close: field === 'slack_notify_on_close' ? value : notifyOnClose,
      slack_notify_on_analysis: field === 'slack_notify_on_analysis' ? value : notifyOnAnalysis,
    });
  };

  // Build options for CustomSelect
  const channelOptions = [
    { value: 'none', label: 'None (disabled)' },
    ...channels.map(ch => ({
      value: ch.id,
      label: `${ch.is_private ? '' : '#'}${ch.name}`,
    })),
  ];

  const styles: Record<string, React.CSSProperties> = {
    card: {
      backgroundColor: colors.primary[50],
      borderRadius: borders.radius.lg,
      border: `1px solid ${colors.primary[200]}`,
      padding: spacing[5],
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing[3],
      marginBottom: spacing[3],
    },
    slackLogo: {
      width: '24px',
      height: '24px',
    },
    title: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      color: colors.primary[900],
      margin: 0,
    },
    description: {
      fontSize: typography.fontSize.sm,
      color: colors.primary[600],
      marginBottom: spacing[4],
      lineHeight: typography.lineHeight.relaxed,
    },
    notConnectedMessage: {
      fontSize: typography.fontSize.sm,
      color: colors.primary[500],
      fontStyle: 'italic',
    },
    formGroup: {
      marginBottom: spacing[4],
    },
    label: {
      display: 'block',
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.primary[700],
      marginBottom: spacing[2],
    },
    checkboxGroup: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: spacing[3],
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing[2],
      fontSize: typography.fontSize.sm,
      color: colors.primary[700],
      cursor: disabled ? 'not-allowed' : 'pointer',
    },
    checkbox: {
      width: '16px',
      height: '16px',
      cursor: disabled ? 'not-allowed' : 'pointer',
    },
    error: {
      marginTop: spacing[3],
      padding: spacing[3],
      backgroundColor: colors.semantic.error.light,
      color: colors.semantic.error.text,
      borderRadius: borders.radius.md,
      fontSize: typography.fontSize.sm,
    },
    helpText: {
      fontSize: typography.fontSize.xs,
      color: colors.primary[500],
      marginTop: spacing[1],
    },
    loadingText: {
      fontSize: typography.fontSize.sm,
      color: colors.primary[500],
      fontStyle: 'italic',
    },
  };

  if (loadingStatus) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <SlackIcon size={24} />
          <h4 style={styles.title}>Channel Notifications</h4>
        </div>
        <SkeletonText lines={2} lineHeight="1rem" />
      </div>
    );
  }

  if (!slackStatus?.connected) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <SlackIcon size={24} />
          <h4 style={styles.title}>Channel Notifications</h4>
        </div>
        <p style={styles.notConnectedMessage}>
          Connect Slack in organization settings to post updates to channels.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <SlackIcon size={24} />
        <h4 style={styles.title}>Channel Notifications</h4>
      </div>

      <p style={styles.description}>
        Post updates to a Slack channel when this conversation is activated, closed, or analyzed.
      </p>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.formGroup}>
        <label style={styles.label}>Post to channel</label>
        {loadingChannels ? (
          <p style={styles.loadingText}>Loading channels...</p>
        ) : (
          <CustomSelect
            value={channelId || 'none'}
            options={channelOptions}
            onChange={handleChannelChange}
            placeholder="Select a channel..."
            minWidth="100%"
            searchable
            searchPlaceholder="Search channels..."
          />
        )}
        {channelId && channelName && (
          <p style={styles.helpText}>
            Updates will be posted to {channelName}
          </p>
        )}
      </div>

      {channelId && (
        <div style={styles.checkboxGroup}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={notifyOnActivate}
              onChange={(e) => handleToggle('slack_notify_on_activate', e.target.checked)}
              disabled={disabled}
              style={styles.checkbox}
            />
            When conversation is activated
          </label>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={notifyOnClose}
              onChange={(e) => handleToggle('slack_notify_on_close', e.target.checked)}
              disabled={disabled}
              style={styles.checkbox}
            />
            When conversation is closed
          </label>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={notifyOnAnalysis}
              onChange={(e) => handleToggle('slack_notify_on_analysis', e.target.checked)}
              disabled={disabled}
              style={styles.checkbox}
            />
            When analysis is complete
          </label>
        </div>
      )}
    </div>
  );
}

function SlackIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 127 127"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2S.8 87.3.8 80s5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2s13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2s-13.2-5.9-13.2-13.2V80z"
        fill="#E01E5A"
      />
      <path
        d="M47 27c-7.3 0-13.2-5.9-13.2-13.2S39.7.6 47 .6s13.2 5.9 13.2 13.2V27H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2s-5.9 13.2-13.2 13.2H14c-7.3 0-13.2-5.9-13.2-13.2S6.7 33.7 14 33.7h33z"
        fill="#36C5F0"
      />
      <path
        d="M99.9 46.9c0-7.3 5.9-13.2 13.2-13.2s13.2 5.9 13.2 13.2-5.9 13.2-13.2 13.2H99.9V46.9zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2s-13.2-5.9-13.2-13.2V14c0-7.3 5.9-13.2 13.2-13.2s13.2 5.9 13.2 13.2v32.9z"
        fill="#2EB67D"
      />
      <path
        d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2s-5.9 13.2-13.2 13.2-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2s5.9-13.2 13.2-13.2h33c7.3 0 13.2 5.9 13.2 13.2s-5.9 13.2-13.2 13.2h-33z"
        fill="#ECB22E"
      />
    </svg>
  );
}

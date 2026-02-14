import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { SlackWorkspaceStatus } from '../types';
import { colors, spacing, typography, borders } from '../styles/tokens';
import { SkeletonText } from './Skeleton';

interface SlackIntegrationCardProps {
  organizationId: string;
  isAdmin: boolean;
}

export function SlackIntegrationCard({ organizationId, isAdmin }: SlackIntegrationCardProps) {
  const [status, setStatus] = useState<SlackWorkspaceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);

  useEffect(() => {
    loadStatus();
  }, [organizationId]);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const data = await api.getSlackStatus(organizationId);
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load Slack status:', err);
      setError('Failed to load Slack status');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      const { redirect_url } = await api.initiateSlackInstall(organizationId);
      window.location.href = redirect_url;
    } catch (err: any) {
      console.error('Failed to initiate Slack connection:', err);
      setError(err.response?.data?.detail || 'Failed to connect to Slack');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      setError(null);
      await api.disconnectSlack(organizationId);
      setStatus({ connected: false });
      setShowDisconnectModal(false);
    } catch (err: any) {
      console.error('Failed to disconnect Slack:', err);
      setError(err.response?.data?.detail || 'Failed to disconnect Slack');
    } finally {
      setDisconnecting(false);
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    card: {
      backgroundColor: colors.primary[50],
      borderRadius: borders.radius.lg,
      border: `1px solid ${colors.primary[300]}`,
      padding: spacing[6],
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing[3],
      marginBottom: spacing[4],
    },
    slackLogo: {
      width: '32px',
      height: '32px',
    },
    title: {
      fontSize: typography.fontSize.lg,
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
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: spacing[2],
      padding: `${spacing[1]} ${spacing[3]}`,
      borderRadius: borders.radius.full,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
    },
    connectedBadge: {
      backgroundColor: colors.semantic.success.light,
      color: colors.semantic.success.text,
    },
    disconnectedBadge: {
      backgroundColor: colors.primary[200],
      color: colors.primary[600],
    },
    workspaceInfo: {
      marginTop: spacing[4],
      padding: spacing[4],
      backgroundColor: colors.primary[100],
      borderRadius: borders.radius.md,
    },
    workspaceName: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      color: colors.primary[900],
      marginBottom: spacing[1],
    },
    workspaceMeta: {
      fontSize: typography.fontSize.sm,
      color: colors.primary[600],
    },
    button: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      padding: `${spacing[2]} ${spacing[4]}`,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      borderRadius: borders.radius.md,
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    connectButton: {
      backgroundColor: colors.primary[900],
      color: colors.primary[50],
    },
    disconnectButton: {
      backgroundColor: colors.primary[50],
      color: colors.semantic.error.main,
      border: `1px solid ${colors.semantic.error.main}`,
    },
    disabledButton: {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
    error: {
      marginTop: spacing[3],
      padding: spacing[3],
      backgroundColor: colors.semantic.error.light,
      color: colors.semantic.error.text,
      borderRadius: borders.radius.md,
      fontSize: typography.fontSize.sm,
    },
    actions: {
      marginTop: spacing[4],
      display: 'flex',
      gap: spacing[3],
    },
    modalOverlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modal: {
      backgroundColor: colors.primary[50],
      borderRadius: borders.radius.lg,
      padding: spacing[6],
      maxWidth: '400px',
      width: '90%',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    },
    modalTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.primary[900],
      marginBottom: spacing[3],
    },
    modalText: {
      fontSize: typography.fontSize.sm,
      color: colors.primary[600],
      marginBottom: spacing[5],
      lineHeight: typography.lineHeight.relaxed,
    },
    modalActions: {
      display: 'flex',
      gap: spacing[3],
      justifyContent: 'flex-end',
    },
    cancelButton: {
      backgroundColor: colors.primary[50],
      color: colors.primary[700],
      border: `1px solid ${colors.primary[300]}`,
    },
  };

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <SlackIcon />
          <h3 style={styles.title}>Slack</h3>
        </div>
        <SkeletonText lines={2} lineHeight="1rem" />
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <SlackIcon />
        <h3 style={styles.title}>Slack</h3>
        <span
          style={{
            ...styles.statusBadge,
            ...(status?.connected ? styles.connectedBadge : styles.disconnectedBadge),
          }}
        >
          {status?.connected ? 'Connected' : 'Not Connected'}
        </span>
      </div>

      <p style={styles.description}>
        Connect Slack to send notifications when users are added to conversations
        or when conversations are about to close.
      </p>

      {status?.connected && (
        <div style={styles.workspaceInfo}>
          <div style={styles.workspaceName}>{status.slack_team_name}</div>
          <div style={styles.workspaceMeta}>
            Connected {status.installed_at ? new Date(status.installed_at).toLocaleDateString() : ''}
            {status.installed_by_name && ` by ${status.installed_by_name}`}
          </div>
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      {isAdmin && (
        <div style={styles.actions}>
          {!status?.connected ? (
            <button
              onClick={handleConnect}
              disabled={connecting}
              style={{
                ...styles.button,
                ...styles.connectButton,
                ...(connecting ? styles.disabledButton : {}),
              }}
            >
              {connecting ? 'Connecting...' : 'Connect Slack'}
            </button>
          ) : (
            <button
              onClick={() => setShowDisconnectModal(true)}
              style={{
                ...styles.button,
                ...styles.disconnectButton,
              }}
            >
              Disconnect
            </button>
          )}
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {showDisconnectModal && (
        <div style={styles.modalOverlay} onClick={() => setShowDisconnectModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Disconnect Slack</h3>
            <p style={styles.modalText}>
              Are you sure you want to disconnect Slack? Users will no longer receive Slack notifications.
            </p>
            <div style={styles.modalActions}>
              <button
                onClick={() => setShowDisconnectModal(false)}
                style={{
                  ...styles.button,
                  ...styles.cancelButton,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                style={{
                  ...styles.button,
                  ...styles.disconnectButton,
                  ...(disconnecting ? styles.disabledButton : {}),
                }}
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SlackIcon() {
  return (
    <svg
      width="32"
      height="32"
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

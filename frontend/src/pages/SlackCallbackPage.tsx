import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { colors, spacing, typography, borders } from '../styles/tokens';

export function SlackCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const workspace = searchParams.get('workspace');
    const orgId = searchParams.get('org_id');
    const type = searchParams.get('type');

    if (success === 'true') {
      setStatus('success');
      if (type === 'user') {
        setMessage('Your Slack account has been linked successfully.');
      } else {
        setMessage(`Successfully connected to ${workspace || 'Slack workspace'}.`);
      }

      // Redirect after a delay
      setTimeout(() => {
        if (orgId) {
          navigate(`/organizations/${orgId}/settings`);
        } else {
          navigate('/dashboard');
        }
      }, 2000);
    } else if (error) {
      setStatus('error');
      setMessage(getErrorMessage(error));
    } else {
      // No params, redirect to dashboard
      navigate('/dashboard');
    }
  }, [searchParams, navigate]);

  const getErrorMessage = (error: string): string => {
    switch (error) {
      case 'oauth_error':
        return 'Slack authorization was denied or failed. Please try again.';
      case 'missing_params':
        return 'Missing authorization parameters. Please try again.';
      case 'invalid_state':
        return 'Invalid authorization state. Please try again.';
      case 'token_exchange_failed':
        return 'Failed to complete authorization with Slack. Please try again.';
      case 'workspace_already_connected':
        return 'This Slack workspace is already connected to another organization.';
      case 'storage_failed':
        return 'Failed to save the connection. Please try again.';
      default:
        return `An error occurred: ${error}`;
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - var(--header-height))',
      padding: spacing[8],
    },
    card: {
      backgroundColor: colors.primary[50],
      borderRadius: borders.radius.lg,
      border: `1px solid ${colors.primary[300]}`,
      padding: spacing[8],
      maxWidth: '400px',
      width: '100%',
      textAlign: 'center' as const,
    },
    icon: {
      marginBottom: spacing[4],
    },
    title: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.semibold,
      color: colors.primary[900],
      marginBottom: spacing[2],
    },
    message: {
      fontSize: typography.fontSize.base,
      color: colors.primary[600],
      marginBottom: spacing[4],
      lineHeight: typography.lineHeight.relaxed,
    },
    loadingSpinner: {
      width: '48px',
      height: '48px',
      border: `4px solid ${colors.primary[200]}`,
      borderTop: `4px solid ${colors.primary[900]}`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      margin: '0 auto',
    },
    successIcon: {
      width: '64px',
      height: '64px',
      color: colors.semantic.success.main,
      margin: '0 auto',
    },
    errorIcon: {
      width: '64px',
      height: '64px',
      color: colors.semantic.error.main,
      margin: '0 auto',
    },
    button: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: `${spacing[3]} ${spacing[6]}`,
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      borderRadius: borders.radius.md,
      border: 'none',
      backgroundColor: colors.primary[900],
      color: colors.primary[50],
      cursor: 'pointer',
      marginTop: spacing[4],
    },
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={styles.card}>
        <div style={styles.icon}>
          {status === 'loading' && <div style={styles.loadingSpinner} />}
          {status === 'success' && (
            <svg style={styles.successIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {status === 'error' && (
            <svg style={styles.errorIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          )}
        </div>

        <h1 style={styles.title}>
          {status === 'loading' && 'Connecting to Slack...'}
          {status === 'success' && 'Connected!'}
          {status === 'error' && 'Connection Failed'}
        </h1>

        <p style={styles.message}>{message || 'Please wait...'}</p>

        {status === 'error' && (
          <button
            style={styles.button}
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </button>
        )}
      </div>
    </div>
  );
}

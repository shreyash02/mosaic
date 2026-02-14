import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { colors, typography, spacing } from '../styles/tokens';

const s = {
  banner: {
    backgroundColor: colors.semantic.warning.light,
    borderBottom: `1px solid ${colors.semantic.warning.main}`,
    padding: `${spacing[3]} ${spacing[6]}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    flexWrap: 'wrap' as const,
  },
  message: {
    fontSize: typography.fontSize.sm,
    color: colors.semantic.warning.text,
    margin: 0,
  },
  button: {
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    backgroundColor: colors.semantic.warning.main,
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  successMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.semantic.success.text,
    margin: 0,
  },
  dismissButton: {
    padding: spacing[1],
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: colors.semantic.warning.text,
    fontSize: typography.fontSize.lg,
    lineHeight: 1,
    opacity: 0.7,
  },
};

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Don't show if user is verified, not logged in, or banner was dismissed
  if (!user || user.email_verified || dismissed) {
    return null;
  }

  const handleResend = async () => {
    setSending(true);
    setError(null);
    try {
      await api.resendVerificationEmail(user.email);
      setSent(true);
    } catch (err) {
      setError('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div style={s.banner}>
        <p style={s.successMessage}>
          Verification email sent! Check your inbox.
        </p>
        <button
          onClick={() => setDismissed(true)}
          style={s.dismissButton}
          title="Dismiss"
        >
          &times;
        </button>
      </div>
    );
  }

  return (
    <div style={s.banner}>
      <p style={s.message}>
        Please verify your email to send invitations.
      </p>
      <button
        onClick={handleResend}
        style={{
          ...s.button,
          ...(sending ? s.buttonDisabled : {}),
        }}
        disabled={sending}
      >
        {sending ? 'Sending...' : 'Resend Verification Email'}
      </button>
      {error && (
        <p style={{ ...s.message, color: colors.semantic.error.text }}>{error}</p>
      )}
      <button
        onClick={() => setDismissed(true)}
        style={s.dismissButton}
        title="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}

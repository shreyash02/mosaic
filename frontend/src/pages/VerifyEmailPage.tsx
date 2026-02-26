import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { usePageTitle } from '../hooks/usePageTitle';
import { colors, typography, spacing, borders } from '../styles/tokens';

const s = {
  container: {
    minHeight: 'calc(100vh - var(--header-height))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    backgroundColor: 'var(--color-primary-100)',
  },
  card: {
    maxWidth: '450px',
    width: '100%',
    padding: spacing[8],
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.xl,
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
    textAlign: 'center' as const,
  },
  icon: {
    width: '64px',
    height: '64px',
    margin: '0 auto',
    marginBottom: spacing[4],
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
  },
  iconSuccess: {
    backgroundColor: colors.semantic.success.light,
  },
  iconError: {
    backgroundColor: colors.semantic.error.light,
  },
  iconLoading: {
    backgroundColor: colors.primary[100],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  message: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[6],
    lineHeight: typography.lineHeight.relaxed,
  },
  button: {
    display: 'inline-block',
    padding: `${spacing[3]} ${spacing[6]}`,
    backgroundColor: colors.primary[900],
    color: colors.primary[50],
    borderRadius: borders.radius.lg,
    textDecoration: 'none',
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.fontSize.base,
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  },
  resendLink: {
    display: 'block',
    marginTop: spacing[4],
    fontSize: typography.fontSize.sm,
    color: colors.interactive.link,
    textDecoration: 'none',
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
  },
};

type VerificationState = 'loading' | 'success' | 'error' | 'expired';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<VerificationState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  usePageTitle('Verify Email');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMessage('No verification token provided.');
      return;
    }

    const verifyEmail = async () => {
      try {
        await api.verifyEmail(token);
        setState('success');
      } catch (err: unknown) {
        const error = err as { response?: { data?: { detail?: string } } };
        const detail = error.response?.data?.detail || 'Verification failed';
        if (detail.toLowerCase().includes('expired')) {
          setState('expired');
        } else {
          setState('error');
        }
        setErrorMessage(detail);
      }
    };

    verifyEmail();
  }, [token]);

  if (state === 'loading') {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <div style={{ ...s.icon, ...s.iconLoading }}>
            <span>...</span>
          </div>
          <h1 style={s.title}>Verifying your email...</h1>
          <p style={s.message}>Please wait while we verify your email address.</p>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <div style={{ ...s.icon, ...s.iconSuccess }}>
            <span>&#10003;</span>
          </div>
          <h1 style={s.title}>Email Verified!</h1>
          <p style={s.message}>
            Your email has been verified successfully. You can now send invitations to your conversations.
          </p>
          <Link to="/dashboard" style={s.button}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (state === 'expired') {
    return (
      <div style={s.container}>
        <div style={s.card}>
          <div style={{ ...s.icon, ...s.iconError }}>
            <span>!</span>
          </div>
          <h1 style={s.title}>Link Expired</h1>
          <p style={s.message}>
            This verification link has expired. Please log in and request a new one from your dashboard.
          </p>
          <Link to="/login" style={s.button}>
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={{ ...s.icon, ...s.iconError }}>
          <span>&#10005;</span>
        </div>
        <h1 style={s.title}>Verification Failed</h1>
        <p style={s.message}>{errorMessage}</p>
        <Link to="/login" style={s.button}>
          Go to Login
        </Link>
      </div>
    </div>
  );
}

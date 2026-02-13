import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { usePageTitle } from '../hooks/usePageTitle';
import { typography, spacing, borders, shadows, transitions } from '../styles';

const styles = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--color-primary-50)',
    padding: spacing[4],
  },
  container: {
    backgroundColor: 'var(--color-primary-50)',
    padding: spacing[10],
    borderRadius: borders.radius.lg,
    boxShadow: shadows.lg,
    width: '100%',
    maxWidth: '400px',
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    textAlign: 'center' as const,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    textAlign: 'center' as const,
    marginBottom: spacing[6],
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[4],
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[2],
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
  },
  input: {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.base,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    transition: transitions.duration.normal,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  button: {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    border: 'none',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    transition: transitions.duration.normal,
    marginTop: spacing[2],
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  link: {
    textAlign: 'center' as const,
    marginTop: spacing[6],
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
  linkAnchor: {
    color: 'var(--color-primary-900)',
    fontWeight: typography.fontWeight.medium,
    textDecoration: 'none',
  },
  errorMessage: {
    backgroundColor: 'var(--color-error-light, #fef2f2)',
    border: '1px solid var(--color-error)',
    color: 'var(--color-error)',
    padding: spacing[3],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  successIcon: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    marginTop: spacing[1],
  },
};

const hoverStyles = `
  .reset-input:focus {
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 3px var(--color-primary-100);
  }
  .reset-button:hover:not(:disabled) {
    background-color: var(--color-primary-800);
  }
  .reset-link:hover {
    text-decoration: underline;
  }
`;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  usePageTitle('Reset Password');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!token) {
      setError('Invalid reset link');
      return;
    }

    setLoading(true);

    try {
      await api.resetPassword(token, password);
      setSuccess(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to reset password. The link may have expired.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <h2 style={styles.title}>Invalid Link</h2>
            <p style={styles.subtitle}>
              This password reset link is invalid or has expired.
            </p>
            <p style={styles.link}>
              <Link to="/forgot-password" style={styles.linkAnchor} className="reset-link">
                Request a new reset link
              </Link>
            </p>
          </div>
        </div>
      </>
    );
  }

  if (success) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.successIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 style={styles.title}>Password reset</h2>
            <p style={styles.subtitle}>
              Your password has been successfully reset. Redirecting to login...
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.page}>
        <div style={styles.container}>
          <h2 style={styles.title}>Reset password</h2>
          <p style={styles.subtitle}>
            Enter your new password below.
          </p>

          {error && <div style={styles.errorMessage}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label htmlFor="password" style={styles.label}>New password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Enter new password"
                style={styles.input}
                className="reset-input"
                minLength={8}
              />
              <span style={styles.hint}>Must be at least 8 characters</span>
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="confirmPassword" style={styles.label}>Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Confirm new password"
                style={styles.input}
                className="reset-input"
              />
            </div>

            <button
              type="submit"
              style={{
                ...styles.button,
                ...(loading ? styles.buttonDisabled : {}),
              }}
              className="reset-button"
              disabled={loading}
            >
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>

          <p style={styles.link}>
            Remember your password?{' '}
            <Link to="/login" style={styles.linkAnchor} className="reset-link">
              Login
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

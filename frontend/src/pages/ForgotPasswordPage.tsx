import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  successMessage: {
    backgroundColor: 'var(--color-success-light)',
    border: '1px solid var(--color-success)',
    color: 'var(--color-success-text)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    textAlign: 'center' as const,
  },
  successIcon: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
};

const hoverStyles = `
  .forgot-input:focus {
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 3px var(--color-primary-100);
  }
  .forgot-button:hover:not(:disabled) {
    background-color: var(--color-primary-800);
  }
  .forgot-link:hover {
    text-decoration: underline;
  }
`;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  usePageTitle('Forgot Password');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      // API always returns success to prevent email enumeration
      // So this error would only be a network/server error
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            <h2 style={styles.title}>Check your email</h2>
            <p style={styles.subtitle}>
              If an account exists for {email}, you will receive a password reset link shortly.
            </p>
            <p style={styles.link}>
              <Link to="/login" style={styles.linkAnchor} className="forgot-link">
                Return to login
              </Link>
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
          <h2 style={styles.title}>Forgot password?</h2>
          <p style={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {error && <div style={styles.errorMessage}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label htmlFor="email" style={styles.label}>Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="your@email.com"
                style={styles.input}
                className="forgot-input"
              />
            </div>

            <button
              type="submit"
              style={{
                ...styles.button,
                ...(loading ? styles.buttonDisabled : {}),
              }}
              className="forgot-button"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>

          <p style={styles.link}>
            Remember your password?{' '}
            <Link to="/login" style={styles.linkAnchor} className="forgot-link">
              Login
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
    backgroundColor: 'white',
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
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    backgroundColor: 'white',
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
  divider: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center' as const,
    margin: `${spacing[6]} 0`,
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'var(--color-primary-200)',
  },
  dividerText: {
    padding: `0 ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
  },
  googleButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    padding: `${spacing[3]} ${spacing[4]}`,
    backgroundColor: 'white',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    transition: transitions.duration.normal,
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
  footerLinks: {
    textAlign: 'center' as const,
    marginTop: spacing[6],
    paddingTop: spacing[6],
    borderTop: `1px solid ${'var(--color-primary-200)'}`,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-500)',
  },
  footerLink: {
    color: 'var(--color-primary-600)',
    textDecoration: 'none',
  },
  footerSeparator: {
    margin: `0 ${spacing[3]}`,
    color: 'var(--color-primary-300)',
  },
  errorMessage: {
    backgroundColor: 'var(--color-primary-100)',
    border: `1px solid ${'var(--color-primary-300)'}`,
    color: 'var(--color-primary-900)',
    padding: spacing[3],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
};

const hoverStyles = `
  .login-input-new:focus {
    border-color: ${'var(--color-primary-500)'};
    box-shadow: 0 0 0 3px ${'var(--color-primary-100)'};
  }
  .login-button-new:hover:not(:disabled) {
    background-color: ${'var(--color-primary-800)'};
  }
  .login-google-new:hover:not(:disabled) {
    background-color: ${'var(--color-primary-50)'};
    border-color: ${'var(--color-primary-400)'};
  }
  .login-link-new:hover {
    text-decoration: underline;
  }
`;

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  usePageTitle('Login');

  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      setError('Google sign-in failed. Please try again.');
      navigate('/login', { replace: true });
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      const redirectTo = searchParams.get('redirect');
      navigate(redirectTo ? decodeURIComponent(redirectTo) : '/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const redirectTo = searchParams.get('redirect');
    window.location.href = api.getGoogleLoginUrl(redirectTo ? decodeURIComponent(redirectTo) : undefined);
  };

  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.page}>
        <div style={styles.container}>
          <h2 style={styles.title}>Login to Mosaic</h2>

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
                className="login-input-new"
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="password" style={styles.label}>Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                style={styles.input}
                className="login-input-new"
              />
            </div>

            <button
              type="submit"
              style={{
                ...styles.button,
                ...(loading ? styles.buttonDisabled : {}),
              }}
              className="login-button-new"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <div style={styles.dividerLine} />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            style={{
              ...styles.googleButton,
              ...(loading ? styles.buttonDisabled : {}),
            }}
            className="login-google-new"
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <p style={styles.link}>
            Don't have an account?{' '}
            <Link to="/register" style={styles.linkAnchor} className="login-link-new">
              Register here
            </Link>
          </p>

          <div style={styles.footerLinks}>
            <Link to="/terms" style={styles.footerLink} className="login-link-new">
              Terms of Service
            </Link>
            <span style={styles.footerSeparator}>•</span>
            <Link to="/privacy" style={styles.footerLink} className="login-link-new">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

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
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    transition: transitions.duration.normal,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    marginTop: spacing[1],
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
    backgroundColor: 'var(--color-primary-50)',
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
  .register-input-new:focus {
    border-color: ${'var(--color-primary-500)'};
    box-shadow: 0 0 0 3px ${'var(--color-primary-100)'};
  }
  .register-button-new:hover:not(:disabled) {
    background-color: ${'var(--color-primary-800)'};
  }
  .register-google-new:hover:not(:disabled) {
    background-color: ${'var(--color-primary-50)'};
    border-color: ${'var(--color-primary-400)'};
  }
  .register-link-new:hover {
    text-decoration: underline;
  }
`;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteRequired, setInviteRequired] = useState(false);
  const [checkingRequired, setCheckingRequired] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  usePageTitle('Register');

  // Check if invite codes are required
  useEffect(() => {
    const checkRequired = async () => {
      try {
        const result = await api.checkInviteCodeRequired();
        setInviteRequired(result.required);
      } catch {
        // If check fails, assume not required
      } finally {
        setCheckingRequired(false);
      }
    };
    checkRequired();
  }, []);

  // Pre-fill invite code from URL param and handle OAuth errors
  useEffect(() => {
    const codeParam = searchParams.get('invite_code');
    if (codeParam) {
      setInviteCode(codeParam);
    }

    const oauthError = searchParams.get('error');
    if (oauthError === 'invite_code_required') {
      setError('An invite code is required to register. Please enter your code and try again.');
    } else if (oauthError === 'invalid_invite_code') {
      setError('The invite code provided is invalid or has already been used.');
    } else if (oauthError) {
      setError('Google sign-in failed. Please try again.');
    }

    if (oauthError || codeParam) {
      // Clean URL params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('error');
      newParams.delete('invite_code');
      if (newParams.toString()) {
        navigate(`/register?${newParams.toString()}`, { replace: true });
      } else {
        navigate('/register', { replace: true });
      }
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (inviteRequired && !inviteCode.trim()) {
      setError('An invite code is required to register');
      return;
    }

    setLoading(true);

    try {
      await register({
        email,
        password,
        full_name: fullName,
        ...(inviteCode.trim() ? { invite_code: inviteCode.trim() } : {}),
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (inviteRequired && !inviteCode.trim()) {
      setError('Please enter your invite code before continuing with Google');
      return;
    }
    window.location.href = api.getGoogleLoginUrl(undefined, inviteCode.trim() || undefined);
  };

  // Invite code is valid when it's 8 hex characters
  const inviteCodeValid = /^[0-9A-F]{8}$/.test(inviteCode.trim());
  const showRegistrationFields = !inviteRequired || inviteCodeValid;

  if (checkingRequired) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <p style={{ textAlign: 'center', color: 'var(--color-primary-500)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.page}>
        <div style={styles.container}>
          <h2 style={styles.title}>Create Account</h2>

          {error && <div style={styles.errorMessage}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            {inviteRequired && (
              <div style={styles.formGroup}>
                <label htmlFor="inviteCode" style={{ ...styles.label, textAlign: 'center' as const }}>Invite Code</label>
                <input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  required
                  autoComplete="off"
                  placeholder="Enter your invite code"
                  maxLength={20}
                  style={{
                    ...styles.input,
                    fontWeight: typography.fontWeight.semibold,
                    letterSpacing: '0.1em',
                    textAlign: 'center' as const,
                  }}
                  className="register-input-new"
                />
                <span style={{ ...styles.hint, textAlign: 'center' as const }}>
                  Don't have a code?{' '}
                  <Link to="/request-access" style={{ color: 'var(--color-primary-700)', fontWeight: typography.fontWeight.medium }}>
                    Request access
                  </Link>
                </span>
              </div>
            )}

            {showRegistrationFields && (
              <>
                <div style={styles.formGroup}>
                  <label htmlFor="fullName" style={styles.label}>Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                    placeholder="John Doe"
                    style={styles.input}
                    className="register-input-new"
                  />
                </div>

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
                    className="register-input-new"
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
                    autoComplete="new-password"
                    placeholder="Create a password"
                    minLength={8}
                    style={styles.input}
                    className="register-input-new"
                  />
                  <span style={styles.hint}>Minimum 8 characters</span>
                </div>

                <button
                  type="submit"
                  style={{
                    ...styles.button,
                    ...(loading ? styles.buttonDisabled : {}),
                  }}
                  className="register-button-new"
                  disabled={loading}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </>
            )}
          </form>

          {showRegistrationFields && (
            <>
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
                className="register-google-new"
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
            </>
          )}

          <p style={styles.link}>
            Already have an account?{' '}
            <Link to="/login" style={styles.linkAnchor} className="register-link-new">
              Login here
            </Link>
          </p>

          <div style={styles.footerLinks}>
            <Link to="/terms" style={styles.footerLink} className="register-link-new">
              Terms of Service
            </Link>
            <span style={styles.footerSeparator}>•</span>
            <Link to="/privacy" style={styles.footerLink} className="register-link-new">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

import React, { useState } from 'react';
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
    color: 'var(--color-primary-500)',
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
  textarea: {
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
    resize: 'vertical' as const,
    minHeight: '80px',
    fontFamily: 'inherit',
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
    backgroundColor: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-300)',
    color: 'var(--color-primary-900)',
    padding: spacing[3],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  successContainer: {
    textAlign: 'center' as const,
  },
  successIcon: {
    fontSize: '48px',
    marginBottom: spacing[4],
  },
  successTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[3],
  },
  successText: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[6],
    lineHeight: 1.6,
  },
};

const hoverStyles = `
  .request-input:focus {
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 3px var(--color-primary-100);
  }
  .request-input:-webkit-autofill,
  .request-input:-webkit-autofill:hover,
  .request-input:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px var(--color-primary-50) inset !important;
    -webkit-text-fill-color: var(--color-primary-900) !important;
    border-color: var(--color-primary-300);
  }
  .request-button:hover:not(:disabled) {
    background-color: var(--color-primary-800);
  }
  .request-link:hover {
    text-decoration: underline;
  }
`;

export default function RequestAccessPage() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  usePageTitle('Request Access');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.submitWaitlistRequest({
        email,
        full_name: fullName || undefined,
        message: message || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.successContainer}>
              <div style={styles.successTitle}>Request Submitted</div>
              <p style={styles.successText}>
                Your request has been submitted. We'll review it and email you when you're approved.
              </p>
              <p style={styles.link}>
                <Link to="/login" style={styles.linkAnchor} className="request-link">
                  Back to Login
                </Link>
                <span style={{ margin: `0 ${spacing[3]}`, color: 'var(--color-primary-300)' }}>|</span>
                <Link to="/register" style={styles.linkAnchor} className="request-link">
                  Register
                </Link>
              </p>
            </div>
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
          <h2 style={styles.title}>Request Access</h2>
          <p style={styles.subtitle}>
            Mosaic is currently invite-only. Submit your request and we'll get back to you.
          </p>

          {error && <div style={styles.errorMessage}>{error}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label htmlFor="email" style={styles.label}>Email *</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="your@email.com"
                style={styles.input}
                className="request-input"
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="fullName" style={styles.label}>Full Name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                placeholder="John Doe"
                style={styles.input}
                className="request-input"
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="message" style={styles.label}>Why do you want access?</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us a bit about how you'd use Mosaic..."
                maxLength={1000}
                style={styles.textarea}
                className="request-input"
              />
              <span style={styles.hint}>{message.length}/1000 characters</span>
            </div>

            <button
              type="submit"
              style={{
                ...styles.button,
                ...(loading ? styles.buttonDisabled : {}),
              }}
              className="request-button"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>

          <p style={styles.link}>
            Already have an invite code?{' '}
            <Link to="/register" style={styles.linkAnchor} className="request-link">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

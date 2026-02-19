import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { typography, spacing, borders, shadows } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import { SkeletonPageLoading } from '../components/Skeleton';

const s = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: 'var(--color-primary-50)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  card: {
    maxWidth: '500px',
    width: '100%',
    backgroundColor: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[8],
    boxShadow: shadows.md,
    textAlign: 'center' as const,
  },
  icon: {
    fontSize: '2.5rem',
    marginBottom: spacing[4],
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[3],
  },
  titleError: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-error)',
    marginBottom: spacing[3],
  },
  titleSuccess: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-success-text)',
    marginBottom: spacing[3],
  },
  text: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[4],
  },
  actions: {
    display: 'flex',
    gap: spacing[3],
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    textDecoration: 'none',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[5]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-300)',
    textDecoration: 'none',
  },
};

export default function AcceptJournalSharePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  usePageTitle('Accept Journal Share');

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [journalId, setJournalId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(window.location.pathname);
      navigate(`/login?redirect=${returnUrl}`);
      return;
    }

    if (token && !processing && !journalId && !error) {
      acceptShare();
    }
  }, [isAuthenticated, authLoading, token]);

  const acceptShare = async () => {
    if (!token) {
      setError('Invalid invitation link.');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const result = await api.acceptJournalShare(token);
      setJournalId(result.journal_id);

      setTimeout(() => {
        navigate(`/journals/shared/${result.journal_id}`);
      }, 2000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      const detail = axiosErr?.response?.data?.detail || '';

      if (detail.includes('already accepted')) {
        setError('This invitation has already been accepted.');
      } else if (detail.includes('expired')) {
        setError('This invitation has expired. Please request a new one.');
      } else if (detail.includes('revoked')) {
        setError('This invitation has been revoked by the journal owner.');
      } else if (detail.includes('email')) {
        setError('This invitation was sent to a different email address. Please log in with the correct account.');
      } else if (detail.includes('not found') || detail.includes('Invalid')) {
        setError('Invalid invitation link. The invitation may have been deleted.');
      } else {
        setError(detail || 'Failed to accept invitation. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div style={s.page}>
        <SkeletonPageLoading />
      </div>
    );
  }

  if (processing) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.icon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <h1 style={s.title}>Accepting Invitation</h1>
          <p style={s.text}>
            Please wait while we set up your access...
          </p>
        </div>
      </div>
    );
  }

  if (journalId) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.icon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 style={s.titleSuccess}>Invitation Accepted</h1>
          <p style={s.text}>
            You now have access to this journal. Redirecting...
          </p>
          <div style={s.actions}>
            <Link to={`/journals/shared/${journalId}`} style={s.primaryButton}>
              View Journal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <div style={s.icon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 style={s.titleError}>Invitation Error</h1>
          <p style={s.text}>{error}</p>
          <div style={s.actions}>
            <Link to="/journals" style={s.primaryButton}>
              Go to Journals
            </Link>
            <Link to="/dashboard" style={s.secondaryButton}>
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h1 style={s.title}>Journal Invitation</h1>
        <p style={s.text}>Loading invitation...</p>
      </div>
    </div>
  );
}

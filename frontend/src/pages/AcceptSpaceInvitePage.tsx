import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { typography } from '../styles/tokens';
import { SkeletonPageLoading } from '../components/Skeleton';

export default function AcceptSpaceInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [spaceId, setSpaceId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(window.location.pathname);
      navigate(`/login?redirect=${returnUrl}`);
      return;
    }

    if (token && !processing && !spaceId) {
      acceptInvitation();
    }
  }, [isAuthenticated, authLoading, token]);

  const acceptInvitation = async () => {
    if (!token) {
      setError('Invalid invitation link');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const result = await api.acceptSpaceInvitation(token);
      setSpaceId(result.space_id);

      setTimeout(() => {
        navigate(`/spaces/${result.space_id}`);
      }, 2000);
    } catch (err: any) {
      console.error('Failed to accept invitation:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to accept invitation';

      if (errorMessage.includes('already accepted') || errorMessage.includes('already a member')) {
        setError('You are already a member of this space.');
      } else if (errorMessage.includes('expired')) {
        setError('This invitation has expired. Please request a new invitation.');
      } else if (errorMessage.includes('not found')) {
        setError('Invalid invitation link. The invitation may have been deleted.');
      } else if (errorMessage.includes('email')) {
        setError('This invitation was sent to a different email address. Please log in with the correct account.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="page-container">
        <SkeletonPageLoading />
      </div>
    );
  }

  if (processing) {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
          <div className="loading" style={{ minHeight: 'auto', marginBottom: '1rem' }}>
            Accepting invitation...
          </div>
          <p style={{ color: 'var(--color-primary-500)', margin: 0 }}>
            Please wait while we add you to the space
          </p>
        </div>
      </div>
    );
  }

  if (spaceId) {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: '1rem' }}>✓</div>
          <h1 style={{ marginBottom: '1rem', color: 'var(--color-success)' }}>Invitation Accepted!</h1>
          <p style={{ color: 'var(--color-primary-500)', marginBottom: '2rem', fontSize: typography.fontSize.base }}>
            You have successfully joined the space.
          </p>
          <p style={{ color: 'var(--color-primary-500)', fontSize: typography.fontSize.sm }}>
            Redirecting to space...
          </p>
          <Link to={`/spaces/${spaceId}`} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Go to Space
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: typography.fontSize['4xl'], marginBottom: '1rem', color: 'var(--color-error)' }}>✕</div>
          <h1 style={{ marginBottom: '1rem', color: 'var(--color-error)' }}>Invitation Error</h1>
          <div className="error-message" style={{ textAlign: 'left' }}>
            {error}
          </div>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/spaces" className="btn btn-primary">
              Go to Spaces
            </Link>
            <Link to="/dashboard" className="btn btn-secondary">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
        <h1>Space Invitation</h1>
        <p style={{ color: 'var(--color-primary-500)' }}>Loading invitation...</p>
      </div>
    </div>
  );
}

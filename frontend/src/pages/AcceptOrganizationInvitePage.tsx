import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { SkeletonPageLoading } from '../components/Skeleton';

export default function AcceptOrganizationInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;

    // If not authenticated, redirect to login with return URL
    if (!isAuthenticated) {
      const returnUrl = encodeURIComponent(window.location.pathname);
      navigate(`/login?redirect=${returnUrl}`);
      return;
    }

    // If authenticated and have token, accept invitation
    if (token && !processing && !organizationId) {
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
      const result = await api.acceptOrganizationInvitation(token);
      setOrganizationId(result.organization_id);

      // Redirect to organization page after short delay
      setTimeout(() => {
        navigate(`/organizations/${result.organization_id}`);
      }, 2000);
    } catch (err: any) {
      console.error('Failed to accept invitation:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to accept invitation';

      // Check for common error scenarios
      if (errorMessage.includes('already accepted') || errorMessage.includes('already a member')) {
        setError('You are already a member of this organization.');
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

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="page-container">
        <SkeletonPageLoading />
      </div>
    );
  }

  // Show processing state
  if (processing) {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
          <div className="loading" style={{ minHeight: 'auto', marginBottom: '1rem' }}>
            Accepting invitation...
          </div>
          <p style={{ color: 'var(--color-primary-500)', margin: 0 }}>
            Please wait while we add you to the organization
          </p>
        </div>
      </div>
    );
  }

  // Show success state
  if (organizationId) {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
          <h1 style={{ marginBottom: '1rem', color: 'var(--color-success)' }}>Invitation Accepted!</h1>
          <p style={{ color: 'var(--color-primary-500)', marginBottom: '2rem', fontSize: '1rem' }}>
            You have successfully joined the organization.
          </p>
          <p style={{ color: 'var(--color-primary-500)', fontSize: '0.9rem' }}>
            Redirecting to organization page...
          </p>
          <Link to={`/organizations/${organizationId}`} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Go to Organization
          </Link>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="page-container">
        <div className="card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--color-error)' }}>✕</div>
          <h1 style={{ marginBottom: '1rem', color: 'var(--color-error)' }}>Invitation Error</h1>
          <div className="error-message" style={{ textAlign: 'left' }}>
            {error}
          </div>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/organizations" className="btn btn-primary">
              Go to Organizations
            </Link>
            <Link to="/dashboard" className="btn btn-secondary">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Default state (shouldn't normally reach here)
  return (
    <div className="page-container">
      <div className="card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
        <h1>Organization Invitation</h1>
        <p style={{ color: 'var(--color-primary-500)' }}>Loading invitation...</p>
      </div>
    </div>
  );
}

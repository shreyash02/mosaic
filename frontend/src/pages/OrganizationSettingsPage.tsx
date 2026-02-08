import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { OrganizationWithMembers } from '../types';
import DesignToggle from '../components/DesignToggle';
import OrganizationSettingsPageNew from './OrganizationSettingsPageNew';

function OrganizationSettingsPageOld() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<OrganizationWithMembers | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    if (id) {
      loadOrganization();
    }
  }, [id]);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      setError('');

      const orgData = await api.getOrganization(id!);
      setOrganization(orgData);
      setName(orgData.name);
      setDescription(orgData.description || '');

      // Get current user role
      const currentUser = await api.getCurrentUser();
      const membership = orgData.members.find(m => m.user_id === currentUser.id);
      setIsCreator(orgData.created_by === currentUser.id);

      // Check if user is admin
      if (membership?.role !== 'admin' && orgData.created_by !== currentUser.id) {
        setError('You must be an admin to access organization settings');
        setTimeout(() => navigate(`/organizations/${id}`), 2000);
        return;
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Organization name is required');
      return;
    }

    setSaving(true);

    try {
      const updated = await api.updateOrganization(id!, {
        name: name.trim(),
        description: description.trim() || undefined,
      });

      setOrganization({ ...organization!, ...updated });
      setSuccess('Organization settings saved successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== organization?.name) {
      setError('Organization name does not match');
      return;
    }

    setDeleting(true);
    setError('');

    try {
      await api.deleteOrganization(id!);
      navigate('/organizations', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete organization');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading organization settings...</div>
      </div>
    );
  }

  if (error && !organization) {
    return (
      <div className="page-container">
        <div className="error-message">{error}</div>
        <Link to="/organizations" className="btn btn-secondary">
          Back to Organizations
        </Link>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="page-container">
        <div className="error-message">Organization not found</div>
        <Link to="/organizations" className="btn btn-secondary">
          Back to Organizations
        </Link>
      </div>
    );
  }

  return (
    <div className="create-conversation-page">
      <div className="page-header">
        <div>
          <Link to={`/organizations/${id}`} className="btn-back" style={{ marginBottom: '1rem', display: 'inline-block' }}>
            ← Back to Organization
          </Link>
          <h1>Organization Settings</h1>
          <p className="description">{organization.name}</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* General Settings */}
      <form onSubmit={handleSave} className="conversation-form" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>General Settings</h2>

        <div className="form-group">
          <label htmlFor="name">
            Organization Name <span style={{ color: '#e53e3e' }}>*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Product Team, Marketing Department"
            maxLength={100}
            required
          />
          <small>A clear, descriptive name for your organization</small>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description (Optional)</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this organization for?"
            rows={4}
            maxLength={500}
          />
          <small>Help members understand the organization's purpose</small>
        </div>

        <div className="form-actions" style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !name.trim()}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            to={`/organizations/${id}`}
            className="btn btn-secondary"
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* Danger Zone */}
      {isCreator && (
        <div className="conversation-form" style={{ borderColor: '#fc8181' }}>
          <h2 style={{ marginBottom: '1rem', color: '#9b2c2c' }}>Danger Zone</h2>
          <p style={{ color: '#718096', marginBottom: '1.5rem' }}>
            Once you delete an organization, there is no going back. Please be certain.
          </p>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn btn-danger"
            disabled={deleting}
          >
            Delete Organization
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem', color: '#9b2c2c' }}>Delete Organization</h2>
            <p style={{ marginBottom: '1.5rem', color: '#718096' }}>
              This action cannot be undone. This will permanently delete the <strong>{organization.name}</strong> organization
              and remove all member associations.
            </p>
            <p style={{ marginBottom: '1rem', color: '#718096' }}>
              Conversations in this organization will become personal conversations for their creators.
            </p>
            <p style={{ marginBottom: '1.5rem', fontWeight: 500 }}>
              Please type <strong>{organization.name}</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Organization name"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #cbd5e0',
                borderRadius: '6px',
                marginBottom: '1.5rem',
                fontSize: '0.9rem'
              }}
              disabled={deleting}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                  setError('');
                }}
                className="btn btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-danger"
                disabled={deleting || deleteConfirmText !== organization.name}
              >
                {deleting ? 'Deleting...' : 'Delete Organization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrganizationSettingsPage() {
  const [isNewDesign, setIsNewDesign] = useState(true);

  return (
    <>
      <DesignToggle
        isNewDesign={isNewDesign}
        onToggle={() => setIsNewDesign(!isNewDesign)}
      />
      {isNewDesign ? <OrganizationSettingsPageNew /> : <OrganizationSettingsPageOld />}
    </>
  );
}

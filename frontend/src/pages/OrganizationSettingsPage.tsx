import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { OrganizationWithMembers } from '../types';
import { colors, typography, spacing, borders, shadows, transitions } from '../styles';

const styles = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: colors.primary[50],
    padding: spacing[6],
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    color: colors.primary[600],
    textDecoration: 'none',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[4],
    transition: transitions.duration.normal,
  },
  header: {
    marginBottom: spacing[8],
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.primary[600],
    lineHeight: typography.lineHeight.relaxed,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    border: `1px solid ${colors.primary[200]}`,
    padding: spacing[8],
    boxShadow: shadows.sm,
    marginBottom: spacing[6],
  },
  cardDanger: {
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    border: `1px solid ${colors.primary[400]}`,
    padding: spacing[8],
    boxShadow: shadows.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginBottom: spacing[4],
  },
  sectionTitleDanger: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginBottom: spacing[3],
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[6],
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[2],
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[700],
  },
  required: {
    color: colors.primary[900],
    marginLeft: spacing[1],
  },
  input: {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.base,
    border: `1px solid ${colors.primary[300]}`,
    borderRadius: borders.radius.md,
    backgroundColor: 'white',
    color: colors.primary[900],
    transition: transitions.duration.normal,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.base,
    border: `1px solid ${colors.primary[300]}`,
    borderRadius: borders.radius.md,
    backgroundColor: 'white',
    color: colors.primary[900],
    transition: transitions.duration.normal,
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[500],
  },
  actions: {
    display: 'flex',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[3]} ${spacing[6]}`,
    backgroundColor: colors.primary[900],
    color: colors.primary[50],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
    textDecoration: 'none',
  },
  buttonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[3]} ${spacing[6]}`,
    backgroundColor: 'white',
    color: colors.primary[700],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: `1px solid ${colors.primary[300]}`,
    cursor: 'pointer',
    transition: transitions.duration.normal,
    textDecoration: 'none',
  },
  buttonDanger: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[3]} ${spacing[6]}`,
    backgroundColor: 'transparent',
    color: colors.semantic.error.main,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: `1px solid ${colors.semantic.error.main}`,
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  dangerText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[4],
  },
  error: {
    backgroundColor: colors.primary[100],
    border: `1px solid ${colors.primary[300]}`,
    color: colors.primary[900],
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  success: {
    backgroundColor: colors.primary[100],
    border: `1px solid ${colors.primary[400]}`,
    color: colors.primary[900],
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  loading: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: colors.primary[500],
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: spacing[4],
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
    maxWidth: '450px',
    width: '100%',
    boxShadow: shadows.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
    marginBottom: spacing[4],
  },
  modalText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[4],
  },
  modalConfirmText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[700],
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[3],
  },
  modalInput: {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.base,
    border: `1px solid ${colors.primary[300]}`,
    borderRadius: borders.radius.md,
    backgroundColor: 'white',
    color: colors.primary[900],
    marginBottom: spacing[6],
    boxSizing: 'border-box' as const,
  },
  modalActions: {
    display: 'flex',
    gap: spacing[3],
    justifyContent: 'flex-end',
  },
};

const hoverStyles = `
  .org-settings-back-link:hover {
    color: ${colors.primary[900]};
  }
  .org-settings-input:focus {
    border-color: ${colors.primary[500]};
    box-shadow: 0 0 0 3px ${colors.primary[100]};
  }
  .org-settings-btn-primary:hover:not(:disabled) {
    background-color: ${colors.primary[800]};
  }
  .org-settings-btn-secondary:hover:not(:disabled) {
    background-color: ${colors.primary[50]};
    border-color: ${colors.primary[400]};
  }
  .org-settings-btn-danger:hover:not(:disabled) {
    background-color: ${colors.primary[700]};
  }
`;

export default function OrganizationSettingsPage() {
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

      const currentUser = await api.getCurrentUser();
      const membership = orgData.members.find(m => m.user_id === currentUser.id);
      setIsCreator(orgData.created_by === currentUser.id);

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
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.loading}>Loading organization settings...</div>
          </div>
        </div>
      </>
    );
  }

  if (error && !organization) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.error}>{error}</div>
            <Link to="/organizations" style={styles.buttonSecondary} className="org-settings-btn-secondary">
              Back to Organizations
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (!organization) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.error}>Organization not found</div>
            <Link to="/organizations" style={styles.buttonSecondary} className="org-settings-btn-secondary">
              Back to Organizations
            </Link>
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
          <Link to={`/organizations/${id}`} style={styles.backLink} className="org-settings-back-link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 12L6 8L10 4" />
            </svg>
            Back to Organization
          </Link>

          <header style={styles.header}>
            <h1 style={styles.title}>Organization Settings</h1>
            <p style={styles.subtitle}>{organization.name}</p>
          </header>

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}

          {/* General Settings */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>General Settings</h2>
            <form onSubmit={handleSave} style={styles.form}>
              <div style={styles.formGroup}>
                <label htmlFor="name" style={styles.label}>
                  Organization Name<span style={styles.required}>*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Product Team, Marketing Department"
                  maxLength={100}
                  required
                  style={styles.input}
                  className="org-settings-input"
                />
                <span style={styles.hint}>A clear, descriptive name for your organization</span>
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="description" style={styles.label}>
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this organization for?"
                  rows={4}
                  maxLength={500}
                  style={styles.textarea}
                  className="org-settings-input"
                />
                <span style={styles.hint}>Help members understand the organization's purpose</span>
              </div>

              <div style={styles.actions}>
                <button
                  type="submit"
                  style={{
                    ...styles.buttonPrimary,
                    ...(saving || !name.trim() ? styles.buttonDisabled : {}),
                  }}
                  className="org-settings-btn-primary"
                  disabled={saving || !name.trim()}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <Link
                  to={`/organizations/${id}`}
                  style={styles.buttonSecondary}
                  className="org-settings-btn-secondary"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>

          {/* Danger Zone */}
          {isCreator && (
            <div style={styles.cardDanger}>
              <h2 style={styles.sectionTitleDanger}>Danger Zone</h2>
              <p style={styles.dangerText}>
                Once you delete an organization, there is no going back. Please be certain.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                style={{
                  ...styles.buttonSecondary,
                  ...(deleting ? styles.buttonDisabled : {}),
                }}
                className="org-settings-btn-secondary"
                disabled={deleting}
              >
                Delete Organization
              </button>
            </div>
          )}
        </div>

        {/* Delete Modal */}
        {showDeleteModal && (
          <div style={styles.modalOverlay} onClick={() => !deleting && setShowDeleteModal(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 style={styles.modalTitle}>Delete Organization</h2>
              <p style={styles.modalText}>
                This action cannot be undone. This will permanently delete the <strong>{organization.name}</strong> organization
                and remove all member associations.
              </p>
              <p style={styles.modalText}>
                Conversations in this organization will become personal conversations for their creators.
              </p>
              <p style={styles.modalConfirmText}>
                Please type <strong>{organization.name}</strong> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Organization name"
                style={styles.modalInput}
                className="org-settings-input"
                disabled={deleting}
              />
              <div style={styles.modalActions}>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmText('');
                    setError('');
                  }}
                  style={{
                    ...styles.buttonSecondary,
                    ...(deleting ? styles.buttonDisabled : {}),
                  }}
                  className="org-settings-btn-secondary"
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    ...styles.buttonPrimary,
                    ...(deleting || deleteConfirmText !== organization.name ? styles.buttonDisabled : {}),
                  }}
                  className="org-settings-btn-primary"
                  disabled={deleting || deleteConfirmText !== organization.name}
                >
                  {deleting ? 'Deleting...' : 'Delete Organization'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { OrganizationWithMembers } from '../types';
import { typography, spacing, borders, shadows, transitions } from '../styles';

const styles = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: 'var(--color-primary-50)',
    padding: spacing[6],
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
  },
  logoPreview: {
    width: '80px',
    height: '80px',
    objectFit: 'contain' as const,
    border: `1px solid ${'var(--color-primary-200)'}`,
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-100)',
  },
  logoPlaceholder: {
    width: '80px',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px dashed ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-400)',
    fontSize: typography.fontSize.xs,
  },
  logoUploadRow: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[4],
  },
  logoActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[2],
  },
  uploadButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-300)'}`,
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  removeButton: {
    padding: `${spacing[1]} ${spacing[3]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.xs,
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    color: 'var(--color-primary-600)',
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
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
  },
  card: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: `1px solid ${'var(--color-primary-200)'}`,
    padding: spacing[8],
    boxShadow: shadows.sm,
    marginBottom: spacing[6],
  },
  cardDanger: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: `1px solid ${'var(--color-primary-400)'}`,
    padding: spacing[8],
    boxShadow: shadows.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
  },
  sectionTitleDanger: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
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
    color: 'var(--color-primary-700)',
  },
  required: {
    color: 'var(--color-primary-900)',
    marginLeft: spacing[1],
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
  textarea: {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.base,
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    transition: transitions.duration.normal,
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
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
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
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
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-300)'}`,
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
    color: 'var(--color-error)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-error)'}`,
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  dangerText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[4],
  },
  error: {
    backgroundColor: 'var(--color-primary-100)',
    border: `1px solid ${'var(--color-primary-300)'}`,
    color: 'var(--color-primary-900)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  success: {
    backgroundColor: 'var(--color-primary-100)',
    border: `1px solid ${'var(--color-primary-400)'}`,
    color: 'var(--color-primary-900)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  loading: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: 'var(--color-primary-500)',
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
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
    maxWidth: '450px',
    width: '100%',
    boxShadow: shadows.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
  },
  modalText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[4],
  },
  modalConfirmText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[3],
  },
  modalInput: {
    width: '100%',
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.base,
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
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
    color: ${'var(--color-primary-900)'};
  }
  .org-settings-input:focus {
    border-color: ${'var(--color-primary-500)'};
    box-shadow: 0 0 0 3px ${'var(--color-primary-100)'};
  }
  .org-settings-btn-primary:hover:not(:disabled) {
    background-color: ${'var(--color-primary-800)'};
  }
  .org-settings-btn-secondary:hover:not(:disabled) {
    background-color: ${'var(--color-primary-50)'};
    border-color: ${'var(--color-primary-400)'};
  }
  .org-settings-btn-danger:hover:not(:disabled) {
    background-color: ${'var(--color-primary-700)'};
  }
`;

export default function OrganizationSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<OrganizationWithMembers | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [brandName, setBrandName] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
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
      setBrandLogoUrl(orgData.brand_logo_url || '');
      setBrandName(orgData.brand_name || '');

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
        brand_logo_url: brandLogoUrl.trim() || undefined,
        brand_name: brandName.trim() || undefined,
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploadingLogo(true);
    setError('');

    try {
      const response = await api.uploadImage(file);
      setBrandLogoUrl(response.url);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
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

          {/* Branding Settings */}
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Branding</h2>
            <p style={{ ...styles.hint, marginBottom: spacing[6] }}>
              Customize how your organization appears on QR code posters and other materials.
            </p>
            <div style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Organization Logo</label>
                <div style={styles.logoUploadRow}>
                  {brandLogoUrl ? (
                    <img
                      src={brandLogoUrl}
                      alt="Brand logo"
                      style={styles.logoPreview}
                    />
                  ) : (
                    <div style={styles.logoPlaceholder}>No logo</div>
                  )}
                  <div style={styles.logoActions}>
                    <label style={styles.uploadButton}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        style={{ display: 'none' }}
                        disabled={uploadingLogo}
                      />
                      {uploadingLogo ? 'Uploading...' : (brandLogoUrl ? 'Change Logo' : 'Upload Logo')}
                    </label>
                    {brandLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setBrandLogoUrl('')}
                        style={styles.removeButton}
                      >
                        Remove logo
                      </button>
                    )}
                  </div>
                </div>
                <span style={styles.hint}>Recommended: Square image, at least 200x200px</span>
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="brandName" style={styles.label}>
                  Brand Name (Optional)
                </label>
                <input
                  id="brandName"
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g., Company Name, Team Name"
                  maxLength={255}
                  style={styles.input}
                  className="org-settings-input"
                />
                <span style={styles.hint}>Displayed on QR code posters. If not set, organization name will be used.</span>
              </div>
            </div>
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

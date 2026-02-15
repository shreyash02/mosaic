import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useOrgSettings } from './OrgSettingsLayout';
import { typography, spacing, borders, transitions } from '../../styles';

const styles = {
  card: {
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  cardDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[6],
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[5],
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
  hint: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  logoPreview: {
    width: '80px',
    height: '80px',
    objectFit: 'contain' as const,
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-100)',
  },
  logoPlaceholder: {
    width: '80px',
    height: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px dashed var(--color-primary-300)',
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
    border: '1px solid var(--color-primary-300)',
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
  actions: {
    display: 'flex',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  button: {
    padding: `${spacing[3]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    border: 'none',
    borderRadius: borders.radius.md,
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  successMessage: {
    backgroundColor: 'var(--color-success-light)',
    border: '1px solid var(--color-success)',
    color: 'var(--color-success-text)',
    padding: spacing[3],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  errorMessage: {
    backgroundColor: 'var(--color-error-light)',
    border: '1px solid var(--color-error)',
    color: 'var(--color-error-text)',
    padding: spacing[3],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
};

const hoverStyles = `
  .org-branding-input:focus {
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 3px var(--color-primary-100);
  }
  .org-branding-button:hover:not(:disabled) {
    background-color: var(--color-primary-800);
  }
  .org-branding-upload:hover {
    background-color: var(--color-primary-200);
  }
`;

export default function OrgSettingsBrandingPage() {
  const { organization, refreshOrganization } = useOrgSettings();

  const [brandLogoUrl, setBrandLogoUrl] = useState(organization.brand_logo_url || '');
  const [brandName, setBrandName] = useState(organization.brand_name || '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setBrandLogoUrl(organization.brand_logo_url || '');
    setBrandName(organization.brand_name || '');
  }, [organization]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    setSaving(true);

    try {
      await api.updateOrganization(organization.id, {
        brand_logo_url: brandLogoUrl.trim() || undefined,
        brand_name: brandName.trim() || undefined,
      });

      await refreshOrganization();
      setSuccess('Branding saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Branding</h2>
        <p style={styles.cardDescription}>
          Customize how your organization appears on QR code posters and other materials.
        </p>

        {success && <div style={styles.successMessage}>{success}</div>}
        {error && <div style={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSave} style={styles.form}>
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
                <label style={styles.uploadButton} className="org-branding-upload">
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
              Brand Name
            </label>
            <input
              id="brandName"
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g., Company Name, Team Name"
              maxLength={255}
              style={styles.input}
              className="org-branding-input"
            />
            <span style={styles.hint}>Displayed on QR code posters. If not set, organization name will be used.</span>
          </div>

          <div style={styles.actions}>
            <button
              type="submit"
              style={{
                ...styles.button,
                ...(saving ? styles.buttonDisabled : {}),
              }}
              className="org-branding-button"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

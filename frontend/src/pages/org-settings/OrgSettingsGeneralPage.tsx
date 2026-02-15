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
  required: {
    color: 'var(--color-primary-900)',
    marginLeft: spacing[1],
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
  .org-general-input:focus {
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 3px var(--color-primary-100);
  }
  .org-general-button:hover:not(:disabled) {
    background-color: var(--color-primary-800);
  }
`;

export default function OrgSettingsGeneralPage() {
  const { organization, refreshOrganization } = useOrgSettings();

  const [name, setName] = useState(organization.name);
  const [description, setDescription] = useState(organization.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setName(organization.name);
    setDescription(organization.description || '');
  }, [organization]);

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
      await api.updateOrganization(organization.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });

      await refreshOrganization();
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = name.trim() && !saving;

  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>General Settings</h2>
        <p style={styles.cardDescription}>
          Basic information about your organization.
        </p>

        {success && <div style={styles.successMessage}>{success}</div>}
        {error && <div style={styles.errorMessage}>{error}</div>}

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
              className="org-general-input"
            />
            <span style={styles.hint}>A clear, descriptive name for your organization</span>
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="description" style={styles.label}>
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this organization for?"
              rows={4}
              maxLength={500}
              style={styles.textarea}
              className="org-general-input"
            />
            <span style={styles.hint}>Help members understand the organization's purpose</span>
          </div>

          <div style={styles.actions}>
            <button
              type="submit"
              style={{
                ...styles.button,
                ...(!canSubmit ? styles.buttonDisabled : {}),
              }}
              className="org-general-button"
              disabled={!canSubmit}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

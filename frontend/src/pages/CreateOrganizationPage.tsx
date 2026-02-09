import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { OrganizationCreate } from '../types';
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
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
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
};

const hoverStyles = `
  .create-org-back-link:hover {
    color: ${colors.primary[900]};
  }
  .create-org-input:focus {
    border-color: ${colors.primary[500]};
    box-shadow: 0 0 0 3px ${colors.primary[100]};
  }
  .create-org-btn-primary:hover:not(:disabled) {
    background-color: ${colors.primary[800]};
  }
  .create-org-btn-secondary:hover:not(:disabled) {
    background-color: ${colors.primary[50]};
    border-color: ${colors.primary[400]};
  }
`;

export default function CreateOrganizationPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Organization name is required');
      return;
    }

    setLoading(true);

    try {
      const orgData: OrganizationCreate = {
        name: name.trim(),
        description: description.trim() || undefined,
      };

      const newOrg = await api.createOrganization(orgData);
      navigate(`/organizations/${newOrg.id}`);
    } catch (err: any) {
      console.error('Failed to create organization:', err);
      setError(
        err.response?.data?.detail ||
        'Failed to create organization. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.page}>
        <div style={styles.container}>
          <Link to="/organizations" style={styles.backLink} className="create-org-back-link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 12L6 8L10 4" />
            </svg>
            Back to Organizations
          </Link>

          <header style={styles.header}>
            <h1 style={styles.title}>Create Organization</h1>
            <p style={styles.subtitle}>
              Create a new organization to collaborate with your team
            </p>
          </header>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.card}>
            <form onSubmit={handleSubmit} style={styles.form}>
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
                  className="create-org-input"
                />
                <span style={styles.hint}>Choose a clear, descriptive name for your organization</span>
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
                  className="create-org-input"
                />
                <span style={styles.hint}>Provide a brief description to help members understand the organization's purpose</span>
              </div>

              <div style={styles.actions}>
                <button
                  type="submit"
                  style={{
                    ...styles.buttonPrimary,
                    ...(loading || !name.trim() ? styles.buttonDisabled : {}),
                  }}
                  className="create-org-btn-primary"
                  disabled={loading || !name.trim()}
                >
                  {loading ? 'Creating...' : 'Create Organization'}
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.buttonSecondary,
                    ...(loading ? styles.buttonDisabled : {}),
                  }}
                  className="create-org-btn-secondary"
                  onClick={() => navigate('/organizations')}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

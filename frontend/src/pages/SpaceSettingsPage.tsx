import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Space } from '../types';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import Modal from '../components/Modal';

const s = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: 'var(--color-primary-100)',
    padding: spacing[8],
  },
  container: {
    maxWidth: '640px',
    margin: '0 auto',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[1],
    color: 'var(--color-primary-500)',
    textDecoration: 'none',
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[6],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[8],
  },
  card: {
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
    boxShadow: shadows.sm,
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-800)',
    marginBottom: spacing[4],
  },
  formGroup: {
    marginBottom: spacing[4],
  },
  label: {
    display: 'block',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-700)',
    marginBottom: spacing[1],
  },
  input: {
    width: '100%',
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-900)',
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: '80px',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  saveButton: {
    padding: `${spacing[2]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  dangerZone: {
    borderColor: 'var(--color-error)',
  },
  dangerTitle: {
    color: 'var(--color-error-dark, #dc2626)',
  },
  deleteButton: {
    padding: `${spacing[2]} ${spacing[5]}`,
    backgroundColor: 'var(--color-error, #ef4444)',
    color: 'white',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  error: {
    backgroundColor: 'var(--color-error-light)',
    border: '1px solid var(--color-error)',
    color: 'var(--color-error)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  success: {
    backgroundColor: 'var(--color-success-light, #f0fdf4)',
    border: '1px solid var(--color-success, #22c55e)',
    color: 'var(--color-success-text, #166534)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  modalText: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-700)',
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[6],
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[4],
  },
  toggleLabel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[1],
  },
  toggleTrack: {
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
    flexShrink: 0,
    position: 'relative' as const,
  },
  toggleThumb: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: 'white',
    position: 'absolute' as const,
    top: '3px',
    transition: transitions.duration.normal,
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
  toggleDescription: {
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
    lineHeight: typography.lineHeight.relaxed,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: spacing[3],
  },
  cancelButton: {
    padding: `${spacing[2]} ${spacing[5]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-300)',
    cursor: 'pointer',
  },
};

export default function SpaceSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [space, setSpace] = useState<Space | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [autoOrganize, setAutoOrganize] = useState(true);
  const [clusteringMode, setClusteringMode] = useState<'dbscan' | 'llm'>('llm');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  usePageTitle(space ? `${space.title} Settings` : 'Space Settings');

  useEffect(() => {
    if (!id) return;
    api.getSpace(id)
      .then((data) => {
        setSpace(data);
        setTitle(data.title);
        setDescription(data.description || '');
        setAutoOrganize(data.auto_organize);
        setClusteringMode(data.clustering_mode || 'dbscan');
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Failed to load space');
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave() {
    if (!id || !title.trim()) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const updated = await api.updateSpace(id, {
        title: title.trim(),
        description: description.trim() || undefined,
        auto_organize: autoOrganize,
        clustering_mode: clusteringMode,
      });
      setSpace(updated);
      setSuccess('Settings saved');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    try {
      setDeleting(true);
      await api.deleteSpace(id);
      navigate('/spaces');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete space');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={{ color: 'var(--color-primary-500)', fontSize: typography.fontSize.sm }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.error}>Space not found</div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <Link to={`/spaces/${id}`} style={s.backLink}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to space
        </Link>

        <h1 style={s.title}>Space Settings</h1>

        {error && <div style={s.error}>{error}</div>}
        {success && <div style={s.success}>{success}</div>}

        {/* General settings */}
        <div style={s.card}>
          <h2 style={s.sectionTitle}>General</h2>
          <div style={s.formGroup}>
            <label style={s.label}>Title</label>
            <input
              style={s.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>
          <div style={s.formGroup}>
            <label style={s.label}>Description</label>
            <textarea
              style={s.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              placeholder="What is this space about?"
            />
          </div>
        </div>

        {/* Organization */}
        <div style={s.card}>
          <h2 style={s.sectionTitle}>Organization</h2>
          <div style={s.toggleRow}>
            <div style={s.toggleLabel}>
              <span style={s.label}>Auto-organize</span>
              <span style={s.toggleDescription}>
                Automatically re-organize ideas into themes as new ideas are added.
                When enough new or unthemed ideas accumulate, themes will be refreshed in the background.
              </span>
            </div>
            <button
              style={{
                ...s.toggleTrack,
                backgroundColor: autoOrganize ? 'var(--color-primary-900)' : 'var(--color-primary-300)',
              }}
              onClick={() => setAutoOrganize(!autoOrganize)}
              type="button"
              aria-label="Toggle auto-organize"
            >
              <div
                style={{
                  ...s.toggleThumb,
                  left: autoOrganize ? '23px' : '3px',
                }}
              />
            </button>
          </div>

          {/* Clustering mode */}
          <div style={{ marginTop: spacing[6] }}>
            <label style={s.label}>Clustering method</label>
            <span style={{ ...s.toggleDescription, display: 'block', marginBottom: spacing[3] }}>
              How ideas are grouped into themes during organization.
            </span>
            <div style={{ display: 'flex', gap: '0', borderRadius: borders.radius.md, overflow: 'hidden', border: '1px solid var(--color-primary-300)', width: 'fit-content' }}>
              <button
                type="button"
                onClick={() => setClusteringMode('dbscan')}
                style={{
                  padding: `${spacing[2]} ${spacing[4]}`,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  border: 'none',
                  cursor: 'pointer',
                  transition: transitions.duration.normal,
                  backgroundColor: clusteringMode === 'dbscan' ? 'var(--color-primary-900)' : 'var(--color-primary-50)',
                  color: clusteringMode === 'dbscan' ? 'var(--color-primary-50)' : 'var(--color-primary-700)',
                }}
              >
                Embedding (DBSCAN)
              </button>
              <button
                type="button"
                onClick={() => setClusteringMode('llm')}
                style={{
                  padding: `${spacing[2]} ${spacing[4]}`,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  border: 'none',
                  borderLeft: '1px solid var(--color-primary-300)',
                  cursor: 'pointer',
                  transition: transitions.duration.normal,
                  backgroundColor: clusteringMode === 'llm' ? 'var(--color-primary-900)' : 'var(--color-primary-50)',
                  color: clusteringMode === 'llm' ? 'var(--color-primary-50)' : 'var(--color-primary-700)',
                }}
              >
                LLM-assisted
              </button>
            </div>
            <span style={{ ...s.toggleDescription, display: 'block', marginTop: spacing[2] }}>
              {clusteringMode === 'dbscan'
                ? 'Groups ideas by embedding similarity. Fast and good for diverse, longer-form ideas.'
                : 'Uses AI to understand meaning and group ideas directly. Better for short, structurally similar ideas.'}
            </span>
          </div>
        </div>

        <button
          style={{
            ...s.saveButton,
            opacity: !title.trim() || saving ? 0.5 : 1,
            marginBottom: spacing[6],
          }}
          onClick={handleSave}
          disabled={!title.trim() || saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        {/* Danger zone */}
        <div style={{ ...s.card, ...s.dangerZone }}>
          <h2 style={{ ...s.sectionTitle, ...s.dangerTitle }}>Danger Zone</h2>
          <p style={{ fontSize: typography.fontSize.sm, color: 'var(--color-primary-600)', marginBottom: spacing[4] }}>
            Deleting this space will permanently remove all ideas, themes, and connections. This action cannot be undone.
          </p>
          <button style={s.deleteButton} onClick={() => setShowDeleteModal(true)}>
            Delete Space
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Space"
      >
        <p style={s.modalText}>
          Are you sure you want to delete <strong>"{space.title}"</strong>? This will permanently remove all {space.idea_count} ideas and {space.theme_count} themes.
        </p>
        <div style={s.modalActions}>
          <button style={s.cancelButton} onClick={() => setShowDeleteModal(false)}>
            Cancel
          </button>
          <button
            style={{ ...s.deleteButton, opacity: deleting ? 0.5 : 1 }}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Space'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

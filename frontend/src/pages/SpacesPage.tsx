import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { SpaceListItem, SpacePurpose } from '../types';
import { SPACE_PURPOSES } from '../types';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import EmptyState from '../components/EmptyState';
import { SkeletonConversationGrid } from '../components/Skeleton';
import Modal from '../components/Modal';

const s = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: 'var(--color-primary-100)',
    padding: spacing[8],
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  headerLeft: {},
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[1],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
  newButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[3]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: spacing[4],
  },
  card: {
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
    boxShadow: shadows.sm,
    cursor: 'pointer',
    transition: transitions.duration.normal,
    textDecoration: 'none',
    display: 'block',
    color: 'inherit',
  } as React.CSSProperties,
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  cardDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
    marginBottom: spacing[4],
    lineHeight: typography.lineHeight.relaxed,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  },
  cardStats: {
    display: 'flex',
    gap: spacing[4],
    fontSize: typography.fontSize.xs,
    color: 'var(--color-primary-500)',
  },
  cardStat: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[1],
  },
  // Modal form
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
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: spacing[3],
    marginTop: spacing[6],
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
  submitButton: {
    padding: `${spacing[2]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
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
};

export default function SpacesPage() {
  usePageTitle('Spaces');
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<SpaceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createPurpose, setCreatePurpose] = useState<SpacePurpose>('explore');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadSpaces();
  }, []);

  async function loadSpaces() {
    try {
      setLoading(true);
      const data = await api.getSpaces();
      setSpaces(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load spaces');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!createTitle.trim()) return;
    try {
      setCreating(true);
      const space = await api.createSpace({
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
        purpose: createPurpose,
      });
      setShowCreateModal(false);
      setCreateTitle('');
      setCreateDescription('');
      setCreatePurpose('explore');
      navigate(`/spaces/${space.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create space');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.header}>
          <div style={s.headerLeft}>
            <h1 style={s.title}>Spaces</h1>
            <p style={s.subtitle}>Your second brain for ideas and themes</p>
          </div>
          <button style={s.newButton} onClick={() => setShowCreateModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Space
          </button>
        </div>

        {error && <div style={s.error}>{error}</div>}

        {loading ? (
          <SkeletonConversationGrid count={3} />
        ) : spaces.length === 0 ? (
          <EmptyState
            type="default"
            title="No spaces yet"
            description="Create a space to start dropping ideas. The system will organize them into themes and show connections."
            action={
              <button style={s.newButton} onClick={() => setShowCreateModal(true)}>
                Create your first space
              </button>
            }
          />
        ) : (
          <div style={s.grid}>
            {spaces.map((space) => (
              <Link
                key={space.id}
                to={`/spaces/${space.id}`}
                style={s.card}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = shadows.md;
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary-400)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = shadows.sm;
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary-200)';
                }}
              >
                <div style={s.cardTitle}>{space.title}</div>
                {space.description && (
                  <div style={s.cardDescription}>{space.description}</div>
                )}
                <div style={s.cardStats}>
                  <span style={s.cardStat}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {space.idea_count} {space.idea_count === 1 ? 'idea' : 'ideas'}
                  </span>
                  <span style={s.cardStat}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                    {space.theme_count} {space.theme_count === 1 ? 'theme' : 'themes'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Space"
      >
        <div style={s.formGroup}>
          <label style={s.label}>Title</label>
          <input
            style={s.input}
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            placeholder="e.g., Product Ideas, Research Notes..."
            maxLength={200}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>Description (optional)</label>
          <textarea
            style={s.textarea}
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
            placeholder="What is this space about?"
            maxLength={2000}
          />
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>Purpose</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing[2] }}>
            {(Object.keys(SPACE_PURPOSES) as SpacePurpose[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setCreatePurpose(key)}
                style={{
                  padding: `${spacing[2]} ${spacing[3]}`,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.medium,
                  borderRadius: borders.radius.md,
                  border: createPurpose === key ? '1.5px solid var(--color-primary-900)' : '1px solid var(--color-primary-300)',
                  backgroundColor: createPurpose === key ? 'var(--color-primary-900)' : 'var(--color-primary-50)',
                  color: createPurpose === key ? 'var(--color-primary-50)' : 'var(--color-primary-700)',
                  cursor: 'pointer',
                  transition: transitions.duration.normal,
                }}
              >
                {SPACE_PURPOSES[key].label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: typography.fontSize.xs, color: 'var(--color-primary-500)', marginTop: spacing[2] }}>
            {SPACE_PURPOSES[createPurpose].description}
          </div>
        </div>
        <div style={s.modalActions}>
          <button style={s.cancelButton} onClick={() => setShowCreateModal(false)}>
            Cancel
          </button>
          <button
            style={{
              ...s.submitButton,
              opacity: !createTitle.trim() || creating ? 0.5 : 1,
            }}
            onClick={handleCreate}
            disabled={!createTitle.trim() || creating}
          >
            {creating ? 'Creating...' : 'Create Space'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

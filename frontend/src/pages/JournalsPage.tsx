import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { JournalListItem, SharedJournalListItem } from '../types';
import { useFeature } from '../contexts/FeaturesContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { typography, spacing, borders, shadows, transitions } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatRelativeTime } from '../utils/formatting';
import EmptyState from '../components/EmptyState';
import { SkeletonConversationGrid } from '../components/Skeleton';
import GettingStartedChecklist from '../components/GettingStartedChecklist';
import { useChecklist } from '../hooks/useChecklist';
import Modal from '../components/Modal';

function formatDuration(createdAt: string): string {
  const start = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return 'today';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? '1 week' : `${weeks} weeks`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? '1 month' : `${months} months`;
  }
  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  if (remainingMonths === 0) return years === 1 ? '1 year' : `${years} years`;
  return `${years === 1 ? '1 year' : `${years} years`} and ${remainingMonths === 1 ? '1 month' : `${remainingMonths} months`}`;
}

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
    textDecoration: 'none',
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
    position: 'relative' as const,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
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
  menuButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-primary-400)',
    padding: spacing[1],
    borderRadius: borders.radius.sm,
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
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
  // Modal
  modalText: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-700)',
    lineHeight: typography.lineHeight.relaxed,
    marginBottom: spacing[6],
  },
  modalWarning: {
    fontWeight: typography.fontWeight.medium,
    color: 'var(--color-primary-900)',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: spacing[3],
  },
  modalCancel: {
    padding: `${spacing[2]} ${spacing[5]}`,
    backgroundColor: 'transparent',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: '1px solid var(--color-primary-300)',
    cursor: 'pointer',
  },
  modalDelete: {
    padding: `${spacing[2]} ${spacing[5]}`,
    backgroundColor: 'var(--color-error)',
    color: '#fff',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
  },
};

export default function JournalsPage() {
  const navigate = useNavigate();
  const journalsEnabled = useFeature('journals');
  const { currentWorkspaceId } = useOrganization();
  usePageTitle('Journals');

  const [journals, setJournals] = useState<JournalListItem[]>([]);
  const [sharedJournals, setSharedJournals] = useState<SharedJournalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<JournalListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { completeStep: completeJournalStep, isComplete: isJournalChecklistComplete, isDismissed: isJournalChecklistDismissed } = useChecklist('journal');

  useEffect(() => {
    if (!journalsEnabled) {
      navigate('/dashboard');
      return;
    }

    const loadJournals = async () => {
      try {
        setLoading(true);
        const [ownJournals, shared] = await Promise.all([
          api.getJournals({ workspaceId: currentWorkspaceId || undefined }),
          api.getSharedJournals().catch(() => [] as SharedJournalListItem[]),
        ]);
        setJournals(ownJournals);
        setSharedJournals(shared);
      } catch (err) {
        console.error('Failed to load journals:', err);
        setError('Failed to load journals. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadJournals();
  }, [journalsEnabled, navigate, currentWorkspaceId]);

  // Auto-complete journal checklist steps
  useEffect(() => {
    if (journals.length > 0) {
      completeJournalStep('write-first');
      const totalEntries = journals.reduce((sum, j) => sum + j.total_entries, 0);
      if (totalEntries >= 3) {
        completeJournalStep('write-few');
      }
    }
  }, [journals, completeJournalStep]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.deleteJournal(deleteTarget.id);
      setJournals(prev => prev.filter(j => j.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError('Failed to delete journal. Please try again.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.header}>
            <div style={s.headerLeft}>
              <h1 style={s.title}>Journals</h1>
            </div>
          </div>
          <SkeletonConversationGrid count={3} />
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.header}>
          <div style={s.headerLeft}>
            <h1 style={s.title}>Journals</h1>
            <p style={s.subtitle}>
              {journals.length > 0
                ? `${journals.length} journal${journals.length !== 1 ? 's' : ''} — private to you`
                : 'Your private reflection space'}
            </p>
          </div>
          <Link to="/journals/new" style={s.newButton}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Journal
          </Link>
        </div>

        {error && <div style={s.error}>{error}</div>}

        {journals.length === 0 ? (
          <>
            {!isJournalChecklistComplete() && !isJournalChecklistDismissed() && (
              <div style={{ maxWidth: '560px', margin: `0 auto ${spacing[6]}` }}>
                <GettingStartedChecklist checklistId="journal" variant="card" showDismiss />
              </div>
            )}
            <EmptyState
              type="journals"
              title="No journals yet"
              description="Start a journal to track your reflections over time. Choose from templates or create your own."
              action={
                <Link to="/journals/new" style={s.newButton}>
                  Create Your First Journal
                </Link>
              }
            />
          </>
        ) : (
          <div style={s.grid}>
            {journals.map(journal => (
              <Link
                key={journal.id}
                to={`/journals/${journal.id}`}
                style={s.card}
              >
                <div style={s.cardHeader}>
                  <div style={s.cardTitle}>{journal.title}</div>
                  <button
                    style={s.menuButton}
                    className="journal-delete-btn"
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteTarget(journal);
                    }}
                    title="Delete journal"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
                <div style={s.cardStats}>
                  <span style={s.cardStat}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                    {journal.total_entries} {journal.total_entries === 1 ? 'entry' : 'entries'}
                  </span>
                  {journal.current_streak >= 2 && (
                    <span style={s.cardStat}>
                      {journal.current_streak}-day streak
                    </span>
                  )}
                  {journal.last_entry_at ? (
                    <span style={s.cardStat}>
                      Last {formatRelativeTime(journal.last_entry_at)}
                    </span>
                  ) : (
                    <span style={s.cardStat}>
                      Created {formatRelativeTime(journal.created_at)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Shared with me */}
        {sharedJournals.length > 0 && (
          <div style={{ marginTop: spacing[8] }}>
            <h2 style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.semibold,
              color: 'var(--color-primary-900)',
              marginBottom: spacing[4],
            }}>
              Shared with me
            </h2>
            <div style={s.grid}>
              {sharedJournals.map(sj => (
                <Link
                  key={sj.journal_id}
                  to={`/journals/shared/${sj.journal_id}`}
                  style={{
                    ...s.card,
                    borderColor: 'var(--color-primary-300)',
                    borderStyle: 'dashed',
                  }}
                >
                  <div style={s.cardTitle}>{sj.title}</div>
                  <div style={s.cardStats}>
                    <span style={s.cardStat}>
                      Shared by {sj.owner_name}
                    </span>
                    <span style={{
                      display: 'inline-block',
                      padding: `${spacing[1]} ${spacing[2]}`,
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.medium,
                      borderRadius: borders.radius.sm,
                      backgroundColor: sj.share_type === 'full'
                        ? 'var(--color-info-light)'
                        : 'var(--color-primary-200)',
                      color: sj.share_type === 'full'
                        ? 'var(--color-info-text)'
                        : 'var(--color-primary-700)',
                    }}>
                      {sj.share_type === 'full' ? 'Full access' : 'Insights only'}
                    </span>
                    {sj.share_type === 'full' && (
                      <span style={s.cardStat}>
                        {sj.total_entries} {sj.total_entries === 1 ? 'entry' : 'entries'}
                      </span>
                    )}
                    {sj.has_analysis && (
                      <span style={s.cardStat}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                        Insights
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete Journal"
          maxWidth="440px"
        >
          {deleteTarget && (
            <>
              <p style={s.modalText}>
                {deleteTarget.total_entries > 0 ? (
                  <>
                    You will lose{' '}
                    <span style={s.modalWarning}>
                      {deleteTarget.total_entries} {deleteTarget.total_entries === 1 ? 'entry' : 'entries'}
                    </span>
                    {' '}that {deleteTarget.total_entries === 1 ? 'has' : 'have'} been written over{' '}
                    <span style={s.modalWarning}>{formatDuration(deleteTarget.created_at)}</span>.
                    This cannot be undone.
                  </>
                ) : (
                  <>Are you sure you want to delete <span style={s.modalWarning}>{deleteTarget.title}</span>? This cannot be undone.</>
                )}
              </p>
              <div style={s.modalActions}>
                <button
                  style={s.modalCancel}
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  style={{
                    ...s.modalDelete,
                    ...(deleting ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                  }}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Journal'}
                </button>
              </div>
            </>
          )}
        </Modal>
      </div>
    </div>
  );
}

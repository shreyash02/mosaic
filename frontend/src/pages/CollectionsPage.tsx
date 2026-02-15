import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Series, SeriesWithConversations, SeriesCreate } from '../types';
import { useOrganization } from '../contexts/OrganizationContext';
import { typography, spacing, borders, shadows, transitions, mediaQueries } from '../styles/tokens';
import { usePageTitle } from '../hooks/usePageTitle';
import EmptyState from '../components/EmptyState';
import { SkeletonConversationGrid } from '../components/Skeleton';
import LimitReachedModal, { isLimitReachedError } from '../components/LimitReachedModal';

interface CollectionWithCount extends Series {
  conversationCount: number;
}

export default function CollectionsPage() {
  const { currentOrgId } = useOrganization();
  const navigate = useNavigate();
  const [collections, setCollections] = useState<CollectionWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [collectionName, setCollectionName] = useState('');
  const [collectionDescription, setCollectionDescription] = useState('');

  usePageTitle('Collections');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [deleteCollectionId, setDeleteCollectionId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [analyzingCollectionId, setAnalyzingCollectionId] = useState<string | null>(null);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);
  const [limitReached, setLimitReached] = useState<{
    show: boolean;
    feature: string;
    limit: number;
    usage: number;
  }>({ show: false, feature: '', limit: 0, usage: 0 });

  // Use CSS custom properties for dark mode support
  const styles = {
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
      alignItems: 'flex-start',
      marginBottom: spacing[8],
    },
    title: {
      fontSize: typography.fontSize['3xl'],
      fontWeight: typography.fontWeight.bold,
      color: 'var(--color-primary-900)',
      margin: 0,
      marginBottom: spacing[2],
    },
    description: {
      fontSize: typography.fontSize.base,
      color: 'var(--color-primary-600)',
      margin: 0,
    },
    primaryButton: {
      padding: `${spacing[3]} ${spacing[6]}`,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: 'var(--color-primary-50)',
      backgroundColor: 'var(--color-primary-900)',
      border: 'none',
      borderRadius: borders.radius.md,
      cursor: 'pointer',
      transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
    },
    secondaryButton: {
      padding: `${spacing[3]} ${spacing[6]}`,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: 'var(--color-primary-700)',
      backgroundColor: 'var(--color-primary-50)',
      border: `${borders.width.thin} solid var(--color-primary-400)`,
      borderRadius: borders.radius.md,
      cursor: 'pointer',
      transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
    },
    dangerButton: {
      padding: `${spacing[3]} ${spacing[6]}`,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: 'var(--color-primary-50)',
      backgroundColor: 'var(--color-error)',
      border: 'none',
      borderRadius: borders.radius.md,
      cursor: 'pointer',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: spacing[6],
    },
    card: {
      backgroundColor: 'var(--color-primary-50)',
      borderRadius: borders.radius.lg,
      border: `${borders.width.thin} solid var(--color-primary-300)`,
      padding: spacing[6],
      cursor: 'pointer',
      transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
      position: 'relative' as const,
    },
    cardTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: 'var(--color-primary-900)',
      margin: 0,
    },
    cardDescription: {
      fontSize: typography.fontSize.sm,
      color: 'var(--color-primary-600)',
      margin: `${spacing[2]} 0`,
      lineHeight: typography.lineHeight.relaxed,
    },
    cardMeta: {
      fontSize: typography.fontSize.sm,
      color: 'var(--color-primary-500)',
      marginTop: spacing[4],
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: spacing[12],
      backgroundColor: 'var(--color-primary-50)',
      borderRadius: borders.radius.lg,
      border: `${borders.width.thin} solid var(--color-primary-300)`,
    },
    modal: {
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
    },
    modalContent: {
      backgroundColor: 'var(--color-primary-50)',
      borderRadius: borders.radius.xl,
      padding: spacing[8],
      maxWidth: '500px',
      width: '90%',
      boxShadow: shadows.lg,
    },
    input: {
      width: '100%',
      padding: spacing[3],
      fontSize: typography.fontSize.sm,
      border: `${borders.width.thin} solid var(--color-primary-400)`,
      borderRadius: borders.radius.md,
      marginTop: spacing[2],
      backgroundColor: 'var(--color-primary-50)',
      color: 'var(--color-primary-900)',
    },
    label: {
      display: 'block',
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: 'var(--color-primary-900)',
    },
    errorMessage: {
      backgroundColor: 'var(--color-error-light)',
      border: `${borders.width.thin} solid var(--color-error)`,
      borderRadius: borders.radius.md,
      padding: spacing[4],
      color: 'var(--color-error)',
      marginBottom: spacing[4],
    },
    successMessage: {
      backgroundColor: 'var(--color-success-light)',
      border: `${borders.width.thin} solid var(--color-success)`,
      borderRadius: borders.radius.md,
      padding: spacing[4],
      color: 'var(--color-success)',
      marginBottom: spacing[4],
    },
  };

  useEffect(() => {
    loadCollections();
  }, [currentOrgId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const clickedMenu = target.closest('.collection-card-menu');
      if (!clickedMenu && openMenuId) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

  const loadCollections = async () => {
    try {
      const data = await api.listSeries(currentOrgId || undefined);
      const collectionsWithCounts = await Promise.all(
        data.map(async (collection) => {
          try {
            const details: SeriesWithConversations = await api.getSeries(collection.id);
            return { ...collection, conversationCount: details.conversations.length };
          } catch {
            return { ...collection, conversationCount: 0 };
          }
        })
      );
      setCollections(collectionsWithCounts);
    } catch {
      setError('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCollection = async () => {
    if (!collectionName.trim()) {
      setCreateError('Collection name is required');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      const collectionData: SeriesCreate = {
        name: collectionName.trim(),
        description: collectionDescription.trim() || undefined,
        organization_id: currentOrgId || undefined,
      };
      await api.createSeries(collectionData);
      setShowCreateModal(false);
      setCollectionName('');
      setCollectionDescription('');
      await loadCollections();
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || 'Failed to create collection');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCollectionId) return;

    setDeleting(true);
    try {
      await api.deleteSeries(deleteCollectionId);
      setShowDeleteModal(false);
      setDeleteCollectionId(null);
      await loadCollections();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete collection');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleRunAnalysis = async (e: React.MouseEvent, collectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(null);
    setAnalyzingCollectionId(collectionId);
    setError('');

    try {
      await api.computeCollectionAnalysis(collectionId, true);
      setAnalysisSuccess(true);
      setTimeout(() => setAnalysisSuccess(false), 3000);
    } catch (err: any) {
      const limitError = isLimitReachedError(err);
      if (limitError.isLimitReached) {
        setLimitReached({
          show: true,
          feature: limitError.feature,
          limit: limitError.limit,
          usage: limitError.usage,
        });
      } else {
        setError(err.response?.data?.detail || 'Failed to run analysis');
      }
    } finally {
      setAnalyzingCollectionId(null);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <header style={styles.header}>
            <div>
              <h1 style={styles.title}>Collections</h1>
              <p style={styles.description}>
                Group related conversations to track trends over time
              </p>
            </div>
          </header>
          <SkeletonConversationGrid count={6} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page} className="collections-page">
      <style>{`
        .collections-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: ${spacing[8]};
        }
        .collections-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: ${spacing[6]};
        }
        @media ${mediaQueries.tabletDown} {
          .collections-header {
            flex-direction: column;
            gap: ${spacing[4]};
          }
          .collections-header button {
            width: 100%;
            justify-content: center;
          }
          .collections-grid {
            grid-template-columns: 1fr;
          }
        }
        @media ${mediaQueries.mobile} {
          .collections-page {
            padding: ${spacing[4]} !important;
          }
          .collections-page-title {
            font-size: ${typography.fontSize['2xl']} !important;
          }
        }
        .collections-card:hover {
          border-color: var(--color-primary-500);
          box-shadow: ${shadows.sm};
        }
      `}</style>
      <div style={styles.container}>
        <header className="collections-header">
          <div>
            <h1 style={styles.title} className="collections-page-title">Collections</h1>
            <p style={styles.description}>
              Group related conversations together to track trends and insights over time
            </p>
          </div>
          <button
            style={styles.primaryButton}
            onClick={() => setShowCreateModal(true)}
          >
            + New Collection
          </button>
        </header>

        {error && <div style={styles.errorMessage}>{error}</div>}
        {analysisSuccess && (
          <div style={styles.successMessage}>
            Analysis started! View the collection to see results.
          </div>
        )}

        {collections.length === 0 ? (
          <EmptyState
            type="collections"
            title="No collections yet"
            description="Collections help you group related conversations and analyze trends over time"
            action={
              <button
                style={styles.primaryButton}
                onClick={() => setShowCreateModal(true)}
              >
                + New Collection
              </button>
            }
          />
        ) : (
          <div className="collections-grid">
            {collections.map((collection) => {
              const isMenuOpen = openMenuId === collection.id;
              const isAnalyzing = analyzingCollectionId === collection.id;

              return (
                <div
                  key={collection.id}
                  style={styles.card}
                  className="collections-card"
                  onClick={() => navigate(`/collections/${collection.id}`)}
                >
                  <h3 style={styles.cardTitle}>{collection.name}</h3>
                  {collection.description && (
                    <p style={styles.cardDescription}>{collection.description}</p>
                  )}
                  <div style={styles.cardMeta}>
                    <strong>{collection.conversationCount}</strong>{' '}
                    {collection.conversationCount === 1 ? 'conversation' : 'conversations'}
                  </div>

                  {/* Menu */}
                  <div className="collection-card-menu" style={{ position: 'absolute', top: spacing[4], right: spacing[4] }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(isMenuOpen ? null : collection.id);
                      }}
                      disabled={isAnalyzing}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: spacing[2],
                        color: 'var(--color-primary-500)',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="8" cy="3" r="1.5"/>
                        <circle cx="8" cy="8" r="1.5"/>
                        <circle cx="8" cy="13" r="1.5"/>
                      </svg>
                    </button>
                    {isMenuOpen && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        backgroundColor: 'var(--color-primary-50)',
                        border: `${borders.width.thin} solid var(--color-primary-300)`,
                        borderRadius: borders.radius.md,
                        boxShadow: shadows.md,
                        minWidth: '150px',
                        zIndex: 10,
                      }}>
                        <button
                          onClick={(e) => handleRunAnalysis(e, collection.id)}
                          disabled={isAnalyzing}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: `${spacing[3]} ${spacing[4]}`,
                            textAlign: 'left',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: typography.fontSize.sm,
                            color: 'var(--color-primary-700)',
                          }}
                        >
                          {isAnalyzing ? 'Running...' : 'Run analysis'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            setDeleteCollectionId(collection.id);
                            setShowDeleteModal(true);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: `${spacing[3]} ${spacing[4]}`,
                            textAlign: 'left',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: typography.fontSize.sm,
                            color: 'var(--color-error)',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div style={styles.modal} onClick={() => !creating && setShowCreateModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: 'var(--color-primary-900)', marginBottom: spacing[4] }}>Create New Collection</h2>
            <p style={{ color: 'var(--color-primary-600)', marginBottom: spacing[6] }}>
              Create a new collection to group related conversations together.
            </p>

            <div style={{ marginBottom: spacing[4] }}>
              <label style={styles.label}>Collection Name *</label>
              <input
                style={styles.input}
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="e.g., Q1 2025 Retros"
                disabled={creating}
              />
            </div>

            <div style={{ marginBottom: spacing[4] }}>
              <label style={styles.label}>Description (optional)</label>
              <textarea
                style={{ ...styles.input, minHeight: '80px', resize: 'vertical' }}
                value={collectionDescription}
                onChange={(e) => setCollectionDescription(e.target.value)}
                placeholder="Describe what this collection is for..."
                disabled={creating}
              />
            </div>

            {createError && <div style={styles.errorMessage}>{createError}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing[3] }}>
              <button
                style={styles.secondaryButton}
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.primaryButton, opacity: creating || !collectionName.trim() ? 0.6 : 1 }}
                onClick={handleCreateCollection}
                disabled={creating || !collectionName.trim()}
              >
                {creating ? 'Creating...' : 'Create Collection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && deleteCollectionId && (
        <div style={styles.modal} onClick={() => !deleting && setShowDeleteModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: 'var(--color-error)', marginBottom: spacing[4] }}>Delete Collection</h2>
            <p style={{ color: 'var(--color-primary-600)', marginBottom: spacing[4] }}>
              Are you sure you want to delete <strong>{collections.find(c => c.id === deleteCollectionId)?.name}</strong>?
            </p>
            <p style={{ color: 'var(--color-primary-600)', marginBottom: spacing[6] }}>
              This action cannot be undone. Conversations in this collection will remain but won't be grouped.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing[3] }}>
              <button
                style={styles.secondaryButton}
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                style={styles.dangerButton}
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Collection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Limit Reached Modal */}
      <LimitReachedModal
        isOpen={limitReached.show}
        onClose={() => setLimitReached({ ...limitReached, show: false })}
        feature={limitReached.feature}
        limit={limitReached.limit}
        usage={limitReached.usage}
      />
    </div>
  );
}

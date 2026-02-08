import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Series, SeriesWithConversations, SeriesCreate } from '../types';
import { useOrganization } from '../contexts/OrganizationContext';
import { colors, typography, spacing, borders, shadows, transitions } from '../styles/tokens';

interface CollectionWithCount extends Series {
  conversationCount: number;
}

export default function CollectionsPageNew() {
  const { currentOrgId } = useOrganization();
  const navigate = useNavigate();
  const [collections, setCollections] = useState<CollectionWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [collectionName, setCollectionName] = useState('');
  const [collectionDescription, setCollectionDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [deleteCollectionId, setDeleteCollectionId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [analyzingCollectionId, setAnalyzingCollectionId] = useState<string | null>(null);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);

  const styles = {
    page: {
      minHeight: '100vh',
      backgroundColor: colors.primary[100],
      padding: spacing[8],
      paddingTop: `calc(80px + ${spacing[8]})`, // Account for fixed header
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
      color: colors.primary[900],
      margin: 0,
      marginBottom: spacing[2],
    },
    description: {
      fontSize: typography.fontSize.base,
      color: colors.primary[600],
      margin: 0,
    },
    primaryButton: {
      padding: `${spacing[3]} ${spacing[6]}`,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.primary[50],
      backgroundColor: colors.primary[900],
      border: 'none',
      borderRadius: borders.radius.md,
      cursor: 'pointer',
      transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
    },
    secondaryButton: {
      padding: `${spacing[3]} ${spacing[6]}`,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.primary[700],
      backgroundColor: colors.primary[50],
      border: `${borders.width.thin} solid ${colors.primary[400]}`,
      borderRadius: borders.radius.md,
      cursor: 'pointer',
      transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
    },
    dangerButton: {
      padding: `${spacing[3]} ${spacing[6]}`,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.primary[50],
      backgroundColor: colors.semantic.error.main,
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
      backgroundColor: colors.primary[50],
      borderRadius: borders.radius.lg,
      border: `${borders.width.thin} solid ${colors.primary[300]}`,
      padding: spacing[6],
      cursor: 'pointer',
      transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
      position: 'relative' as const,
    },
    cardTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      color: colors.primary[900],
      margin: 0,
    },
    cardDescription: {
      fontSize: typography.fontSize.sm,
      color: colors.primary[600],
      margin: `${spacing[2]} 0`,
      lineHeight: typography.lineHeight.relaxed,
    },
    cardMeta: {
      fontSize: typography.fontSize.sm,
      color: colors.primary[500],
      marginTop: spacing[4],
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: spacing[12],
      backgroundColor: colors.primary[50],
      borderRadius: borders.radius.lg,
      border: `${borders.width.thin} solid ${colors.primary[300]}`,
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
      backgroundColor: colors.primary[50],
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
      border: `${borders.width.thin} solid ${colors.primary[400]}`,
      borderRadius: borders.radius.md,
      marginTop: spacing[2],
    },
    label: {
      display: 'block',
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.primary[900],
    },
    errorMessage: {
      backgroundColor: colors.semantic.error.light,
      border: `${borders.width.thin} solid ${colors.semantic.error.main}`,
      borderRadius: borders.radius.md,
      padding: spacing[4],
      color: colors.semantic.error.text,
      marginBottom: spacing[4],
    },
    successMessage: {
      backgroundColor: colors.semantic.success.light,
      border: `${borders.width.thin} solid ${colors.semantic.success.main}`,
      borderRadius: borders.radius.md,
      padding: spacing[4],
      color: colors.semantic.success.text,
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
      setError(err.response?.data?.detail || 'Failed to run analysis');
    } finally {
      setAnalyzingCollectionId(null);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={{ textAlign: 'center', padding: spacing[12], color: colors.primary[600] }}>
            Loading collections...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Collections</h1>
            <p style={styles.description}>
              Group related conversations together to track trends and insights over time
            </p>
          </div>
          <button
            style={styles.primaryButton}
            onClick={() => setShowCreateModal(true)}
            className="collections-primary-btn"
          >
            Create Collection
          </button>
        </header>

        {error && <div style={styles.errorMessage}>{error}</div>}
        {analysisSuccess && (
          <div style={styles.successMessage}>
            Analysis started! View the collection to see results.
          </div>
        )}

        {collections.length === 0 ? (
          <div style={styles.emptyState}>
            <h3 style={{ color: colors.primary[900], marginBottom: spacing[2] }}>No collections yet</h3>
            <p style={{ color: colors.primary[600], marginBottom: spacing[4] }}>
              Collections help you group related conversations and analyze trends over time
            </p>
            <button
              style={styles.primaryButton}
              onClick={() => setShowCreateModal(true)}
              className="collections-primary-btn"
            >
              Create Collection
            </button>
          </div>
        ) : (
          <div style={styles.grid}>
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
                        color: colors.primary[500],
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
                        backgroundColor: colors.primary[50],
                        border: `${borders.width.thin} solid ${colors.primary[300]}`,
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
                            color: colors.primary[700],
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
                            color: colors.semantic.error.main,
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
            <h2 style={{ color: colors.primary[900], marginBottom: spacing[4] }}>Create New Collection</h2>
            <p style={{ color: colors.primary[600], marginBottom: spacing[6] }}>
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
                className="collections-secondary-btn"
              >
                Cancel
              </button>
              <button
                style={{ ...styles.primaryButton, opacity: creating || !collectionName.trim() ? 0.6 : 1 }}
                onClick={handleCreateCollection}
                disabled={creating || !collectionName.trim()}
                className="collections-primary-btn"
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
            <h2 style={{ color: colors.semantic.error.dark, marginBottom: spacing[4] }}>Delete Collection</h2>
            <p style={{ color: colors.primary[600], marginBottom: spacing[4] }}>
              Are you sure you want to delete <strong>{collections.find(c => c.id === deleteCollectionId)?.name}</strong>?
            </p>
            <p style={{ color: colors.primary[600], marginBottom: spacing[6] }}>
              This action cannot be undone. Conversations in this collection will remain but won't be grouped.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing[3] }}>
              <button
                style={styles.secondaryButton}
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="collections-secondary-btn"
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

      <style>{`
        .collections-primary-btn:hover {
          background-color: ${colors.primary[800]} !important;
          box-shadow: ${shadows.sm} !important;
        }
        .collections-secondary-btn:hover {
          background-color: ${colors.primary[100]} !important;
          border-color: ${colors.primary[500]} !important;
        }
        .collections-card:hover {
          border-color: ${colors.primary[500]} !important;
          box-shadow: ${shadows.sm} !important;
        }
      `}</style>
    </div>
  );
}

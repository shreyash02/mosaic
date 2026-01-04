import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Series, SeriesWithConversations, SeriesCreate } from '../types';
import { useOrganization } from '../contexts/OrganizationContext';

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
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [deleteCollectionId, setDeleteCollectionId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [analyzingCollectionId, setAnalyzingCollectionId] = useState<string | null>(null);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);

  useEffect(() => {
    loadCollections();
  }, [currentOrgId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const clickedMenu = target.closest('.conversation-card-menu');
      if (!clickedMenu && openMenuId) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuId]);

  const loadCollections = async () => {
    try {
      const data = await api.listSeries(currentOrgId || undefined);
      
      // Fetch conversation counts for each collection
      const collectionsWithCounts = await Promise.all(
        data.map(async (collection) => {
          try {
            const details: SeriesWithConversations = await api.getSeries(collection.id);
            return {
              ...collection,
              conversationCount: details.conversations.length
            };
          } catch (err) {
            console.error(`Failed to load details for collection ${collection.id}:`, err);
            return {
              ...collection,
              conversationCount: 0
            };
          }
        })
      );
      
      setCollections(collectionsWithCounts);
    } catch (err: any) {
      setError('Failed to load collections');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (collectionId: string) => {
    navigate(`/collections/${collectionId}`);
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

      // Close modal and reset form
      setShowCreateModal(false);
      setCollectionName('');
      setCollectionDescription('');
      setCreateError('');

      // Refresh collections list
      await loadCollections();
    } catch (err: any) {
      setCreateError(err.response?.data?.detail || 'Failed to create collection');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, collectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(null);
    setDeleteCollectionId(collectionId);
    setShowDeleteModal(true);
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
      setDeleteCollectionId(null);
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
    setAnalysisSuccess(false);
    
    try {
      await api.computeCollectionAnalysis(collectionId, true);
      setAnalysisSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setAnalysisSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to run analysis');
    } finally {
      setAnalyzingCollectionId(null);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading">Loading collections...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Collections</h1>
          <p className="description">
            Group related conversations together to track trends and insights over time
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          Create Collection
        </button>
      </header>

      {error && <div className="error-message">{error}</div>}
      {analysisSuccess && (
        <div className="success-message">
          ✓ Analysis started! View the collection to see results.
        </div>
      )}

      {collections.length === 0 ? (
        <div className="empty-state">
          <h3>No collections yet</h3>
          <p>Collections help you group related conversations and analyze trends over time</p>
          <p style={{ marginTop: '0.5rem', color: '#718096' }}>
            Click "Create Collection" above to get started
          </p>
        </div>
      ) : (
        <div className="organization-grid">
          {collections.map((collection) => {
            const isMenuOpen = openMenuId === collection.id;
            const isAnalyzing = analyzingCollectionId === collection.id;
            
            return (
              <div 
                key={collection.id} 
                className="organization-card"
                style={{ cursor: 'pointer', position: 'relative' }}
              >
                <div 
                  onClick={() => handleCardClick(collection.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-header">
                    <h3 style={{ margin: 0 }}>{collection.name}</h3>
                  </div>

                  {collection.description && (
                    <p className="card-description">{collection.description}</p>
                  )}

                  <div className="card-meta">
                    <span className="meta-item">
                      <strong>{collection.conversationCount}</strong> {collection.conversationCount === 1 ? 'conversation' : 'conversations'}
                    </span>
                  </div>
                </div>
                <div className="conversation-card-menu" style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
                  <button
                    className="card-menu-button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpenMenuId(isMenuOpen ? null : collection.id);
                    }}
                    aria-label="More options"
                    disabled={isAnalyzing}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="8" cy="3" r="1.5"/>
                      <circle cx="8" cy="8" r="1.5"/>
                      <circle cx="8" cy="13" r="1.5"/>
                    </svg>
                  </button>
                  {isMenuOpen && (
                    <div className="card-menu-dropdown">
                      <button
                        className="card-menu-item"
                        onClick={(e) => handleRunAnalysis(e, collection.id)}
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? 'Running analysis...' : 'Run analysis'}
                      </button>
                      <button
                        className="card-menu-item card-menu-item-danger"
                        onClick={(e) => handleDeleteClick(e, collection.id)}
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

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => {
          if (!creating) {
            setShowCreateModal(false);
            setCollectionName('');
            setCollectionDescription('');
            setCreateError('');
          }
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>Create New Collection</h2>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              Create a new collection to group related conversations together.
            </p>

            <div className="form-group">
              <label htmlFor="collectionName">Collection Name *</label>
              <input
                id="collectionName"
                type="text"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="e.g., Q1 2025 Retros"
                required
                disabled={creating}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && collectionName.trim() && !creating) {
                    e.preventDefault();
                    handleCreateCollection();
                  }
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="collectionDescription">Description (optional)</label>
              <textarea
                id="collectionDescription"
                value={collectionDescription}
                onChange={(e) => setCollectionDescription(e.target.value)}
                placeholder="Describe what this collection is for..."
                rows={3}
                disabled={creating}
              />
            </div>

            {createError && <div className="error-message" style={{ marginTop: '1rem' }}>{createError}</div>}

            <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  if (!creating) {
                    setShowCreateModal(false);
                    setCollectionName('');
                    setCollectionDescription('');
                    setCreateError('');
                  }
                }}
                className="btn btn-secondary"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                className="btn btn-primary"
                disabled={creating || !collectionName.trim()}
              >
                {creating ? 'Creating...' : 'Create Collection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteCollectionId && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem', color: '#9b2c2c' }}>Delete Collection</h2>
            <p style={{ marginBottom: '1rem', color: '#718096' }}>
              Are you sure you want to delete the collection <strong>{collections.find(c => c.id === deleteCollectionId)?.name}</strong>?
            </p>
            <p style={{ marginBottom: '1.5rem', color: '#718096' }}>
              This action cannot be undone. The collection will be deleted, but all conversations in it will remain and will no longer be part of any collection.
            </p>
            <div className="modal-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteCollectionId(null);
                  setError('');
                }}
                className="btn btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="btn btn-danger"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Collection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { SeriesWithConversations, ConversationListItem, CollectionAnalysis } from '../types';
import { ConversationState } from '../types';
import { formatDateShort } from '../utils/formatting';
import TrendChart from '../components/TrendChart';
import DesignToggle from '../components/DesignToggle';
import CollectionDetailPageNew from './CollectionDetailPageNew';

function CollectionDetailPageOld() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<SeriesWithConversations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<CollectionAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [computing, setComputing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      loadCollection();
      loadAnalysis();
    }
  }, [id]);

  const loadCollection = async () => {
    if (!id) return;
    
    try {
      const data = await api.getSeries(id);
      setCollection(data);
    } catch (err: any) {
      setError('Failed to load collection');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalysis = async () => {
    if (!id) return;
    
    setLoadingAnalysis(true);
    try {
      const data = await api.getCollectionAnalysis(id);
      setAnalysis(data);
      
      // If no analysis exists, trigger computation automatically
      if (!data) {
        // Don't await - let it compute in background
        handleComputeAnalysis(false); // force=false for auto-compute
      }
    } catch (err: any) {
      console.error('Failed to load analysis:', err);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleComputeAnalysis = async (force: boolean = true) => {
    if (!id) return;
    
    setComputing(true);
    try {
      const data = await api.computeCollectionAnalysis(id, force);
      setAnalysis(data);
    } catch (err: any) {
      console.error('Failed to compute analysis:', err);
      setError('Failed to compute analysis');
    } finally {
      setComputing(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    
    setDeleting(true);
    try {
      await api.deleteSeries(id);
      navigate('/collections');
    } catch (err: any) {
      console.error('Failed to delete collection:', err);
      setError(err.response?.data?.detail || 'Failed to delete collection');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const getStateLabel = (state: ConversationState) => {
    switch (state) {
      case ConversationState.DRAFT:
        return 'Draft';
      case ConversationState.ACTIVE:
        return 'Active';
      case ConversationState.CLOSED:
        return 'Closed';
      case ConversationState.ANALYZED:
        return 'Analyzed';
      case ConversationState.DELETED:
        return 'Deleted';
      default:
        return state;
    }
  };

  const getStateClass = (state: ConversationState) => {
    switch (state) {
      case ConversationState.DRAFT:
        return 'status-badge status-draft';
      case ConversationState.ACTIVE:
        return 'status-badge status-active';
      case ConversationState.CLOSED:
        return 'status-badge status-closed';
      case ConversationState.ANALYZED:
        return 'status-badge status-analyzed';
      default:
        return 'status-badge';
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading">Loading collection...</div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="dashboard-page">
        <div className="error-message">{error || 'Collection not found'}</div>
        <Link to="/collections" className="btn btn-secondary">
          Back to Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <Link to="/collections" style={{ color: '#4299e1', textDecoration: 'none' }}>
              ← Back to Collections
            </Link>
          </div>
          <h1>{collection.name}</h1>
          {collection.description && (
            <p className="description">{collection.description}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={() => handleComputeAnalysis(true)}
            disabled={computing}
            className={analysis ? "btn btn-secondary" : "btn btn-primary"}
          >
            {computing ? (analysis ? 'Re-running analysis...' : 'Running analysis...') : (analysis ? 'Re-run analysis' : 'Run Analysis')}
          </button>
          <button
            className="btn btn-danger"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete Collection
          </button>
        </div>
      </header>

      {/* Analysis Section */}
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Collection Insights</h2>

        {loadingAnalysis || computing ? (
          <div className="loading">Loading analysis...</div>
        ) : analysis ? (
          <div className="analysis-section">
            {/* Summary */}
            {analysis.overall_summary && (
              <div className="summary-card" style={{ 
                background: '#f7fafc', 
                padding: '1.5rem', 
                borderRadius: '8px', 
                marginBottom: '1.5rem' 
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '0.75rem' }}>Summary</h3>
                <p style={{ margin: 0, lineHeight: '1.6' }}>{analysis.overall_summary}</p>
              </div>
            )}

            {/* Surprising Insights */}
            {analysis.surprising_insights && analysis.surprising_insights.length > 0 && (
              <div className="insights-card" style={{ 
                background: '#f7fafc', 
                padding: '1.5rem', 
                borderRadius: '8px', 
                marginBottom: '1.5rem' 
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Key Insights</h3>
                {analysis.surprising_insights.map((insight, idx) => (
                  <div key={idx} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: idx < analysis.surprising_insights!.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600 }}>
                      {insight.title}
                    </h4>
                    <p style={{ margin: 0, color: '#4a5568', lineHeight: '1.6' }}>
                      {insight.description}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Trends Visualization */}
            {analysis.trends && analysis.trends.themes && analysis.trends.themes.length > 0 && (
              <div className="trends-card" style={{ 
                background: '#f7fafc', 
                padding: '1.5rem', 
                borderRadius: '8px', 
                marginBottom: '1.5rem' 
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Trends Over Time</h3>
                <TrendChart trends={analysis.trends} />
              </div>
            )}

            {/* Stats */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginBottom: '1.5rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ 
                padding: '1rem', 
                background: 'white', 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0',
                minWidth: '150px'
              }}>
                <div style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '0.25rem' }}>
                  Conversations
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                  {analysis.total_conversations}
                </div>
              </div>
              <div style={{ 
                padding: '1rem', 
                background: 'white', 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0',
                minWidth: '150px'
              }}>
                <div style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '0.25rem' }}>
                  Total Responses
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                  {analysis.total_responses}
                </div>
              </div>
              <div style={{ 
                padding: '1rem', 
                background: 'white', 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0',
                minWidth: '150px'
              }}>
                <div style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '0.25rem' }}>
                  Analyzed
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
                  {analysis.conversations_analyzed}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <p>No analysis computed yet.</p>
            <button 
              onClick={() => handleComputeAnalysis(true)} 
              disabled={computing}
              className="btn btn-primary"
            >
              {computing ? 'Running analysis...' : 'Run Analysis'}
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>
          Conversations
        </h2>

        {collection.conversations.length === 0 ? (
          <div className="empty-state">
            <h3>No conversations in this collection</h3>
            <p>Conversations added to this collection will appear here</p>
          </div>
        ) : (
          <div className="conversation-grid">
            {collection.conversations.map((conv: ConversationListItem) => (
              <div 
                key={conv.id} 
                className="conversation-card"
                onClick={() => navigate(`/conversations/${conv.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="conversation-card-header">
                  <h3>
                    <span className="conversation-link">
                      {conv.title}
                    </span>
                  </h3>
                  <span className={getStateClass(conv.state)}>
                    {getStateLabel(conv.state)}
                  </span>
                </div>
                <div className="conversation-card-meta">
                  <span>Created {formatDateShort(conv.created_at)}</span>
                  {conv.activated_at && (
                    <span>• Activated {formatDateShort(conv.activated_at)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem', color: '#9b2c2c' }}>Delete Collection</h2>
            <p style={{ marginBottom: '1rem', color: '#718096' }}>
              Are you sure you want to delete the collection <strong>{collection.name}</strong>?
            </p>
            <p style={{ marginBottom: '1.5rem', color: '#718096' }}>
              This action cannot be undone. The collection will be deleted, but all conversations in it will remain and will no longer be part of any collection.
            </p>
            <div className="modal-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setError('');
                }}
                className="btn btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
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

export default function CollectionDetailPage() {
  const [isNewDesign, setIsNewDesign] = useState(true);

  return (
    <>
      <DesignToggle
        isNewDesign={isNewDesign}
        onToggle={() => setIsNewDesign(!isNewDesign)}
      />
      {isNewDesign ? <CollectionDetailPageNew /> : <CollectionDetailPageOld />}
    </>
  );
}


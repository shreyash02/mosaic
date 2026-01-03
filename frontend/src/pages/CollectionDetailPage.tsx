import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { SeriesWithConversations, ConversationListItem } from '../types';
import { ConversationState } from '../types';
import { formatDateShort } from '../utils/formatting';

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<SeriesWithConversations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadCollection();
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
      </header>

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
    </div>
  );
}


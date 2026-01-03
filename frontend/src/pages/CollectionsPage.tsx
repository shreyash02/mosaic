import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Series, SeriesWithConversations } from '../types';
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

  useEffect(() => {
    loadCollections();
  }, [currentOrgId]);

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
      </header>

      {error && <div className="error-message">{error}</div>}

      {collections.length === 0 ? (
        <div className="empty-state">
          <h3>No collections yet</h3>
          <p>Collections help you group related conversations and analyze trends over time</p>
          <p style={{ marginTop: '0.5rem', color: '#718096' }}>
            Create collections when creating or editing conversations
          </p>
        </div>
      ) : (
        <div className="organization-grid">
          {collections.map((collection) => (
            <div 
              key={collection.id} 
              className="organization-card"
              onClick={() => handleCardClick(collection.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="card-header">
                <h3>{collection.name}</h3>
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
          ))}
        </div>
      )}
    </div>
  );
}


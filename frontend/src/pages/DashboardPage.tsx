import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { ConversationListItem } from '../types';
import { ConversationState } from '../types';
import { formatDateShort } from '../utils/formatting';

export default function DashboardPage() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (err: any) {
      setError('Failed to load conversations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const getStateLabel = (state: ConversationState) => {
    const labels: Record<ConversationState, string> = {
      [ConversationState.DRAFT]: 'Draft',
      [ConversationState.ACTIVE]: 'Active',
      [ConversationState.CLOSED]: 'Closed',
      [ConversationState.ANALYZED]: 'Analyzed',
      [ConversationState.DELETED]: 'Deleted',
    };
    return labels[state];
  };

  const getStateClass = (state: ConversationState) => {
    const classes: Record<ConversationState, string> = {
      [ConversationState.DRAFT]: 'status-draft',
      [ConversationState.ACTIVE]: 'status-active',
      [ConversationState.CLOSED]: 'status-closed',
      [ConversationState.ANALYZED]: 'status-analyzed',
      [ConversationState.DELETED]: 'status-deleted',
    };
    return classes[state];
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
        </div>
        <div className="header-actions">
          <Link to="/conversations/new" className="btn btn-primary">
            + New Conversation
          </Link>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Loading conversations...</div>
      ) : conversations.length === 0 ? (
        <div className="empty-state">
          <h3>No conversations yet</h3>
          <p>Create your first conversation to start collecting feedback</p>
          <Link to="/conversations/new" className="btn btn-primary">
            Create Conversation
          </Link>
        </div>
      ) : (
        <div className="conversations-list">
          <h2>Your Conversations</h2>
          <div className="conversation-grid">
            {conversations.map((conversation) => (
              <Link
                key={conversation.id}
                to={`/conversations/${conversation.id}`}
                className="conversation-card"
              >
                <div className="card-header">
                  <h3>{conversation.title}</h3>
                  <span className={`status-badge ${getStateClass(conversation.state)}`}>
                    {getStateLabel(conversation.state)}
                  </span>
                </div>
                <div className="card-body">
                  <div className="conversation-meta">
                    <span>Access Code: <strong>{conversation.access_code}</strong></span>
                    <span>Responses: <strong>{conversation.response_count || 0}</strong></span>
                  </div>
                  <div className="conversation-meta">
                    <span>Created: {formatDateShort(conversation.created_at, conversation.timezone)}</span>
                    {conversation.activated_at && (
                      <span>Activated: {formatDateShort(conversation.activated_at, conversation.timezone)}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

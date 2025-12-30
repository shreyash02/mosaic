import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import type {
  OrganizationWithMembers,
  ConversationListItem,
} from '../types';
import { ConversationState } from '../types';
import { formatDateShort } from '../utils/formatting';

type TabType = 'conversations' | 'members' | 'settings';

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [organization, setOrganization] = useState<OrganizationWithMembers | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('conversations');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadOrganization();
      loadConversations();
    }
  }, [id]);

  const loadOrganization = async () => {
    try {
      const data = await api.getOrganization(id!);
      setOrganization(data);

      // Get current user role
      const currentUser = await api.getCurrentUser();
      const membership = data.members.find(m => m.user_id === currentUser.id);
      setUserRole(membership?.role || null);
    } catch (err: any) {
      console.error('Failed to load organization:', err);
      setError('Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      const data = await api.listOrganizationConversations(id!);
      setConversations(data);
    } catch (err: any) {
      console.error('Failed to load conversations:', err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!organization || userRole !== 'admin') return;

    if (!confirm('Are you sure you want to remove this member?')) return;

    setUpdatingMemberId(userId);
    setError('');
    setSuccess('');

    try {
      await api.removeOrganizationMember(organization.id, userId);
      await loadOrganization(); // Reload to get updated member list
      setSuccess('Member removed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove member');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'member') => {
    if (!organization || userRole !== 'admin') return;

    setUpdatingMemberId(userId);
    setError('');
    setSuccess('');

    try {
      await api.updateOrganizationMemberRole(organization.id, userId, newRole);
      await loadOrganization(); // Reload to get updated member list
      setSuccess(`Member role updated to ${newRole}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update role');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const getStateLabel = (state: ConversationState) => {
    const labels: Record<ConversationState, string> = {
      [ConversationState.DRAFT]: 'Draft',
      [ConversationState.ACTIVE]: 'Active',
      [ConversationState.CLOSED]: 'Closed',
      [ConversationState.ANALYZING]: 'Analyzing',
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
      [ConversationState.ANALYZING]: 'status-analyzing',
      [ConversationState.ANALYZED]: 'status-analyzed',
      [ConversationState.DELETED]: 'status-deleted',
    };
    return classes[state];
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading organization...</div>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="page-container">
        <div className="error-message">{error || 'Organization not found'}</div>
        <Link to="/organizations" className="btn btn-secondary">
          Back to Organizations
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <h1>{organization.name}</h1>
            {userRole && (
              <span className={userRole === 'admin' ? 'status-badge status-active' : 'status-badge status-draft'}>
                {userRole === 'admin' ? 'Admin' : 'Member'}
              </span>
            )}
          </div>
          {organization.description && (
            <p className="description">{organization.description}</p>
          )}
        </div>
        <div className="header-actions">
          {userRole === 'admin' && (
            <>
              <Link to={`/organizations/${organization.id}/invite`} className="btn btn-secondary">
                Invite Members
              </Link>
              <Link to={`/organizations/${organization.id}/settings`} className="btn btn-outline-secondary">
                Settings
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Tabs */}
      <div className="org-tabs">
        <button
          className={`org-tab ${activeTab === 'conversations' ? 'active' : ''}`}
          onClick={() => setActiveTab('conversations')}
        >
          Conversations ({conversations.length})
        </button>
        <button
          className={`org-tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members ({organization.members.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="org-tab-content">
        {activeTab === 'conversations' && (
          <div className="conversations-tab">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Organization Conversations</h2>
              <Link to="/conversations/new" state={{ organizationId: organization.id }} className="btn btn-primary">
                Create Conversation
              </Link>
            </div>

            {conversations.length === 0 ? (
              <div className="empty-state">
                <h3>No conversations yet</h3>
                <p>Create your first conversation for this organization</p>
                <Link to="/conversations/new" state={{ organizationId: organization.id }} className="btn btn-primary">
                  Create Conversation
                </Link>
              </div>
            ) : (
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
                    <div className="conversation-meta">
                      <div>
                        <strong>Code:</strong> {conversation.access_code}
                      </div>
                      <div>
                        <strong>Created:</strong> {formatDateShort(conversation.created_at)}
                      </div>
                    </div>
                    {conversation.response_count !== undefined && (
                      <div className="conversation-meta">
                        <div>
                          <strong>{conversation.response_count}</strong> {conversation.response_count === 1 ? 'response' : 'responses'}
                        </div>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="members-tab">
            <h2>Organization Members</h2>
            <div className="members-table">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '1rem' }}>Member</th>
                    <th style={{ padding: '1rem' }}>Role</th>
                    <th style={{ padding: '1rem' }}>Joined</th>
                    {userRole === 'admin' && <th style={{ padding: '1rem' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {organization.members.map((member) => {
                    const isCreator = member.user_id === organization.created_by;
                    return (
                      <tr key={member.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '1rem' }}>
                          <div>
                            <div style={{ fontWeight: 500 }}>
                              {member.user?.email}
                              {isCreator && <span style={{ marginLeft: '0.5rem', color: '#718096', fontSize: '0.85rem' }}>(Creator)</span>}
                            </div>
                            {member.user?.full_name && (
                              <div style={{ color: '#718096', fontSize: '0.875rem' }}>
                                {member.user.full_name}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span className={member.role === 'admin' ? 'status-badge status-active' : 'status-badge status-draft'}>
                            {member.role === 'admin' ? 'Admin' : 'Member'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: '#718096', fontSize: '0.875rem' }}>
                          {formatDateShort(member.joined_at)}
                        </td>
                        {userRole === 'admin' && (
                          <td style={{ padding: '1rem' }}>
                            {!isCreator && (
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {updatingMemberId === member.user_id ? (
                                  <span style={{ fontSize: '0.875rem', color: '#718096' }}>Updating...</span>
                                ) : (
                                  <>
                                    <select
                                      value={member.role}
                                      onChange={(e) => handleUpdateRole(member.user_id, e.target.value as 'admin' | 'member')}
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', borderRadius: '4px', border: '1px solid #cbd5e0' }}
                                      disabled={updatingMemberId !== null}
                                    >
                                      <option value="member">Member</option>
                                      <option value="admin">Admin</option>
                                    </select>
                                    <button
                                      onClick={() => handleRemoveMember(member.user_id)}
                                      className="btn-remove"
                                      style={{ fontSize: '0.875rem' }}
                                      disabled={updatingMemberId !== null}
                                    >
                                      Remove
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

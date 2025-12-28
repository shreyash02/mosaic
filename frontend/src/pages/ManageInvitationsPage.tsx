import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Conversation, InvitationListResponse } from '../types';
import { formatRelativeTime } from '../utils/formatting';

export default function ManageInvitationsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [invitations, setInvitations] = useState<InvitationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviting, setInviting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [convData, invitationsData] = await Promise.all([
        api.getConversation(id!),
        api.listInvitations(id!).catch(() => null),
      ]);
      setConversation(convData);
      setInvitations(invitationsData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUsers = async () => {
    if (!id || !inviteEmails.trim()) return;
    
    setInviting(true);
    setError('');
    try {
      const emails = inviteEmails
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0 && e.includes('@'));
      
      if (emails.length === 0) {
        setError('Please enter at least one valid email address');
        setInviting(false);
        return;
      }

      await api.inviteUsers(id, emails);
      setInviteEmails('');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to invite users');
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!id) return;
    setDeletingId(invitationId);
    try {
      await api.deleteInvitation(id, invitationId);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete invitation');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="container">
        <div className="card">
          <h1>Conversation Not Found</h1>
          <p>The conversation you're looking for doesn't exist or you don't have access to it.</p>
          <Link to="/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-detail-page">
      <div className="card">
        <div style={{ marginBottom: '2rem' }}>
          <Link to={`/conversations/${id}`} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
            ← Back to Conversation
          </Link>
          <h1>Manage Invitations</h1>
          <p style={{ color: '#666', marginTop: '0.5rem', fontSize: '1rem' }}>
            {conversation.title}
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {/* Invite Form */}
        <div className="card" style={{ marginBottom: '2rem', backgroundColor: '#f9f9f9', padding: '1.5rem' }}>
          <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Send New Invitations</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {conversation.invite_only
              ? 'Invite users by email. Only invited users can access this conversation.'
              : 'Invite specific users by email. They can access the conversation using the share link when logged in.'}
          </p>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="invite-emails" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Email Addresses (comma-separated):
            </label>
            <textarea
              id="invite-emails"
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              placeholder="user1@example.com, user2@example.com"
              rows={4}
              disabled={inviting}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                resize: 'vertical'
              }}
            />
          </div>
          <button
            onClick={handleInviteUsers}
            className="btn btn-primary"
            disabled={inviting || !inviteEmails.trim()}
          >
            {inviting ? 'Sending Invitations...' : 'Send Invitations'}
          </button>
        </div>

        {/* Invitations Table */}
        {invitations && invitations.total_invitations > 0 ? (
          <div>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>
                Sent Invitations ({invitations.accepted_invitations} accepted, {invitations.pending_invitations} pending)
              </h2>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem', color: '#4a5568' }}>
                      Email
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem', color: '#4a5568' }}>
                      Status
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem', color: '#4a5568' }}>
                      Time
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.9rem', color: '#4a5568' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.invitations.map((inv, index) => {
                    // Determine status message
                    let statusMessage = '';
                    let statusClass = '';
                    if (inv.is_accepted) {
                      if (inv.has_submitted_response) {
                        statusMessage = '✓ Accepted & Responded';
                        statusClass = 'accepted responded';
                      } else {
                        statusMessage = '✓ Accepted';
                        statusClass = 'accepted';
                      }
                    } else {
                      statusMessage = 'Pending';
                      statusClass = 'pending';
                    }

                    return (
                      <tr
                        key={inv.id}
                        style={{
                          borderBottom: index < invitations.invitations.length - 1 ? '1px solid #e2e8f0' : 'none',
                          backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                        }}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 500 }}>{inv.email}</span>
                            {inv.invited_user && (
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.25rem 0.5rem',
                                  backgroundColor: '#e6fffa',
                                  color: '#234e52',
                                  borderRadius: '4px',
                                  fontWeight: 500
                                }}
                              >
                                Registered User
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              fontWeight: 500,
                              display: 'inline-block',
                              backgroundColor:
                                statusClass === 'accepted responded'
                                  ? '#c6f6d5'
                                  : statusClass === 'accepted'
                                  ? '#bee3f8'
                                  : '#fed7d7',
                              color:
                                statusClass === 'accepted responded'
                                  ? '#22543d'
                                  : statusClass === 'accepted'
                                  ? '#2c5282'
                                  : '#9b2c2c'
                            }}
                          >
                            {statusMessage}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem', color: '#718096' }}>
                          {inv.is_accepted && inv.accepted_at
                            ? `Accepted ${formatRelativeTime(inv.accepted_at)}`
                            : `Invited ${formatRelativeTime(inv.created_at)}`}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleDeleteInvitation(inv.id)}
                            className="btn btn-small btn-danger"
                            title="Delete invitation"
                            disabled={deletingId === inv.id}
                          >
                            {deletingId === inv.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card" style={{ backgroundColor: '#f9f9f9', textAlign: 'center', padding: '2rem' }}>
            <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>
              No invitations sent yet. Use the form above to invite users.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


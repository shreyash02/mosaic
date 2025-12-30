import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { OrganizationWithMembers, OrganizationInvitationListResponse } from '../types';
import { formatRelativeTime } from '../utils/formatting';

export default function InviteMembersPage() {
  const { id } = useParams<{ id: string }>();
  const [organization, setOrganization] = useState<OrganizationWithMembers | null>(null);
  const [invitations, setInvitations] = useState<OrganizationInvitationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [orgData, invitationsData] = await Promise.all([
        api.getOrganization(id!),
        api.listOrganizationInvitations(id!).catch(() => null),
      ]);
      setOrganization(orgData);
      setInvitations(invitationsData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUsers = async () => {
    if (!id || !inviteEmails.trim()) return;

    setInviting(true);
    setError('');
    setSuccess('');
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

      const response = await api.inviteToOrganization(id, {
        emails,
        role: selectedRole,
      });

      setSuccess(`Successfully sent ${response.invitations_created} invitation${response.invitations_created === 1 ? '' : 's'}!`);
      setInviteEmails('');
      setShowInviteForm(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to invite users');
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="page-container">
        <div className="error-message">Organization not found</div>
        <Link to="/organizations" className="btn btn-secondary">
          Back to Organizations
        </Link>
      </div>
    );
  }

  return (
    <div className="conversation-detail-page">
      <div className="card">
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <Link to={`/organizations/${id}`} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
              ← Back to Organization
            </Link>
            <h1>Invite Members</h1>
            <p style={{ color: '#666', marginTop: '0.5rem', fontSize: '1rem' }}>
              {organization.name}
            </p>
          </div>
          {!showInviteForm && (
            <button
              onClick={() => {
                setShowInviteForm(true);
                setSuccess('');
              }}
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start', marginTop: '2.5rem' }}
            >
              Send New Invitations
            </button>
          )}
        </div>

        {error && (
          <div className="error-message" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="success-message" style={{ marginBottom: '1.5rem' }}>
            {success}
          </div>
        )}

        {/* Invite Form */}
        {showInviteForm && (
          <div className="card" style={{ marginBottom: '2rem', backgroundColor: '#f9f9f9', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Send New Invitations</h2>
              <button
                onClick={() => {
                  setShowInviteForm(false);
                  setInviteEmails('');
                  setError('');
                }}
                className="btn btn-secondary btn-small"
                title="Close"
              >
                ✕ Close
              </button>
            </div>
            <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Invite team members to join this organization. They will receive an email with an invitation link.
            </p>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
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

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="role-select" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Role:
              </label>
              <select
                id="role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'member')}
                disabled={inviting}
                style={{
                  padding: '0.75rem',
                  fontSize: '0.9rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="member">Member - Can create conversations and view organization content</option>
                <option value="admin">Admin - Can manage members and organization settings</option>
              </select>
            </div>

            <button
              onClick={handleInviteUsers}
              className="btn btn-primary"
              disabled={inviting || !inviteEmails.trim()}
            >
              {inviting ? 'Sending Invitations...' : 'Send Invitations'}
            </button>
          </div>
        )}

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
                      Role
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem', color: '#4a5568' }}>
                      Status
                    </th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem', color: '#4a5568' }}>
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.invitations.map((inv, index) => {
                    const statusMessage = inv.is_accepted ? '✓ Accepted' : 'Pending';
                    const statusClass = inv.is_accepted ? 'accepted' : 'pending';

                    return (
                      <tr
                        key={inv.id}
                        style={{
                          borderBottom: index < invitations.invitations.length - 1 ? '1px solid #e2e8f0' : 'none',
                          backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                        }}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}>
                          <span style={{ fontWeight: 500 }}>{inv.email}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}>
                          <span
                            className={inv.role === 'admin' ? 'status-badge status-active' : 'status-badge status-draft'}
                            style={{ fontSize: '0.8rem' }}
                          >
                            {inv.role === 'admin' ? 'Admin' : 'Member'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              fontWeight: 500,
                              display: 'inline-block',
                              backgroundColor: statusClass === 'accepted' ? '#c6f6d5' : '#fed7d7',
                              color: statusClass === 'accepted' ? '#22543d' : '#9b2c2c'
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
              No invitations sent yet. Use the form above to invite team members.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

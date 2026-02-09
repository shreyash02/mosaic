import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Conversation, InvitationListResponse } from '../types';
import { formatRelativeTime } from '../utils/formatting';
import { useOrganization } from '../contexts/OrganizationContext';
import { colors, typography, spacing, borders, transitions } from '../styles';

const styles = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: colors.primary[50],
    padding: spacing[6],
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    color: colors.primary[600],
    textDecoration: 'none',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[4],
    transition: transitions.duration.normal,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[6],
    flexWrap: 'wrap' as const,
    gap: spacing[4],
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.primary[900],
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.primary[600],
  },
  card: {
    backgroundColor: 'white',
    borderRadius: borders.radius.lg,
    border: `1px solid ${colors.primary[200]}`,
    padding: spacing[6],
    marginBottom: spacing[6],
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
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
    marginBottom: spacing[6],
    lineHeight: typography.lineHeight.relaxed,
  },
  formGroup: {
    marginBottom: spacing[5],
  },
  label: {
    display: 'block',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[700],
    marginBottom: spacing[2],
  },
  textarea: {
    width: '100%',
    padding: spacing[3],
    fontSize: typography.fontSize.sm,
    fontFamily: 'inherit',
    border: `1px solid ${colors.primary[300]}`,
    borderRadius: borders.radius.md,
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
    transition: transitions.duration.normal,
  },
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[3]} ${spacing[5]}`,
    backgroundColor: colors.primary[900],
    color: colors.primary[50],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
    textDecoration: 'none',
  },
  buttonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'white',
    color: colors.primary[700],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: `1px solid ${colors.primary[300]}`,
    cursor: 'pointer',
    transition: transitions.duration.normal,
    textDecoration: 'none',
  },
  buttonDanger: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[2]} ${spacing[3]}`,
    backgroundColor: colors.primary[900],
    color: colors.primary[50],
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: 'none',
    cursor: 'pointer',
    transition: transitions.duration.normal,
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  tableHeader: {
    backgroundColor: colors.primary[50],
    borderBottom: `2px solid ${colors.primary[200]}`,
  },
  th: {
    padding: `${spacing[3]} ${spacing[4]}`,
    textAlign: 'left' as const,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[600],
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide,
  },
  thRight: {
    padding: `${spacing[3]} ${spacing[4]}`,
    textAlign: 'right' as const,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[600],
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide,
  },
  td: {
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    color: colors.primary[700],
    borderBottom: `1px solid ${colors.primary[100]}`,
  },
  tdRight: {
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    color: colors.primary[700],
    borderBottom: `1px solid ${colors.primary[100]}`,
    textAlign: 'right' as const,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.full,
  },
  badgeAccepted: {
    backgroundColor: colors.primary[200],
    color: colors.primary[800],
  },
  badgeResponded: {
    backgroundColor: colors.primary[900],
    color: colors.primary[50],
  },
  badgePending: {
    backgroundColor: colors.primary[100],
    color: colors.primary[600],
  },
  badgeRegistered: {
    backgroundColor: colors.primary[100],
    color: colors.primary[700],
    marginLeft: spacing[2],
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: colors.primary[500],
    fontSize: typography.fontSize.sm,
  },
  emptyStateTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginBottom: spacing[2],
  },
  emptyStateText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[500],
    marginBottom: spacing[4],
  },
  error: {
    backgroundColor: colors.primary[100],
    border: `1px solid ${colors.primary[300]}`,
    color: colors.primary[900],
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  loading: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: colors.primary[500],
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[900],
    marginBottom: spacing[4],
  },
  statText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
  },
};

const hoverStyles = `
  .manage-back-link:hover {
    color: ${colors.primary[900]};
  }
  .manage-input:focus {
    border-color: ${colors.primary[500]};
    box-shadow: 0 0 0 3px ${colors.primary[100]};
    outline: none;
  }
  .manage-btn-primary:hover:not(:disabled) {
    background-color: ${colors.primary[800]};
  }
  .manage-btn-secondary:hover:not(:disabled) {
    background-color: ${colors.primary[50]};
    border-color: ${colors.primary[400]};
  }
  .manage-btn-danger:hover:not(:disabled) {
    background-color: ${colors.primary[700]};
  }
  .manage-table-row:hover {
    background-color: ${colors.primary[50]};
  }
`;

export default function ManageInvitationsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrgId } = useOrganization();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [invitations, setInvitations] = useState<InvitationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviting, setInviting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);

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
      setShowInviteForm(false);
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
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.loading}>Loading...</div>
          </div>
        </div>
      </>
    );
  }

  const conversationOrgId = conversation?.organization_id || null;
  const wrongWorkspace = conversation && conversationOrgId !== currentOrgId;

  if (!conversation || wrongWorkspace) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.card}>
              <h2 style={styles.emptyStateTitle}>Conversation Not Found</h2>
              <p style={styles.emptyStateText}>
                This conversation doesn't exist or you don't have access to it.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                style={styles.buttonSecondary}
                className="manage-btn-secondary"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.page}>
        <div style={styles.container}>
          <Link to={`/conversations/${id}`} style={styles.backLink} className="manage-back-link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 12L6 8L10 4" />
            </svg>
            Back to Conversation
          </Link>

          <header style={styles.header}>
            <div style={styles.headerInfo}>
              <h1 style={styles.title}>Manage Invitations</h1>
              <p style={styles.subtitle}>{conversation.title}</p>
            </div>
            {!showInviteForm && (
              <button
                onClick={() => setShowInviteForm(true)}
                style={styles.buttonPrimary}
                className="manage-btn-primary"
              >
                Send Invitations
              </button>
            )}
          </header>

          {error && <div style={styles.error}>{error}</div>}

          {/* Invite Form */}
          {showInviteForm && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>Send New Invitations</h2>
                <button
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteEmails('');
                    setError('');
                  }}
                  style={styles.buttonSecondary}
                  className="manage-btn-secondary"
                >
                  Close
                </button>
              </div>
              <p style={styles.cardDescription}>
                {conversation.invite_only
                  ? 'Invite users by email. Only invited users can access this conversation.'
                  : 'Invite specific users by email. They can access the conversation using the share link when logged in.'}
              </p>

              <div style={styles.formGroup}>
                <label htmlFor="invite-emails" style={styles.label}>
                  Email Addresses (comma-separated)
                </label>
                <textarea
                  id="invite-emails"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  placeholder="user1@example.com, user2@example.com"
                  rows={4}
                  disabled={inviting}
                  style={styles.textarea}
                  className="manage-input"
                />
              </div>

              <button
                onClick={handleInviteUsers}
                style={{
                  ...styles.buttonPrimary,
                  ...(inviting || !inviteEmails.trim() ? styles.buttonDisabled : {}),
                }}
                className="manage-btn-primary"
                disabled={inviting || !inviteEmails.trim()}
              >
                {inviting ? 'Sending Invitations...' : 'Send Invitations'}
              </button>
            </div>
          )}

          {/* Invitations Table */}
          {invitations && invitations.total_invitations > 0 ? (
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] }}>
                <h2 style={styles.sectionTitle}>Sent Invitations</h2>
                <span style={styles.statText}>
                  {invitations.accepted_invitations} accepted, {invitations.pending_invitations} pending
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Time</th>
                      <th style={styles.thRight}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.invitations.map((inv) => {
                      const getStatusBadge = () => {
                        if (inv.is_accepted) {
                          if (inv.has_submitted_response) {
                            return { style: styles.badgeResponded, text: 'Accepted & Responded' };
                          }
                          return { style: styles.badgeAccepted, text: 'Accepted' };
                        }
                        return { style: styles.badgePending, text: 'Pending' };
                      };
                      const statusBadge = getStatusBadge();

                      return (
                        <tr key={inv.id} className="manage-table-row">
                          <td style={{ ...styles.td, fontWeight: typography.fontWeight.medium }}>
                            {inv.email}
                            {inv.invited_user && (
                              <span style={{ ...styles.badge, ...styles.badgeRegistered }}>
                                Registered
                              </span>
                            )}
                          </td>
                          <td style={styles.td}>
                            <span style={{ ...styles.badge, ...statusBadge.style }}>
                              {statusBadge.text}
                            </span>
                          </td>
                          <td style={{ ...styles.td, color: colors.primary[500] }}>
                            {inv.is_accepted && inv.accepted_at
                              ? `Accepted ${formatRelativeTime(inv.accepted_at)}`
                              : `Invited ${formatRelativeTime(inv.created_at)}`}
                          </td>
                          <td style={styles.tdRight}>
                            <button
                              onClick={() => handleDeleteInvitation(inv.id)}
                              style={{
                                ...styles.buttonDanger,
                                ...(deletingId === inv.id ? styles.buttonDisabled : {}),
                              }}
                              className="manage-btn-danger"
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
            <div style={styles.card}>
              <div style={styles.emptyState}>
                No invitations sent yet. Use the button above to invite users.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

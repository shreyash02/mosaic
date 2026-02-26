import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import type { OrganizationWithMembers, OrganizationInvitationListResponse } from '../types';
import { formatRelativeTime } from '../utils/formatting';
import { typography, spacing, borders, transitions } from '../styles';
import { SkeletonInvitationPage } from '../components/Skeleton';
import CustomSelect from '../components/CustomSelect';

const styles = {
  page: {
    minHeight: 'calc(100vh - var(--header-height))',
    backgroundColor: 'var(--color-primary-50)',
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
    color: 'var(--color-primary-600)',
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
    color: 'var(--color-primary-900)',
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: 'var(--color-primary-600)',
  },
  card: {
    backgroundColor: 'var(--color-primary-50)',
    borderRadius: borders.radius.lg,
    border: `1px solid ${'var(--color-primary-200)'}`,
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
    color: 'var(--color-primary-900)',
    margin: 0,
  },
  cardDescription: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
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
    color: 'var(--color-primary-700)',
    marginBottom: spacing[2],
  },
  textarea: {
    width: '100%',
    padding: spacing[3],
    fontSize: typography.fontSize.sm,
    fontFamily: 'inherit',
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
    transition: transitions.duration.normal,
  },
  select: {
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    border: `1px solid ${'var(--color-primary-300)'}`,
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    cursor: 'pointer',
    minWidth: '300px',
  },
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${spacing[3]} ${spacing[5]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
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
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-700)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    border: `1px solid ${'var(--color-primary-300)'}`,
    cursor: 'pointer',
    transition: transitions.duration.normal,
    textDecoration: 'none',
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
    backgroundColor: 'var(--color-primary-50)',
    borderBottom: `2px solid ${'var(--color-primary-200)'}`,
  },
  th: {
    padding: `${spacing[3]} ${spacing[4]}`,
    textAlign: 'left' as const,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-600)',
    textTransform: 'uppercase' as const,
    letterSpacing: typography.letterSpacing.wide,
  },
  td: {
    padding: `${spacing[3]} ${spacing[4]}`,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    borderBottom: `1px solid ${'var(--color-primary-100)'}`,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.full,
  },
  badgeAdmin: {
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
  },
  badgeMember: {
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-700)',
  },
  badgeAccepted: {
    backgroundColor: 'var(--color-primary-200)',
    color: 'var(--color-primary-800)',
  },
  badgePending: {
    backgroundColor: 'var(--color-primary-100)',
    color: 'var(--color-primary-600)',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: 'var(--color-primary-500)',
    fontSize: typography.fontSize.sm,
  },
  error: {
    backgroundColor: 'var(--color-primary-100)',
    border: `1px solid ${'var(--color-primary-300)'}`,
    color: 'var(--color-primary-900)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  success: {
    backgroundColor: 'var(--color-primary-100)',
    border: `1px solid ${'var(--color-primary-400)'}`,
    color: 'var(--color-primary-900)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  loading: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: 'var(--color-primary-500)',
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    marginBottom: spacing[4],
  },
  statText: {
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-600)',
  },
};

const hoverStyles = `
  .invite-back-link:hover {
    color: ${'var(--color-primary-900)'};
  }
  .invite-input:focus {
    border-color: ${'var(--color-primary-500)'};
    box-shadow: 0 0 0 3px ${'var(--color-primary-100)'};
    outline: none;
  }
  .invite-btn-primary:hover:not(:disabled) {
    background-color: ${'var(--color-primary-800)'};
  }
  .invite-btn-secondary:hover:not(:disabled) {
    background-color: ${'var(--color-primary-50)'};
    border-color: ${'var(--color-primary-400)'};
  }
  .invite-table-row:hover {
    background-color: ${'var(--color-primary-50)'};
  }
`;

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
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <SkeletonInvitationPage />
          </div>
        </div>
      </>
    );
  }

  if (!organization) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.error}>Organization not found</div>
            <Link to="/organizations" style={styles.buttonSecondary} className="invite-btn-secondary">
              Back to Organizations
            </Link>
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
          <Link to={`/organizations/${id}`} style={styles.backLink} className="invite-back-link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 12L6 8L10 4" />
            </svg>
            Back to Organization
          </Link>

          <header style={styles.header}>
            <div style={styles.headerInfo}>
              <h1 style={styles.title}>Invite Members</h1>
              <p style={styles.subtitle}>{organization.name}</p>
            </div>
            {!showInviteForm && (
              <button
                onClick={() => {
                  setShowInviteForm(true);
                  setSuccess('');
                }}
                style={styles.buttonPrimary}
                className="invite-btn-primary"
              >
                Send New Invitations
              </button>
            )}
          </header>

          {error && <div style={styles.error}>{error}</div>}
          {success && <div style={styles.success}>{success}</div>}

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
                  className="invite-btn-secondary"
                >
                  Close
                </button>
              </div>
              <p style={styles.cardDescription}>
                Invite team members to join this organization. They will receive an email with an invitation link.
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
                  className="invite-input"
                />
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="role-select" style={styles.label}>
                  Role
                </label>
                <CustomSelect
                  id="role-select"
                  value={selectedRole}
                  onChange={(val) => setSelectedRole(val as 'admin' | 'member')}
                  options={[
                    { value: 'member', label: 'Member - Can create conversations and view organization content' },
                    { value: 'admin', label: 'Admin - Can manage members and organization settings' },
                  ]}
                />
              </div>

              <button
                onClick={handleInviteUsers}
                style={{
                  ...styles.buttonPrimary,
                  ...(inviting || !inviteEmails.trim() ? styles.buttonDisabled : {}),
                }}
                className="invite-btn-primary"
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
                      <th style={styles.th}>Role</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.invitations.map((inv) => (
                      <tr key={inv.id} className="invite-table-row">
                        <td style={{ ...styles.td, fontWeight: typography.fontWeight.medium }}>
                          {inv.email}
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            ...(inv.role === 'admin' ? styles.badgeAdmin : styles.badgeMember),
                          }}>
                            {inv.role === 'admin' ? 'Admin' : 'Member'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            ...(inv.is_accepted ? styles.badgeAccepted : styles.badgePending),
                          }}>
                            {inv.is_accepted ? 'Accepted' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ ...styles.td, color: 'var(--color-primary-500)' }}>
                          {inv.is_accepted && inv.accepted_at
                            ? `Accepted ${formatRelativeTime(inv.accepted_at)}`
                            : `Invited ${formatRelativeTime(inv.created_at)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={styles.card}>
              <div style={styles.emptyState}>
                No invitations sent yet. Use the form above to invite team members.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

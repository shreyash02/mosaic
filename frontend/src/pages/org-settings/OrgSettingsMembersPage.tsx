import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useOrgSettings } from './OrgSettingsLayout';
import { formatDateShort } from '../../utils/formatting';
import { typography, spacing, borders, transitions } from '../../styles';

const styles = {
  card: {
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.lg,
    padding: spacing[6],
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  cardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: 'var(--color-primary-900)',
    margin: 0,
  },
  inviteButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[4]}`,
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    textDecoration: 'none',
    transition: transitions.duration.normal,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    padding: spacing[4],
    textAlign: 'left' as const,
    fontWeight: typography.fontWeight.medium,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    borderBottom: '2px solid var(--color-primary-300)',
  },
  td: {
    padding: spacing[4],
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    borderBottom: '1px solid var(--color-primary-200)',
  },
  badge: {
    display: 'inline-block',
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
    backgroundColor: 'var(--color-primary-200)',
    color: 'var(--color-primary-700)',
  },
  successMessage: {
    backgroundColor: 'var(--color-success-light)',
    border: '1px solid var(--color-success)',
    color: 'var(--color-success-text)',
    padding: spacing[3],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  errorMessage: {
    backgroundColor: 'var(--color-error-light)',
    border: '1px solid var(--color-error)',
    color: 'var(--color-error-text)',
    padding: spacing[3],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
  roleSelect: {
    padding: `${spacing[1]} ${spacing[2]}`,
    fontSize: typography.fontSize.sm,
    border: '1px solid var(--color-primary-400)',
    borderRadius: borders.radius.sm,
    backgroundColor: 'var(--color-primary-50)',
  },
  removeButton: {
    padding: `${spacing[1]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-error)',
    backgroundColor: 'transparent',
    border: '1px solid var(--color-error)',
    borderRadius: borders.radius.sm,
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    gap: spacing[2],
    alignItems: 'center',
  },
};

const hoverStyles = `
  .org-members-invite:hover {
    background-color: var(--color-primary-800);
  }
  .org-members-remove:hover {
    background-color: var(--color-error);
    color: white;
  }
`;

export default function OrgSettingsMembersPage() {
  const { organization, refreshOrganization } = useOrgSettings();
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    setUpdatingMemberId(userId);
    setError('');
    setSuccess('');

    try {
      await api.removeOrganizationMember(organization.id, userId);
      await refreshOrganization();
      setSuccess('Member removed successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove member');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'member') => {
    setUpdatingMemberId(userId);
    setError('');
    setSuccess('');

    try {
      await api.updateOrganizationMemberRole(organization.id, userId, newRole);
      await refreshOrganization();
      setSuccess(`Member role updated to ${newRole}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update role');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.cardTitle}>Members ({organization.members.length})</h2>
          <Link
            to={`/organizations/${organization.id}/invite`}
            style={styles.inviteButton}
            className="org-members-invite"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
            Invite Members
          </Link>
        </div>

        {success && <div style={styles.successMessage}>{success}</div>}
        {error && <div style={styles.errorMessage}>{error}</div>}

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Member</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Joined</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {organization.members.map((member) => {
              const memberIsCreator = member.user_id === organization.created_by;
              return (
                <tr key={member.id}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                      {member.user?.full_name || member.user?.email}
                      {memberIsCreator && (
                        <span style={{ marginLeft: spacing[2], color: 'var(--color-primary-500)', fontSize: typography.fontSize.xs }}>
                          (Creator)
                        </span>
                      )}
                    </div>
                    {member.user?.full_name && member.user?.email && (
                      <div style={{ color: 'var(--color-primary-500)', fontSize: typography.fontSize.xs }}>
                        {member.user.email}
                      </div>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      ...(member.role === 'admin' ? styles.badgeAdmin : styles.badgeMember),
                    }}>
                      {member.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </td>
                  <td style={styles.td}>{formatDateShort(member.joined_at)}</td>
                  <td style={styles.td}>
                    {!memberIsCreator && (
                      <div style={styles.actions}>
                        {updatingMemberId === member.user_id ? (
                          <span style={{ color: 'var(--color-primary-500)' }}>Updating...</span>
                        ) : (
                          <>
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateRole(member.user_id, e.target.value as 'admin' | 'member')}
                              disabled={updatingMemberId !== null}
                              style={styles.roleSelect}
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              onClick={() => handleRemoveMember(member.user_id)}
                              disabled={updatingMemberId !== null}
                              style={styles.removeButton}
                              className="org-members-remove"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

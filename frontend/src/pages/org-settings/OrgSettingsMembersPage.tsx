import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useOrgSettings } from './OrgSettingsLayout';
import { formatDateShort } from '../../utils/formatting';
import { typography, spacing, borders, transitions, shadows } from '../../styles';

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
  toast: {
    position: 'fixed' as const,
    bottom: spacing[6],
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[3]} ${spacing[5]}`,
    borderRadius: borders.radius.md,
    boxShadow: shadows.lg,
    zIndex: 1000,
    animation: 'slideUp 0.3s ease-out',
  },
  toastSuccess: {
    backgroundColor: 'var(--color-primary-900)',
    color: 'var(--color-primary-50)',
  },
  toastError: {
    backgroundColor: 'var(--color-error)',
    color: 'white',
  },
  toastIcon: {
    width: '18px',
    height: '18px',
    flexShrink: 0,
  },
  toastMessage: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  roleSelectWrapper: {
    position: 'relative' as const,
  },
  roleSelectTrigger: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    border: '1px solid var(--color-primary-300)',
    borderRadius: borders.radius.md,
    backgroundColor: 'var(--color-primary-50)',
    color: 'var(--color-primary-700)',
    cursor: 'pointer',
    transition: transitions.duration.fast,
    minWidth: '100px',
    justifyContent: 'space-between',
  },
  roleSelectDropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    marginTop: spacing[1],
    backgroundColor: 'var(--color-primary-50)',
    border: '1px solid var(--color-primary-200)',
    borderRadius: borders.radius.md,
    boxShadow: shadows.md,
    zIndex: 100,
    minWidth: '120px',
    overflow: 'hidden',
  },
  roleSelectOption: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[2],
    padding: `${spacing[2]} ${spacing[3]}`,
    fontSize: typography.fontSize.sm,
    color: 'var(--color-primary-700)',
    cursor: 'pointer',
    transition: transitions.duration.fast,
    border: 'none',
    backgroundColor: 'transparent',
    width: '100%',
    textAlign: 'left' as const,
  },
  roleSelectOptionSelected: {
    backgroundColor: 'var(--color-primary-100)',
    fontWeight: typography.fontWeight.medium,
  },
  roleSelectCheck: {
    width: '16px',
    color: 'var(--color-primary-600)',
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
  .org-members-role-trigger:hover {
    border-color: var(--color-primary-400);
    background-color: var(--color-primary-100);
  }
  .org-members-role-option:hover {
    background-color: var(--color-primary-100);
  }
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
`;

export default function OrgSettingsMembersPage() {
  const { organization, updateMemberRole, removeMember } = useOrgSettings();
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    setUpdatingMemberId(userId);
    setError('');
    setSuccess('');

    try {
      await api.removeOrganizationMember(organization.id, userId);
      // Optimistically update UI
      removeMember(userId);
      setSuccess('Member removed');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove member');
      setTimeout(() => setError(''), 3000);
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
      // Optimistically update UI
      updateMemberRole(userId, newRole);
      setSuccess(`Role changed to ${newRole === 'admin' ? 'Admin' : 'Member'}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update role');
      setTimeout(() => setError(''), 3000);
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
                            <div
                              style={styles.roleSelectWrapper}
                              ref={openDropdownId === member.user_id ? dropdownRef : null}
                            >
                              <button
                                type="button"
                                onClick={() => setOpenDropdownId(openDropdownId === member.user_id ? null : member.user_id)}
                                style={styles.roleSelectTrigger}
                                className="org-members-role-trigger"
                                disabled={updatingMemberId !== null}
                              >
                                <span>{member.role === 'admin' ? 'Admin' : 'Member'}</span>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                                  <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              {openDropdownId === member.user_id && (
                                <div style={styles.roleSelectDropdown}>
                                  {(['member', 'admin'] as const).map((role) => (
                                    <button
                                      key={role}
                                      type="button"
                                      onClick={() => {
                                        if (role !== member.role) {
                                          handleUpdateRole(member.user_id, role);
                                        }
                                        setOpenDropdownId(null);
                                      }}
                                      style={{
                                        ...styles.roleSelectOption,
                                        ...(member.role === role ? styles.roleSelectOptionSelected : {}),
                                      }}
                                      className="org-members-role-option"
                                    >
                                      <span style={styles.roleSelectCheck}>
                                        {member.role === role ? '✓' : ''}
                                      </span>
                                      <span>{role === 'admin' ? 'Admin' : 'Member'}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
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

      {/* Toast notification */}
      {(success || error) && (
        <div style={{
          ...styles.toast,
          ...(success ? styles.toastSuccess : styles.toastError),
        }}>
          {success ? (
            <svg style={styles.toastIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg style={styles.toastIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          )}
          <span style={styles.toastMessage}>{success || error}</span>
        </div>
      )}
    </>
  );
}

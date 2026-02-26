import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { api } from '../services/api';
import type { OrganizationWithMembers } from '../types';
import { formatDateShort } from '../utils/formatting';
import { typography, spacing, borders, transitions } from '../styles/tokens';
import { useOrganization } from '../contexts/OrganizationContext';
import CustomSelect from '../components/CustomSelect';

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { currentOrgId, loading: orgContextLoading } = useOrganization();
  const [organization, setOrganization] = useState<OrganizationWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  // Redirect if user hasn't switched to this organization
  if (!orgContextLoading && currentOrgId !== id) {
    return <Navigate to="/dashboard" replace />;
  }

  const styles = {
    page: {
      minHeight: 'calc(100vh - var(--header-height))',
      backgroundColor: 'var(--color-primary-100)',
      padding: spacing[8],
    },
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing[6],
    },
    titleRow: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing[4],
      marginBottom: spacing[2],
    },
    title: {
      fontSize: typography.fontSize['3xl'],
      fontWeight: typography.fontWeight.bold,
      color: 'var(--color-primary-900)',
      margin: 0,
    },
    badge: {
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
    description: {
      fontSize: typography.fontSize.base,
      color: 'var(--color-primary-600)',
      margin: 0,
    },
    headerActions: {
      display: 'flex',
      gap: spacing[3],
    },
    secondaryButton: {
      display: 'inline-block',
      padding: `${spacing[3]} ${spacing[6]}`,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: 'var(--color-primary-700)',
      backgroundColor: 'var(--color-primary-50)',
      border: `${borders.width.thin} solid ${'var(--color-primary-400)'}`,
      borderRadius: borders.radius.md,
      cursor: 'pointer',
      textDecoration: 'none',
      transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
    },
    outlineButton: {
      display: 'inline-block',
      padding: `${spacing[3]} ${spacing[6]}`,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: 'var(--color-primary-600)',
      backgroundColor: 'transparent',
      border: `${borders.width.thin} solid ${'var(--color-primary-400)'}`,
      borderRadius: borders.radius.md,
      cursor: 'pointer',
      textDecoration: 'none',
      transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
    },
    content: {
      backgroundColor: 'var(--color-primary-50)',
      borderRadius: borders.radius.lg,
      border: `${borders.width.thin} solid ${'var(--color-primary-300)'}`,
      padding: spacing[6],
    },
    sectionTitle: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.semibold,
      color: 'var(--color-primary-900)',
      margin: 0,
      marginBottom: spacing[4],
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: spacing[4],
      marginBottom: spacing[6],
    },
    statCard: {
      backgroundColor: 'var(--color-primary-100)',
      borderRadius: borders.radius.md,
      padding: spacing[4],
      textAlign: 'center' as const,
    },
    statValue: {
      fontSize: typography.fontSize['2xl'],
      fontWeight: typography.fontWeight.bold,
      color: 'var(--color-primary-900)',
      marginBottom: spacing[1],
    },
    statLabel: {
      fontSize: typography.fontSize.sm,
      color: 'var(--color-primary-600)',
    },
    infoGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: spacing[6],
    },
    infoItem: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: spacing[1],
    },
    infoLabel: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      color: 'var(--color-primary-500)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    },
    infoValue: {
      fontSize: typography.fontSize.base,
      color: 'var(--color-primary-900)',
    },
    logoPreview: {
      width: '64px',
      height: '64px',
      objectFit: 'contain' as const,
      borderRadius: borders.radius.md,
      border: `1px solid var(--color-primary-200)`,
      backgroundColor: 'var(--color-primary-50)',
    },
    section: {
      marginBottom: spacing[6],
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
      borderBottom: `2px solid ${'var(--color-primary-300)'}`,
    },
    td: {
      padding: spacing[4],
      fontSize: typography.fontSize.sm,
      color: 'var(--color-primary-700)',
      borderBottom: `${borders.width.thin} solid ${'var(--color-primary-200)'}`,
    },
    errorMessage: {
      backgroundColor: 'var(--color-error-light)',
      border: `${borders.width.thin} solid ${'var(--color-error)'}`,
      borderRadius: borders.radius.md,
      padding: spacing[4],
      color: 'var(--color-error-text)',
      marginBottom: spacing[4],
    },
    successMessage: {
      backgroundColor: 'var(--color-success-light)',
      border: `${borders.width.thin} solid ${'var(--color-success)'}`,
      borderRadius: borders.radius.md,
      padding: spacing[4],
      color: 'var(--color-success-text)',
      marginBottom: spacing[4],
    },
  };

  useEffect(() => {
    if (id) {
      loadOrganization();
    }
  }, [id]);

  const loadOrganization = async () => {
    try {
      const data = await api.getOrganization(id!);
      setOrganization(data);

      const currentUser = await api.getCurrentUser();
      const membership = data.members.find(m => m.user_id === currentUser.id);
      const isCreator = String(data.created_by) === String(currentUser.id);

      setUserRole(isCreator ? 'admin' : membership?.role || null);
    } catch {
      setError('Failed to load organization');
    } finally {
      setLoading(false);
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
      await loadOrganization();
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
      await loadOrganization();
      setSuccess(`Member role updated to ${newRole}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update role');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={{ textAlign: 'center', padding: spacing[12], color: 'var(--color-primary-600)' }}>
            Loading organization...
          </div>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.errorMessage}>{error || 'Organization not found'}</div>
          <Link to="/organizations" style={styles.secondaryButton}>
            Back to Organizations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <div style={styles.titleRow}>
              <h1 style={styles.title}>{organization.name}</h1>
              {userRole && (
                <span style={{
                  ...styles.badge,
                  ...(userRole === 'admin' ? styles.badgeAdmin : styles.badgeMember),
                }}>
                  {userRole === 'admin' ? 'Admin' : 'Member'}
                </span>
              )}
            </div>
            {organization.description && (
              <p style={styles.description}>{organization.description}</p>
            )}
          </div>
          {userRole === 'admin' && (
            <div style={styles.headerActions}>
              <Link
                to={`/organizations/${organization.id}/invite`}
                style={styles.secondaryButton}
                className="org-detail-secondary-btn"
              >
                Invite Members
              </Link>
              <Link
                to={`/organizations/${organization.id}/settings`}
                style={styles.outlineButton}
                className="org-detail-outline-btn"
              >
                Settings
              </Link>
            </div>
          )}
        </header>

        {error && <div style={styles.errorMessage}>{error}</div>}
        {success && <div style={styles.successMessage}>{success}</div>}

        {/* Overview */}
        <div style={{ ...styles.content, ...styles.section }}>
          <h2 style={styles.sectionTitle}>Overview</h2>

          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>{organization.members.length}</div>
              <div style={styles.statLabel}>Members</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>
                {organization.members.filter(m => m.role === 'admin').length}
              </div>
              <div style={styles.statLabel}>Admins</div>
            </div>
          </div>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Created</span>
              <span style={styles.infoValue}>{formatDateShort(organization.created_at)}</span>
            </div>
            {organization.brand_name && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Brand Name</span>
                <span style={styles.infoValue}>{organization.brand_name}</span>
              </div>
            )}
            {organization.brand_logo_url && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Logo</span>
                <img
                  src={organization.brand_logo_url}
                  alt={`${organization.name} logo`}
                  style={styles.logoPreview}
                />
              </div>
            )}
          </div>
        </div>

        {/* Members */}
        <div style={styles.content}>
          <h2 style={styles.sectionTitle}>Members ({organization.members.length})</h2>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Member</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Joined</th>
                    {userRole === 'admin' && <th style={styles.th}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {organization.members.map((member) => {
                    const isCreator = member.user_id === organization.created_by;
                    return (
                      <tr key={member.id}>
                        <td style={styles.td}>
                          <div style={{ fontWeight: typography.fontWeight.medium, color: 'var(--color-primary-900)' }}>
                            {member.user?.full_name || member.user?.email}
                            {isCreator && (
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
                        {userRole === 'admin' && (
                          <td style={styles.td}>
                            {!isCreator && (
                              <div style={{ display: 'flex', gap: spacing[2], alignItems: 'center' }}>
                                {updatingMemberId === member.user_id ? (
                                  <span style={{ color: 'var(--color-primary-500)' }}>Updating...</span>
                                ) : (
                                  <>
                                    <CustomSelect
                                      value={member.role}
                                      onChange={(val) => handleUpdateRole(member.user_id, val as 'admin' | 'member')}
                                      options={[
                                        { value: 'member', label: 'Member' },
                                        { value: 'admin', label: 'Admin' },
                                      ]}
                                      minWidth="100px"
                                    />
                                    <button
                                      onClick={() => handleRemoveMember(member.user_id)}
                                      disabled={updatingMemberId !== null}
                                      style={{
                                        padding: `${spacing[1]} ${spacing[3]}`,
                                        fontSize: typography.fontSize.sm,
                                        color: 'var(--color-error)',
                                        backgroundColor: 'transparent',
                                        border: `${borders.width.thin} solid ${'var(--color-error)'}`,
                                        borderRadius: borders.radius.sm,
                                        cursor: 'pointer',
                                      }}
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

      <style>{`
        .org-detail-secondary-btn:hover {
          background-color: ${'var(--color-primary-100)'} !important;
          border-color: ${'var(--color-primary-500)'} !important;
        }
        .org-detail-outline-btn:hover {
          background-color: ${'var(--color-primary-100)'} !important;
        }
      `}</style>
    </div>
  );
}

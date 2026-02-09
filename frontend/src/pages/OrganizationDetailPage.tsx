import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import type { OrganizationWithMembers, ConversationListItem, Series } from '../types';
import { ConversationState } from '../types';
import { formatDateShort } from '../utils/formatting';
import { colors, typography, spacing, borders, shadows, transitions } from '../styles/tokens';

type TabType = 'conversations' | 'members';

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [organization, setOrganization] = useState<OrganizationWithMembers | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('conversations');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const styles = {
    page: {
      minHeight: '100vh',
      backgroundColor: colors.primary[100],
      padding: spacing[8],
      paddingTop: `calc(80px + ${spacing[8]})`, // Account for fixed header
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
      color: colors.primary[900],
      margin: 0,
    },
    badge: {
      padding: `${spacing[1]} ${spacing[3]}`,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      borderRadius: borders.radius.full,
    },
    badgeAdmin: {
      backgroundColor: colors.primary[900],
      color: colors.primary[50],
    },
    badgeMember: {
      backgroundColor: colors.primary[200],
      color: colors.primary[700],
    },
    description: {
      fontSize: typography.fontSize.base,
      color: colors.primary[600],
      margin: 0,
    },
    headerActions: {
      display: 'flex',
      gap: spacing[3],
    },
    primaryButton: {
      display: 'inline-block',
      padding: `${spacing[3]} ${spacing[6]}`,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.primary[50],
      backgroundColor: colors.primary[900],
      border: 'none',
      borderRadius: borders.radius.md,
      cursor: 'pointer',
      textDecoration: 'none',
      transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
    },
    secondaryButton: {
      display: 'inline-block',
      padding: `${spacing[3]} ${spacing[6]}`,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.primary[700],
      backgroundColor: colors.primary[50],
      border: `${borders.width.thin} solid ${colors.primary[400]}`,
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
      color: colors.primary[600],
      backgroundColor: 'transparent',
      border: `${borders.width.thin} solid ${colors.primary[400]}`,
      borderRadius: borders.radius.md,
      cursor: 'pointer',
      textDecoration: 'none',
      transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
    },
    tabs: {
      display: 'flex',
      gap: spacing[1],
      marginBottom: spacing[6],
      backgroundColor: colors.primary[200],
      padding: spacing[1],
      borderRadius: borders.radius.md,
      width: 'fit-content',
    },
    tab: {
      padding: `${spacing[2]} ${spacing[6]}`,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: colors.primary[600],
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: borders.radius.sm,
      cursor: 'pointer',
      transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
    },
    tabActive: {
      backgroundColor: colors.primary[50],
      color: colors.primary[900],
      boxShadow: shadows.sm,
    },
    content: {
      backgroundColor: colors.primary[50],
      borderRadius: borders.radius.lg,
      border: `${borders.width.thin} solid ${colors.primary[300]}`,
      padding: spacing[6],
    },
    sectionHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing[6],
    },
    sectionTitle: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.semibold,
      color: colors.primary[900],
      margin: 0,
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: spacing[4],
    },
    card: {
      display: 'block',
      backgroundColor: colors.primary[100],
      borderRadius: borders.radius.md,
      border: `${borders.width.thin} solid ${colors.primary[300]}`,
      padding: spacing[4],
      textDecoration: 'none',
      transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
    },
    cardTitle: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      color: colors.primary[900],
      margin: 0,
      marginBottom: spacing[2],
    },
    statusBadge: {
      display: 'inline-block',
      padding: `${spacing[0.5]} ${spacing[2]}`,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      borderRadius: borders.radius.sm,
    },
    collectionTag: {
      display: 'inline-block',
      padding: `${spacing[1]} ${spacing[2]}`,
      fontSize: typography.fontSize.xs,
      color: colors.primary[600],
      backgroundColor: colors.primary[200],
      borderRadius: borders.radius.sm,
      marginBottom: spacing[2],
    },
    cardMeta: {
      fontSize: typography.fontSize.sm,
      color: colors.primary[500],
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
      color: colors.primary[700],
      borderBottom: `2px solid ${colors.primary[300]}`,
    },
    td: {
      padding: spacing[4],
      fontSize: typography.fontSize.sm,
      color: colors.primary[700],
      borderBottom: `${borders.width.thin} solid ${colors.primary[200]}`,
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: spacing[8],
      color: colors.primary[600],
    },
    errorMessage: {
      backgroundColor: colors.semantic.error.light,
      border: `${borders.width.thin} solid ${colors.semantic.error.main}`,
      borderRadius: borders.radius.md,
      padding: spacing[4],
      color: colors.semantic.error.text,
      marginBottom: spacing[4],
    },
    successMessage: {
      backgroundColor: colors.semantic.success.light,
      border: `${borders.width.thin} solid ${colors.semantic.success.main}`,
      borderRadius: borders.radius.md,
      padding: spacing[4],
      color: colors.semantic.success.text,
      marginBottom: spacing[4],
    },
  };

  const getStatusStyles = (state: ConversationState) => {
    const statusColors: Record<ConversationState, { bg: string; text: string }> = {
      [ConversationState.DRAFT]: { bg: colors.primary[200], text: colors.primary[700] },
      [ConversationState.ACTIVE]: { bg: colors.semantic.success.light, text: colors.semantic.success.text },
      [ConversationState.CLOSED]: { bg: colors.primary[300], text: colors.primary[700] },
      [ConversationState.ANALYZING]: { bg: colors.semantic.warning.light, text: colors.semantic.warning.text },
      [ConversationState.ANALYZED]: { bg: colors.semantic.info.light, text: colors.semantic.info.text },
      [ConversationState.DELETED]: { bg: colors.semantic.error.light, text: colors.semantic.error.text },
    };
    return statusColors[state] || statusColors[ConversationState.DRAFT];
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

  useEffect(() => {
    if (id) {
      loadOrganization();
      loadConversations();
      loadSeries();
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

  const loadConversations = async () => {
    try {
      const data = await api.listOrganizationConversations(id!);
      setConversations(data);
    } catch {
      console.error('Failed to load conversations');
    }
  };

  const loadSeries = async () => {
    try {
      const series = await api.listSeries(id);
      setSeriesList(series);
    } catch {
      setSeriesList([]);
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
          <div style={{ textAlign: 'center', padding: spacing[12], color: colors.primary[600] }}>
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

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(activeTab === 'conversations' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('conversations')}
          >
            Conversations ({conversations.length})
          </button>
          <button
            style={{ ...styles.tab, ...(activeTab === 'members' ? styles.tabActive : {}) }}
            onClick={() => setActiveTab('members')}
          >
            Members ({organization.members.length})
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {activeTab === 'conversations' && (
            <>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>Organization Conversations</h2>
                <Link
                  to="/conversations/new"
                  state={{ organizationId: organization.id }}
                  style={styles.primaryButton}
                  className="org-detail-primary-btn"
                >
                  Create Conversation
                </Link>
              </div>

              {conversations.length === 0 ? (
                <div style={styles.emptyState}>
                  <h3 style={{ color: colors.primary[900], marginBottom: spacing[2] }}>No conversations yet</h3>
                  <p style={{ marginBottom: spacing[4] }}>Create your first conversation for this organization</p>
                  <Link
                    to="/conversations/new"
                    state={{ organizationId: organization.id }}
                    style={styles.primaryButton}
                    className="org-detail-primary-btn"
                  >
                    Create Conversation
                  </Link>
                </div>
              ) : (
                <div style={styles.grid}>
                  {conversations.map((conversation) => {
                    const collection = conversation.series_id ? seriesList.find(s => s.id === conversation.series_id) : null;
                    const statusStyles = getStatusStyles(conversation.state);

                    return (
                      <Link
                        key={conversation.id}
                        to={`/conversations/${conversation.id}`}
                        style={styles.card}
                        className="org-detail-card"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[2] }}>
                          <h3 style={styles.cardTitle}>{conversation.title}</h3>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: statusStyles.bg,
                            color: statusStyles.text,
                          }}>
                            {getStateLabel(conversation.state)}
                          </span>
                        </div>
                        {collection && (
                          <span style={styles.collectionTag}>{collection.name}</span>
                        )}
                        <div style={styles.cardMeta}>
                          {conversation.unique_participants !== undefined && conversation.unique_participants > 0 ? (
                            <span><strong>{conversation.unique_participants}</strong> {conversation.unique_participants === 1 ? 'response' : 'responses'}</span>
                          ) : (
                            <span>No responses yet</span>
                          )}
                          <span style={{ marginLeft: spacing[4] }}>Created: {formatDateShort(conversation.created_at)}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'members' && (
            <>
              <h2 style={styles.sectionTitle}>Organization Members</h2>
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
                          <div style={{ fontWeight: typography.fontWeight.medium, color: colors.primary[900] }}>
                            {member.user?.full_name || member.user?.email}
                            {isCreator && (
                              <span style={{ marginLeft: spacing[2], color: colors.primary[500], fontSize: typography.fontSize.xs }}>
                                (Creator)
                              </span>
                            )}
                          </div>
                          {member.user?.full_name && member.user?.email && (
                            <div style={{ color: colors.primary[500], fontSize: typography.fontSize.xs }}>
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
                                  <span style={{ color: colors.primary[500] }}>Updating...</span>
                                ) : (
                                  <>
                                    <select
                                      value={member.role}
                                      onChange={(e) => handleUpdateRole(member.user_id, e.target.value as 'admin' | 'member')}
                                      disabled={updatingMemberId !== null}
                                      style={{
                                        padding: `${spacing[1]} ${spacing[2]}`,
                                        fontSize: typography.fontSize.sm,
                                        border: `${borders.width.thin} solid ${colors.primary[400]}`,
                                        borderRadius: borders.radius.sm,
                                        backgroundColor: colors.primary[50],
                                      }}
                                    >
                                      <option value="member">Member</option>
                                      <option value="admin">Admin</option>
                                    </select>
                                    <button
                                      onClick={() => handleRemoveMember(member.user_id)}
                                      disabled={updatingMemberId !== null}
                                      style={{
                                        padding: `${spacing[1]} ${spacing[3]}`,
                                        fontSize: typography.fontSize.sm,
                                        color: colors.semantic.error.main,
                                        backgroundColor: 'transparent',
                                        border: `${borders.width.thin} solid ${colors.semantic.error.main}`,
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
            </>
          )}
        </div>
      </div>

      <style>{`
        .org-detail-primary-btn:hover {
          background-color: ${colors.primary[800]} !important;
          box-shadow: ${shadows.sm} !important;
        }
        .org-detail-secondary-btn:hover {
          background-color: ${colors.primary[100]} !important;
          border-color: ${colors.primary[500]} !important;
        }
        .org-detail-outline-btn:hover {
          background-color: ${colors.primary[100]} !important;
        }
        .org-detail-card:hover {
          border-color: ${colors.primary[500]} !important;
          box-shadow: ${shadows.sm} !important;
        }
      `}</style>
    </div>
  );
}

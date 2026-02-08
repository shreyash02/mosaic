import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Organization } from '../types';
import { colors, typography, spacing, borders, shadows, transitions } from '../styles/tokens';

interface OrganizationWithRole extends Organization {
  userRole?: 'admin' | 'member';
  memberCount?: number;
}

export default function OrganizationsPageNew() {
  const [organizations, setOrganizations] = useState<OrganizationWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      marginBottom: spacing[8],
    },
    title: {
      fontSize: typography.fontSize['3xl'],
      fontWeight: typography.fontWeight.bold,
      color: colors.primary[900],
      margin: 0,
      marginBottom: spacing[2],
    },
    description: {
      fontSize: typography.fontSize.base,
      color: colors.primary[600],
      margin: 0,
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
      padding: `${spacing[2]} ${spacing[4]}`,
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
      padding: `${spacing[2]} ${spacing[4]}`,
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
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
      gap: spacing[6],
    },
    card: {
      backgroundColor: colors.primary[50],
      borderRadius: borders.radius.lg,
      border: `${borders.width.thin} solid ${colors.primary[300]}`,
      padding: spacing[6],
      transition: `all ${transitions.duration.normal} ${transitions.timing.ease}`,
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing[3],
    },
    cardTitle: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
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
    cardDescription: {
      fontSize: typography.fontSize.sm,
      color: colors.primary[600],
      margin: 0,
      marginBottom: spacing[4],
      lineHeight: typography.lineHeight.relaxed,
    },
    cardMeta: {
      fontSize: typography.fontSize.sm,
      color: colors.primary[500],
      marginBottom: spacing[4],
    },
    cardActions: {
      display: 'flex',
      gap: spacing[3],
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: spacing[12],
      backgroundColor: colors.primary[50],
      borderRadius: borders.radius.lg,
      border: `${borders.width.thin} solid ${colors.primary[300]}`,
    },
    errorMessage: {
      backgroundColor: colors.semantic.error.light,
      border: `${borders.width.thin} solid ${colors.semantic.error.main}`,
      borderRadius: borders.radius.md,
      padding: spacing[4],
      color: colors.semantic.error.text,
      marginBottom: spacing[4],
    },
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const data = await api.listOrganizations();
      const currentUser = await api.getCurrentUser();

      const enrichedOrgs = await Promise.all(
        data.map(async (org) => {
          try {
            const details = await api.getOrganization(org.id);
            const userMembership = details.members.find(m => m.user_id === currentUser.id);
            const isCreator = String(details.created_by) === String(currentUser.id);

            let userRole: 'admin' | 'member' | undefined;
            if (isCreator) {
              userRole = 'admin';
            } else if (userMembership) {
              userRole = userMembership.role as 'admin' | 'member';
            }

            return {
              ...org,
              memberCount: details.members.length,
              userRole
            };
          } catch {
            return { ...org, memberCount: 0, userRole: 'member' as const };
          }
        })
      );

      setOrganizations(enrichedOrgs);
    } catch {
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={{ textAlign: 'center', padding: spacing[12], color: colors.primary[600] }}>
            Loading organizations...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Organizations</h1>
            <p style={styles.description}>
              Manage your organizations and collaborate with team members
            </p>
          </div>
          <Link to="/organizations/new" style={styles.primaryButton} className="orgs-primary-btn">
            Create Organization
          </Link>
        </header>

        {error && <div style={styles.errorMessage}>{error}</div>}

        {organizations.length === 0 ? (
          <div style={styles.emptyState}>
            <h3 style={{ color: colors.primary[900], marginBottom: spacing[2] }}>No organizations yet</h3>
            <p style={{ color: colors.primary[600], marginBottom: spacing[4] }}>
              Create your first organization to start collaborating with your team
            </p>
            <Link to="/organizations/new" style={styles.primaryButton} className="orgs-primary-btn">
              Create Organization
            </Link>
          </div>
        ) : (
          <div style={styles.grid}>
            {organizations.map((org) => (
              <div key={org.id} style={styles.card} className="orgs-card">
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{org.name}</h3>
                  <span style={{
                    ...styles.badge,
                    ...(org.userRole === 'admin' ? styles.badgeAdmin : styles.badgeMember),
                  }}>
                    {org.userRole === 'admin' ? 'Admin' : 'Member'}
                  </span>
                </div>

                {org.description && (
                  <p style={styles.cardDescription}>{org.description}</p>
                )}

                <div style={styles.cardMeta}>
                  <strong>{org.memberCount || 0}</strong> {org.memberCount === 1 ? 'member' : 'members'}
                </div>

                <div style={styles.cardActions}>
                  <Link
                    to={`/organizations/${org.id}`}
                    style={styles.secondaryButton}
                    className="orgs-secondary-btn"
                  >
                    View Organization
                  </Link>
                  {org.userRole === 'admin' && (
                    <Link
                      to={`/organizations/${org.id}/settings`}
                      style={styles.outlineButton}
                      className="orgs-outline-btn"
                    >
                      Settings
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .orgs-primary-btn:hover {
          background-color: ${colors.primary[800]} !important;
          box-shadow: ${shadows.sm} !important;
        }
        .orgs-secondary-btn:hover {
          background-color: ${colors.primary[100]} !important;
          border-color: ${colors.primary[500]} !important;
        }
        .orgs-outline-btn:hover {
          background-color: ${colors.primary[100]} !important;
        }
        .orgs-card:hover {
          border-color: ${colors.primary[500]} !important;
          box-shadow: ${shadows.sm} !important;
        }
      `}</style>
    </div>
  );
}

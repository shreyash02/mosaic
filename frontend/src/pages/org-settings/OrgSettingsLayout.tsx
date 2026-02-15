import { useState, useEffect, createContext, useContext } from 'react';
import { Link, Outlet, useLocation, useParams, useNavigate, Navigate } from 'react-router-dom';
import { api } from '../../services/api';
import type { OrganizationWithMembers } from '../../types';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useFeature } from '../../contexts/FeaturesContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { typography, spacing, borders } from '../../styles';

// Context to share organization data with child pages
interface OrgSettingsContextType {
  organization: OrganizationWithMembers;
  isCreator: boolean;
  refreshOrganization: () => Promise<void>;
}

const OrgSettingsContext = createContext<OrgSettingsContextType | null>(null);

export function useOrgSettings() {
  const context = useContext(OrgSettingsContext);
  if (!context) {
    throw new Error('useOrgSettings must be used within OrgSettingsLayout');
  }
  return context;
}

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
    marginBottom: spacing[6],
  },
  header: {
    marginBottom: spacing[6],
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
  layout: {
    display: 'flex',
    gap: spacing[8],
  },
  sidebar: {
    width: '200px',
    flexShrink: 0,
  },
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing[1],
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: spacing[3],
    padding: `${spacing[3]} ${spacing[4]}`,
    color: 'var(--color-primary-700)',
    textDecoration: 'none',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    borderRadius: borders.radius.md,
    transition: 'all 0.15s ease',
  },
  navLinkActive: {
    color: 'var(--color-primary-900)',
    backgroundColor: 'var(--color-primary-100)',
  },
  navLinkDanger: {
    color: 'var(--color-error)',
  },
  navIcon: {
    width: '18px',
    height: '18px',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  loading: {
    textAlign: 'center' as const,
    padding: spacing[8],
    color: 'var(--color-primary-500)',
  },
  error: {
    backgroundColor: 'var(--color-primary-100)',
    border: '1px solid var(--color-primary-300)',
    color: 'var(--color-primary-900)',
    padding: spacing[4],
    borderRadius: borders.radius.md,
    fontSize: typography.fontSize.sm,
    marginBottom: spacing[4],
  },
};

const hoverStyles = `
  .org-settings-nav-link:hover {
    color: var(--color-primary-900);
    background-color: var(--color-primary-100);
  }
  .org-settings-nav-link-danger:hover {
    color: var(--color-error);
    background-color: var(--color-primary-100);
  }
  .org-settings-back-link:hover {
    color: var(--color-primary-900);
  }
  @media (max-width: 640px) {
    .org-settings-layout {
      flex-direction: column !important;
    }
    .org-settings-sidebar {
      width: 100% !important;
    }
    .org-settings-sidebar-nav {
      flex-direction: row !important;
      overflow-x: auto;
    }
    .org-settings-nav-link {
      white-space: nowrap;
    }
  }
`;

export default function OrgSettingsLayout() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentOrgId, loading: orgContextLoading } = useOrganization();
  const brandingEnabled = useFeature('custom_branding');
  const slackEnabled = useFeature('slack_integration');

  const [organization, setOrganization] = useState<OrganizationWithMembers | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirect if user hasn't switched to this organization
  if (!orgContextLoading && currentOrgId !== id) {
    return <Navigate to="/dashboard" replace />;
  }

  usePageTitle(organization ? `${organization.name} Settings` : 'Organization Settings');

  const loadOrganization = async () => {
    try {
      setLoading(true);
      setError('');

      const orgData = await api.getOrganization(id!);
      setOrganization(orgData);

      const currentUser = await api.getCurrentUser();
      const membership = orgData.members.find(m => m.user_id === currentUser.id);
      setIsCreator(orgData.created_by === currentUser.id);

      if (membership?.role !== 'admin' && orgData.created_by !== currentUser.id) {
        setError('You must be an admin to access organization settings');
        setTimeout(() => navigate(`/organizations/${id}`), 2000);
        return;
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load organization');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadOrganization();
    }
  }, [id]);

  // Build navigation items based on features and permissions
  const navItems = [
    {
      path: `/organizations/${id}/settings`,
      label: 'General',
      show: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
    {
      path: `/organizations/${id}/settings/members`,
      label: 'Members',
      show: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      path: `/organizations/${id}/settings/branding`,
      label: 'Branding',
      show: brandingEnabled,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="M2 2l7.586 7.586" />
          <circle cx="11" cy="11" r="2" />
        </svg>
      ),
    },
    {
      path: `/organizations/${id}/settings/integrations`,
      label: 'Integrations',
      show: slackEnabled,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
      ),
    },
    {
      path: `/organizations/${id}/settings/danger`,
      label: 'Danger Zone',
      show: isCreator,
      danger: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
    },
  ];

  if (loading) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.loading}>Loading organization settings...</div>
          </div>
        </div>
      </>
    );
  }

  if (error && !organization) {
    return (
      <>
        <style>{hoverStyles}</style>
        <div style={styles.page}>
          <div style={styles.container}>
            <div style={styles.error}>{error}</div>
            <Link to="/organizations" style={styles.backLink}>
              Back to Organizations
            </Link>
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
            <Link to="/organizations" style={styles.backLink}>
              Back to Organizations
            </Link>
          </div>
        </div>
      </>
    );
  }

  const isActive = (path: string) => {
    // Exact match for general, prefix match for others
    if (path === `/organizations/${id}/settings`) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <OrgSettingsContext.Provider value={{ organization, isCreator, refreshOrganization: loadOrganization }}>
      <style>{hoverStyles}</style>
      <div style={styles.page}>
        <div style={styles.container}>
          <Link to={`/organizations/${id}`} style={styles.backLink} className="org-settings-back-link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 12L6 8L10 4" />
            </svg>
            Back to Organization
          </Link>

          <div style={styles.header}>
            <h1 style={styles.title}>Organization Settings</h1>
            <p style={styles.subtitle}>{organization.name}</p>
          </div>

          <div style={styles.layout} className="org-settings-layout">
            <aside style={styles.sidebar} className="org-settings-sidebar">
              <nav style={styles.sidebarNav} className="org-settings-sidebar-nav">
                {navItems.filter(item => item.show).map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={{
                      ...styles.navLink,
                      ...(isActive(item.path) ? styles.navLinkActive : {}),
                      ...(item.danger ? styles.navLinkDanger : {}),
                    }}
                    className={item.danger ? 'org-settings-nav-link-danger' : 'org-settings-nav-link'}
                  >
                    <span style={styles.navIcon}>{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </aside>

            <main style={styles.content}>
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </OrgSettingsContext.Provider>
  );
}

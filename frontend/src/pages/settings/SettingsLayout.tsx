import { Link, Outlet, useLocation } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';
import { typography, spacing, borders } from '../../styles';

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
  navIcon: {
    width: '18px',
    height: '18px',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
};

const hoverStyles = `
  .settings-nav-link:hover {
    color: var(--color-primary-900);
    background-color: var(--color-primary-100);
  }
  .settings-back-link:hover {
    color: var(--color-primary-900);
  }
  @media (max-width: 640px) {
    .settings-layout {
      flex-direction: column !important;
    }
    .settings-sidebar {
      width: 100% !important;
    }
    .settings-sidebar-nav {
      flex-direction: row !important;
      overflow-x: auto;
    }
    .settings-nav-link {
      white-space: nowrap;
    }
  }
`;

const NAV_ITEMS = [
  {
    path: '/settings/notifications',
    label: 'Notifications',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    path: '/settings/security',
    label: 'Security',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    path: '/settings/usage',
    label: 'Usage',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20V10" />
        <path d="M18 20V4" />
        <path d="M6 20v-4" />
      </svg>
    ),
  },
  {
    path: '/settings/referral',
    label: 'Refer a Friend',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
  },
];

export default function SettingsLayout() {
  usePageTitle('Settings');
  const location = useLocation();

  return (
    <>
      <style>{hoverStyles}</style>
      <div style={styles.page}>
        <div style={styles.container}>
          <Link to="/dashboard" style={styles.backLink} className="settings-back-link">
            ← Back to Dashboard
          </Link>

          <div style={styles.header}>
            <h1 style={styles.title}>Settings</h1>
            <p style={styles.subtitle}>Manage your account settings</p>
          </div>

          <div style={styles.layout} className="settings-layout">
            <aside style={styles.sidebar} className="settings-sidebar">
              <nav style={styles.sidebarNav} className="settings-sidebar-nav">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={{
                      ...styles.navLink,
                      ...(location.pathname === item.path ? styles.navLinkActive : {}),
                    }}
                    className="settings-nav-link"
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
    </>
  );
}

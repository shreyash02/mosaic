import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../pages/AdminPortalPage.css';

const MAIN_TABS = [
  { key: 'users', label: 'Users', path: '/adminportal/users' },
  { key: 'conversations', label: 'Conversations', path: '/adminportal/conversations' },
  { key: 'responses', label: 'Responses', path: '/adminportal/responses' },
  { key: 'analyses', label: 'Analyses', path: '/adminportal/analyses' },
  { key: 'organizations', label: 'Organizations', path: '/adminportal/organizations' },
  { key: 'scheduler', label: 'Scheduler', path: '/adminportal/scheduler' },
] as const;

const TEST_TOOLS_ITEMS = [
  { label: 'Test Response Generation', path: '/adminportal/test-generation' },
  { label: 'Email Template Preview', path: '/adminportal/email-preview' },
];

const PLATFORM_SECTIONS = [
  {
    heading: 'Configuration',
    items: [
      { label: 'Features', path: '/adminportal/features' },
      { label: 'Journal Templates', path: '/adminportal/journal-templates' },
      { label: 'Platform Settings', path: '/adminportal/platform-settings' },
    ],
  },
  {
    heading: 'Plans & Billing',
    items: [
      { label: 'Plan Tiers', path: '/adminportal/plan-tiers' },
      { label: 'Subscriptions', path: '/adminportal/subscriptions' },
      { label: 'Cost Estimator', path: '/adminportal/cost-estimator' },
    ],
  },
  {
    heading: 'Monitoring',
    items: [
      { label: 'Analytics', path: '/adminportal/analytics' },
      { label: 'LLM Usage', path: '/adminportal/llm-usage' },
      { label: 'Email Logs', path: '/adminportal/email-logs' },
      { label: 'Audit Log', path: '/adminportal/audit-log' },
    ],
  },
  {
    heading: 'Access',
    items: [
      { label: 'Invite Codes', path: '/adminportal/invite-codes' },
    ],
  },
];

const ALL_PLATFORM_ITEMS = PLATFORM_SECTIONS.flatMap((s) => s.items);

function getActiveTab(pathname: string): string | null {
  // Detail pages map to parent tabs
  if (pathname.startsWith('/adminportal/user/')) return 'users';
  if (pathname.startsWith('/adminportal/conversation/')) return 'conversations';

  // Main tabs
  for (const tab of MAIN_TABS) {
    if (pathname === tab.path || pathname.startsWith(tab.path + '/')) return tab.key;
  }

  return null;
}

function isTestToolsActive(pathname: string): boolean {
  return TEST_TOOLS_ITEMS.some((item) => pathname === item.path || pathname.startsWith(item.path + '/'));
}

function isPlatformActive(pathname: string): boolean {
  return ALL_PLATFORM_ITEMS.some((item) => pathname === item.path || pathname.startsWith(item.path + '/'));
}

export default function AdminHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showTestToolsDropdown, setShowTestToolsDropdown] = useState(false);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const testToolsRef = useRef<HTMLDivElement>(null);
  const platformRef = useRef<HTMLDivElement>(null);

  const adminToken = localStorage.getItem('admin_token');
  if (!adminToken) return null;

  const activeTab = getActiveTab(location.pathname);
  const testToolsHighlighted = isTestToolsActive(location.pathname);
  const platformHighlighted = isPlatformActive(location.pathname);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (testToolsRef.current && !testToolsRef.current.contains(e.target as Node)) {
        setShowTestToolsDropdown(false);
      }
      if (platformRef.current && !platformRef.current.contains(e.target as Node)) {
        setShowPlatformDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/adminportal');
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <>
      <div className="admin-header">
        <div className="admin-header-left">
          <button
            className="admin-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
          </button>
          <h1>Admin Portal</h1>
        </div>
        <button onClick={handleLogout} className="btn btn-secondary">
          Logout
        </button>
      </div>

      {/* Desktop tabs */}
      <div className="admin-tabs">
        {MAIN_TABS.map((tab) => (
          <Link
            key={tab.key}
            to={tab.path}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
          >
            {tab.label}
          </Link>
        ))}
        <div className="tab-dropdown-container" ref={testToolsRef}>
          <button
            className={`tab ${testToolsHighlighted ? 'active' : ''}`}
            onClick={() => setShowTestToolsDropdown(!showTestToolsDropdown)}
          >
            Test Tools
            <span style={{ marginLeft: '4px', fontSize: '10px' }}>{showTestToolsDropdown ? '\u25B2' : '\u25BC'}</span>
          </button>
          {showTestToolsDropdown && (
            <div className="tab-dropdown-menu">
              {TEST_TOOLS_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="tab-dropdown-item"
                  onClick={() => setShowTestToolsDropdown(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="tab-dropdown-container" ref={platformRef}>
          <button
            className={`tab ${platformHighlighted ? 'active' : ''}`}
            onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
          >
            Platform
            <span style={{ marginLeft: '4px', fontSize: '10px' }}>{showPlatformDropdown ? '\u25B2' : '\u25BC'}</span>
          </button>
          {showPlatformDropdown && (
            <div className="tab-dropdown-menu">
              {PLATFORM_SECTIONS.map((section, i) => (
                <div key={section.heading}>
                  {i > 0 && <div className="tab-dropdown-divider" />}
                  <div className="tab-dropdown-heading">{section.heading}</div>
                  {section.items.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="tab-dropdown-item"
                      onClick={() => setShowPlatformDropdown(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="admin-mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}
      <nav className={`admin-mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="admin-mobile-section">
          <div className="admin-mobile-heading">Data</div>
          {MAIN_TABS.map((tab) => (
            <Link
              key={tab.key}
              to={tab.path}
              className={`admin-mobile-link ${activeTab === tab.key ? 'active' : ''}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <div className="admin-mobile-section">
          <div className="admin-mobile-heading">Test Tools</div>
          {TEST_TOOLS_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-mobile-link ${isActive(item.path) ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        {PLATFORM_SECTIONS.map((section) => (
          <div key={section.heading} className="admin-mobile-section">
            <div className="admin-mobile-heading">{section.heading}</div>
            {section.items.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`admin-mobile-link ${isActive(item.path) ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </>
  );
}

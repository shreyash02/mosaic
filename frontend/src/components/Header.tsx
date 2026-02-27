import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useFeature } from '../contexts/FeaturesContext';
import { useTheme, SunIcon, MoonIcon } from '../contexts/ThemeContext';
import { NotificationCenter } from './NotificationCenter';
import CreateWorkspaceModal from './CreateWorkspaceModal';
import './Header.css';

export default function Header() {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const journalsEnabled = useFeature('journals');
  const spacesEnabled = useFeature('spaces');

  // Hide header on admin portal routes
  if (location.pathname.startsWith('/adminportal')) {
    return null;
  }
  const {
    currentWorkspaceName,
    isPersonalWorkspace,
    organizations,
    currentOrgId,
    currentWorkspaceId,
    setCurrentOrganization,
    setCurrentWorkspace,
    orgWorkspaces,
  } = useOrganization();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const workspaceDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileProfileRef = useRef<HTMLDivElement>(null);
  const mobileMenuBtnRef = useRef<HTMLButtonElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSwitchOrg = (orgId: string | null) => {
    setCurrentOrganization(orgId);
    setShowUserDropdown(false);
    setMobileProfileOpen(false);
  };

  const handleSwitchWorkspace = (workspaceId: string) => {
    setCurrentWorkspace(workspaceId);
    setShowWorkspaceDropdown(false);
  };

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (workspaceDropdownRef.current && !workspaceDropdownRef.current.contains(event.target as Node)) {
        setShowWorkspaceDropdown(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) &&
          mobileMenuBtnRef.current && !mobileMenuBtnRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
      if (mobileProfileRef.current && !mobileProfileRef.current.contains(event.target as Node)) {
        setMobileProfileOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    if (showWorkspaceDropdown || mobileMenuOpen || mobileProfileOpen || showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showWorkspaceDropdown, mobileMenuOpen, mobileProfileOpen, showUserDropdown]);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileProfileOpen(false);
    setShowUserDropdown(false);
    setShowWorkspaceDropdown(false);
  }, [location.pathname]);

  // Show workspace switcher when there are multiple workspaces in the current context,
  // or always in org context (to allow creating new ones)
  const showWorkspaceSwitcher = !isPersonalWorkspace
    ? orgWorkspaces.length > 0
    : orgWorkspaces.length > 1;  // personal: show if more than just the default

  return (
    <header className="app-header">
      <div className="header-content">
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="logo-link">
          <div className="logo">
            <svg className="logo-icon" width="28" height="28" viewBox="0 0 100 100">
              <rect width="100" height="100" rx="8" fill="#1a1a1a"/>
              <text x="50" y="70" fontFamily="Arial, sans-serif" fontSize="60" fontWeight="bold" fill="white" textAnchor="middle">M</text>
            </svg>
            <span className="logo-text">Mosaic</span>
          </div>
        </Link>

        {!isAuthenticated && (
          <div className="header-auth-buttons">
            <button
              onClick={toggleTheme}
              className="btn-header-theme-toggle"
              aria-label={resolvedTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {resolvedTheme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
            </button>
            <Link to="/explore" className="btn-header-login">
              Explore
            </Link>
            <Link to="/login" className="btn-header-login">
              Log In
            </Link>
            <Link to="/register" className="btn-header-signup">
              Sign Up
            </Link>
          </div>
        )}

        {isAuthenticated && user && (
          <>
            {/* Mobile Menu Button - Left side */}
            <button
              ref={mobileMenuBtnRef}
              className="mobile-menu-btn mobile-menu-btn-left"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>

            {/* Workspace Switcher (top-left, after logo) */}
            {showWorkspaceSwitcher ? (
              <div className="workspace-switcher" ref={workspaceDropdownRef}>
                <button
                  className="workspace-switcher-trigger"
                  onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                  aria-expanded={showWorkspaceDropdown}
                  aria-haspopup="listbox"
                  aria-label={`Switch workspace. Current: ${currentWorkspaceName}`}
                >
                  <span className="workspace-icon" aria-hidden="true">
                    {orgWorkspaces.find(w => w.id === currentWorkspaceId)?.visibility === 'private' ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      </svg>
                    )}
                  </span>
                  <span className="workspace-name">{currentWorkspaceName}</span>
                  <span className="dropdown-arrow">&#x25BC;</span>
                </button>

                {showWorkspaceDropdown && (
                  <div className="workspace-switcher-dropdown">
                    <div className="workspace-switcher-label">Workspaces</div>
                    {orgWorkspaces.map(ws => (
                      <button
                        key={ws.id}
                        onClick={() => handleSwitchWorkspace(ws.id)}
                        className={`workspace-switcher-item ${currentWorkspaceId === ws.id ? 'active' : ''}`}
                      >
                        <span className="workspace-item-icon">
                          {ws.visibility === 'private' ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                          )}
                        </span>
                        <span className="workspace-item-name">
                          {ws.name}
                          {ws.is_default && <span className="workspace-default-badge">Default</span>}
                        </span>
                        {currentWorkspaceId === ws.id && (
                          <span className="workspace-check">&#x2713;</span>
                        )}
                      </button>
                    ))}

                    <div className="workspace-switcher-divider" />
                    <button
                      className="workspace-switcher-create"
                      onClick={() => {
                        setShowWorkspaceDropdown(false);
                        setShowCreateModal(true);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      New Workspace
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Single-workspace context — show label with "New Workspace" dropdown */
              <div className="workspace-switcher" ref={workspaceDropdownRef}>
                <button
                  className="workspace-switcher-trigger"
                  onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                  aria-expanded={showWorkspaceDropdown}
                  aria-haspopup="listbox"
                  aria-label={`Current workspace: ${currentWorkspaceName}`}
                >
                  <span className="workspace-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                    </svg>
                  </span>
                  <span className="workspace-name">{currentWorkspaceName}</span>
                  <span className="dropdown-arrow">&#x25BC;</span>
                </button>

                {showWorkspaceDropdown && (
                  <div className="workspace-switcher-dropdown">
                    <button
                      className="workspace-switcher-create"
                      onClick={() => {
                        setShowWorkspaceDropdown(false);
                        setShowCreateModal(true);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      New Workspace
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Desktop Navigation */}
            <nav className="header-nav desktop-nav">
              <Link to="/dashboard" className="nav-link">
                Home
              </Link>
              <Link to="/conversations" className="nav-link">
                Conversations
              </Link>
              {journalsEnabled && (
                <Link to="/journals" className="nav-link">
                  Journals
                </Link>
              )}
              {spacesEnabled && (
                <Link to="/spaces" className="nav-link">
                  Spaces
                </Link>
              )}
              <Link to="/explore" className="nav-link">
                Explore
              </Link>
            </nav>

            {/* Search Button */}
            <Link
              to="/search"
              className="header-search-btn"
              aria-label="Search"
              title="Search"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </Link>

            {/* Notifications - Desktop */}
            <NotificationCenter />

            {/* Desktop User Menu (with org switcher) */}
            <div className="user-dropdown-container desktop-user-dropdown" ref={userDropdownRef}>
              <button
                className="user-dropdown-trigger"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                aria-expanded={showUserDropdown}
                aria-haspopup="menu"
                aria-label="User menu"
              >
                <div className="user-avatar">
                  {user.profile_image_url ? (
                    <img src={user.profile_image_url} alt={user.full_name || 'Profile'} className="user-avatar-img" />
                  ) : (
                    user.full_name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
              </button>

              {showUserDropdown && (
                <div className="user-dropdown-menu">
                  <div className="user-dropdown-info">
                    <span className="user-dropdown-name">{user.full_name}</span>
                    <span className="user-dropdown-email">{user.email}</span>
                  </div>

                  {/* Organization Switcher Section */}
                  {organizations.length > 0 && (
                    <>
                      <div className="user-dropdown-divider" />
                      <div className="user-dropdown-org-section">
                        <button
                          onClick={() => handleSwitchOrg(null)}
                          className={`user-dropdown-org-item ${isPersonalWorkspace ? 'active' : ''}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                          </svg>
                          <span>Personal</span>
                          {isPersonalWorkspace && <span className="user-dropdown-org-check">&#x2713;</span>}
                        </button>
                        {organizations.map(org => (
                          <button
                            key={org.id}
                            onClick={() => handleSwitchOrg(org.id)}
                            className={`user-dropdown-org-item ${currentOrgId === org.id ? 'active' : ''}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm2-2a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7zM0 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6zm1 0v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1z"/>
                            </svg>
                            <span>{org.name}</span>
                            {currentOrgId === org.id && <span className="user-dropdown-org-check">&#x2713;</span>}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="user-dropdown-divider" />
                  <Link
                    to="/profile"
                    className="user-dropdown-item"
                    onClick={() => setShowUserDropdown(false)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Profile
                  </Link>
                  <Link
                    to="/settings"
                    className="user-dropdown-item"
                    onClick={() => setShowUserDropdown(false)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    Settings
                  </Link>
                  {currentOrgId && (
                    <Link
                      to={`/organizations/${currentOrgId}/settings`}
                      className="user-dropdown-item"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      Organization Settings
                    </Link>
                  )}
                  <Link
                    to="/help"
                    className="user-dropdown-item"
                    onClick={() => setShowUserDropdown(false)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Help
                  </Link>
                  <div className="user-dropdown-divider" />
                  <button
                    onClick={toggleTheme}
                    className="user-dropdown-item"
                  >
                    {resolvedTheme === 'light' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
                    {resolvedTheme === 'light' ? 'Dark Mode' : 'Light Mode'}
                  </button>
                  <div className="user-dropdown-divider" />
                  <button
                    onClick={handleLogout}
                    className="user-dropdown-item user-dropdown-logout"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Profile Button - Right side */}
            <div className="mobile-profile-container" ref={mobileProfileRef}>
              <button
                className="mobile-profile-btn"
                onClick={() => setMobileProfileOpen(!mobileProfileOpen)}
                aria-label="Profile menu"
              >
                <div className="user-avatar">
                  {user.profile_image_url ? (
                    <img src={user.profile_image_url} alt={user.full_name || 'Profile'} className="user-avatar-img" />
                  ) : (
                    user.full_name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
              </button>

              {/* Mobile Profile Dropdown */}
              {mobileProfileOpen && (
                <div className="mobile-profile-dropdown">
                  <div className="mobile-profile-info">
                    <span className="mobile-profile-name">{user.full_name}</span>
                    <span className="mobile-profile-email">{user.email}</span>
                  </div>

                  {/* Organization switcher in mobile profile */}
                  {organizations.length > 0 && (
                    <>
                      <div className="mobile-profile-divider" />
                      <div className="mobile-org-section">
                        <button
                          onClick={() => handleSwitchOrg(null)}
                          className={`mobile-org-item ${isPersonalWorkspace ? 'active' : ''}`}
                        >
                          <span>Personal</span>
                          {isPersonalWorkspace && <span className="mobile-org-check">&#x2713;</span>}
                        </button>
                        {organizations.map(org => (
                          <button
                            key={org.id}
                            onClick={() => handleSwitchOrg(org.id)}
                            className={`mobile-org-item ${currentOrgId === org.id ? 'active' : ''}`}
                          >
                            <span>{org.name}</span>
                            {currentOrgId === org.id && <span className="mobile-org-check">&#x2713;</span>}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="mobile-profile-divider" />
                  <Link to="/profile" className="mobile-profile-link" onClick={() => setMobileProfileOpen(false)}>
                    Profile
                  </Link>
                  <Link to="/settings" className="mobile-profile-link" onClick={() => setMobileProfileOpen(false)}>
                    Settings
                  </Link>
                  {currentOrgId && (
                    <Link to={`/organizations/${currentOrgId}/settings`} className="mobile-profile-link" onClick={() => setMobileProfileOpen(false)}>
                      Organization Settings
                    </Link>
                  )}
                  <Link to="/help" className="mobile-profile-link" onClick={() => setMobileProfileOpen(false)}>
                    Help
                  </Link>
                  <div className="mobile-profile-divider" />
                  <button onClick={toggleTheme} className="mobile-theme-toggle">
                    {resolvedTheme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
                    <span>{resolvedTheme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                  </button>
                  <div className="mobile-profile-divider" />
                  <button onClick={handleLogout} className="mobile-profile-logout">
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Overlay */}
            <div
              className={`mobile-menu-overlay ${mobileMenuOpen ? 'open' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Mobile Menu - Navigation only */}
            <div
              className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}
              ref={mobileMenuRef}
            >
              {/* Mobile workspace switcher */}
              {showWorkspaceSwitcher && (
                <div className="mobile-workspace-section">
                  <div className="mobile-workspace-label">Workspaces</div>
                  {orgWorkspaces.map(ws => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        handleSwitchWorkspace(ws.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`mobile-workspace-item ${currentWorkspaceId === ws.id ? 'active' : ''}`}
                    >
                      {ws.visibility === 'private' && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      )}
                      <span>{ws.name}</span>
                      {currentWorkspaceId === ws.id && <span className="mobile-org-check">&#x2713;</span>}
                    </button>
                  ))}
                  <button
                    className="mobile-workspace-create"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowCreateModal(true);
                    }}
                  >
                    + New Workspace
                  </button>
                  <div className="mobile-menu-divider" />
                </div>
              )}

              <nav className="mobile-nav">
                <Link
                  to="/dashboard"
                  className={`mobile-nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  Home
                </Link>
                <Link
                  to="/conversations"
                  className={`mobile-nav-link ${location.pathname.startsWith('/conversations') ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Conversations
                </Link>
                {journalsEnabled && (
                  <Link
                    to="/journals"
                    className={`mobile-nav-link ${location.pathname.startsWith('/journals') ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    Journals
                  </Link>
                )}
                {spacesEnabled && (
                  <Link
                    to="/spaces"
                    className={`mobile-nav-link ${location.pathname.startsWith('/spaces') ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <circle cx="5" cy="6" r="2" />
                      <circle cx="19" cy="6" r="2" />
                      <circle cx="5" cy="18" r="2" />
                      <circle cx="19" cy="18" r="2" />
                      <path d="M7 7l3 3M14 8l3-1M7 17l3-3M17 16l-3-2" />
                    </svg>
                    Spaces
                  </Link>
                )}
                <Link
                  to="/explore"
                  className={`mobile-nav-link ${location.pathname.startsWith('/explore') ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                  </svg>
                  Explore
                </Link>
              </nav>
            </div>

            {/* Create Workspace Modal */}
            <CreateWorkspaceModal
              isOpen={showCreateModal}
              onClose={() => setShowCreateModal(false)}
            />
          </>
        )}
      </div>
    </header>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { useFeature } from '../contexts/FeaturesContext';
import { useTheme, SunIcon, MoonIcon } from '../contexts/ThemeContext';
import { NotificationCenter } from './NotificationCenter';
import './Header.css';

export default function Header() {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const organizationsEnabled = useFeature('organizations');
  const templatesEnabled = useFeature('templates');
  const collectionsEnabled = useFeature('collections');

  // Hide header on admin portal routes
  if (location.pathname.startsWith('/adminportal')) {
    return null;
  }
  const {
    currentWorkspaceName,
    isPersonalWorkspace,
    organizations,
    currentOrgId,
    setCurrentOrganization
  } = useOrganization();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileProfileRef = useRef<HTMLDivElement>(null);
  const mobileMenuBtnRef = useRef<HTMLButtonElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSwitchWorkspace = (orgId: string | null) => {
    setCurrentOrganization(orgId);
    setShowOrgDropdown(false);
  };

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOrgDropdown(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) &&
          mobileMenuBtnRef.current && !mobileMenuBtnRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
      if (mobileProfileRef.current && !mobileProfileRef.current.contains(event.target as Node)) {
        setMobileProfileOpen(false);
      }
    };

    if (showOrgDropdown || mobileMenuOpen || mobileProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOrgDropdown, mobileMenuOpen, mobileProfileOpen]);

  // Close mobile menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileProfileOpen(false);
  }, [location.pathname]);

  return (
    <header className="app-header">
      <div className="header-content">
        <Link to="/dashboard" className="logo-link">
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

            {/* Organization Switcher */}
            {organizationsEnabled && (
            <div className="org-switcher" ref={dropdownRef}>
              <button
                className="org-switcher-trigger"
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                aria-expanded={showOrgDropdown}
                aria-haspopup="listbox"
                aria-label={`Switch workspace. Current: ${currentWorkspaceName}`}
              >
                <span className="org-icon" aria-hidden="true">
                  {isPersonalWorkspace ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm2-2a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7zM0 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6zm1 0v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1z"/>
                    </svg>
                  )}
                </span>
                <span className="org-name">{currentWorkspaceName}</span>
                <span className="dropdown-arrow">▼</span>
              </button>

              {showOrgDropdown && (
                <div className="org-switcher-dropdown">
                  {/* Personal workspace option */}
                  <button
                    onClick={() => handleSwitchWorkspace(null)}
                    className={`org-switcher-item ${isPersonalWorkspace ? 'active' : ''}`}
                  >
                    <span className="org-icon">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                      </svg>
                    </span>
                    <span>Personal</span>
                  </button>

                  {/* Divider */}
                  {organizations.length > 0 && (
                    <div className="org-switcher-divider" />
                  )}

                  {/* Organizations list */}
                  {organizations.length > 0 && (
                    <>
                      <div className="org-switcher-label">Organizations</div>
                      {organizations.map(org => (
                        <button
                          key={org.id}
                          onClick={() => handleSwitchWorkspace(org.id)}
                          className={`org-switcher-item ${currentOrgId === org.id ? 'active' : ''}`}
                        >
                          <span className="org-icon">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M2.5 3.5a.5.5 0 0 1 0-1h11a.5.5 0 0 1 0 1h-11zm2-2a.5.5 0 0 1 0-1h7a.5.5 0 0 1 0 1h-7zM0 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6zm1 0v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1z"/>
                            </svg>
                          </span>
                          <span>{org.name}</span>
                          {currentOrgId === org.id && (
                            <span className="org-check">✓</span>
                          )}
                        </button>
                      ))}
                    </>
                  )}

                  {/* Organization Settings - only when in org context */}
                  {currentOrgId && (
                    <>
                      <div className="org-switcher-divider" />
                      <Link
                        to={`/organizations/${currentOrgId}/settings`}
                        className="org-switcher-manage"
                        onClick={() => setShowOrgDropdown(false)}
                      >
                        Organization Settings
                      </Link>
                    </>
                  )}

                  {/* Manage link */}
                  <div className="org-switcher-divider" />
                  <Link
                    to="/organizations"
                    className="org-switcher-manage"
                    onClick={() => setShowOrgDropdown(false)}
                  >
                    Manage Organizations
                  </Link>
                </div>
              )}
            </div>
            )}

            {/* Desktop Navigation */}
            <nav className="header-nav desktop-nav">
              <Link to="/dashboard" className="nav-link">
                Dashboard
              </Link>
              <Link to="/conversations" className="nav-link">
                Conversations
              </Link>
              {templatesEnabled && (
                <Link to="/templates" className="nav-link">
                  Templates
                </Link>
              )}
              {collectionsEnabled && (
                <Link to="/collections" className="nav-link">
                  Collections
                </Link>
              )}
              <Link to="/help" className="nav-link">
                Help
              </Link>
            </nav>

            {/* Search Button - Desktop */}
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

            {/* Theme Toggle - Desktop */}
            <button
              onClick={toggleTheme}
              className="theme-toggle desktop-theme-toggle"
              aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
              title={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
            >
              {resolvedTheme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
            </button>

            {/* Desktop User Info */}
            <div className="user-info desktop-user-info">
              <div className="user-details">
                <span className="user-name">{user.full_name}</span>
                <span className="user-email">{user.email}</span>
              </div>
              <div className="user-menu-links">
                <Link to="/profile" className="user-menu-link">Profile</Link>
                <Link to="/settings" className="user-menu-link">Settings</Link>
              </div>
              <button onClick={handleLogout} className="btn-logout">
                Logout
              </button>
            </div>

            {/* Mobile Profile Button - Right side */}
            <div className="mobile-profile-container" ref={mobileProfileRef}>
              <button
                className="mobile-profile-btn"
                onClick={() => setMobileProfileOpen(!mobileProfileOpen)}
                aria-label="Profile menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                </svg>
              </button>

              {/* Mobile Profile Dropdown */}
              {mobileProfileOpen && (
                <div className="mobile-profile-dropdown">
                  <div className="mobile-profile-info">
                    <span className="mobile-profile-name">{user.full_name}</span>
                    <span className="mobile-profile-email">{user.email}</span>
                  </div>
                  <div className="mobile-profile-divider" />
                  <Link to="/profile" className="mobile-profile-link" onClick={() => setMobileProfileOpen(false)}>
                    Profile
                  </Link>
                  <Link to="/settings" className="mobile-profile-link" onClick={() => setMobileProfileOpen(false)}>
                    Settings
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
                  Dashboard
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
                {templatesEnabled && (
                  <Link
                    to="/templates"
                    className={`mobile-nav-link ${location.pathname.startsWith('/templates') ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    Templates
                  </Link>
                )}
                {collectionsEnabled && (
                  <Link
                    to="/collections"
                    className={`mobile-nav-link ${location.pathname.startsWith('/collections') ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    Collections
                  </Link>
                )}
                <Link
                  to="/help"
                  className={`mobile-nav-link ${location.pathname === '/help' ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Help
                </Link>
              </nav>
            </div>
          </>
        )}
      </div>
    </header>
  );
}


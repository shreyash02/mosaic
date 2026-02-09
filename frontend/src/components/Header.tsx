import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import './Header.css';

export default function Header() {
  const location = useLocation();

  // Hide header on admin portal routes
  if (location.pathname.startsWith('/adminportal')) {
    return null;
  }
  const { user, logout, isAuthenticated } = useAuth();
  const {
    currentWorkspaceName,
    isPersonalWorkspace,
    organizations,
    currentOrgId,
    setCurrentOrganization
  } = useOrganization();
  const navigate = useNavigate();
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    if (showOrgDropdown || mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOrgDropdown, mobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="app-header">
      <div className="header-content">
        <Link to="/dashboard" className="logo-link">
          <div className="logo">
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
            {/* Mobile Menu Button */}
            <button
              className="mobile-menu-btn"
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
            <div className="org-switcher" ref={dropdownRef}>
              <button
                className="org-switcher-trigger"
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
              >
                <span className="org-icon">
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
                        </button>
                      ))}
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

            {/* Desktop Navigation */}
            <nav className="header-nav desktop-nav">
              <Link to="/dashboard" className="nav-link">
                Dashboard
              </Link>
              <Link to="/conversations" className="nav-link">
                Conversations
              </Link>
              <Link to="/templates" className="nav-link">
                Templates
              </Link>
              <Link to="/collections" className="nav-link">
                Collections
              </Link>
              <Link to="/help" className="nav-link">
                Help
              </Link>
            </nav>

            {/* Desktop User Info */}
            <div className="user-info desktop-user-info">
              <div className="user-details">
                <span className="user-name">{user.full_name}</span>
                <span className="user-email">{user.email}</span>
              </div>
              <button onClick={handleLogout} className="btn-logout">
                Logout
              </button>
            </div>

            {/* Mobile Menu Overlay */}
            <div
              className={`mobile-menu-overlay ${mobileMenuOpen ? 'open' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Mobile Menu */}
            <div
              className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}
              ref={mobileMenuRef}
            >
              <nav className="mobile-nav">
                <Link to="/dashboard" className="mobile-nav-link">
                  Dashboard
                </Link>
                <Link to="/conversations" className="mobile-nav-link">
                  Conversations
                </Link>
                <Link to="/templates" className="mobile-nav-link">
                  Templates
                </Link>
                <Link to="/collections" className="mobile-nav-link">
                  Collections
                </Link>
                <Link to="/help" className="mobile-nav-link">
                  Help
                </Link>
              </nav>
              <div className="mobile-menu-divider" />
              <div className="mobile-user-info">
                <div className="mobile-user-details">
                  <span className="mobile-user-name">{user.full_name}</span>
                  <span className="mobile-user-email">{user.email}</span>
                </div>
                <button onClick={handleLogout} className="mobile-logout-btn">
                  Logout
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}


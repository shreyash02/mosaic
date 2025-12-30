import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import './Header.css';

export default function Header() {
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSwitchWorkspace = (orgId: string | null) => {
    setCurrentOrganization(orgId);
    setShowOrgDropdown(false);
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOrgDropdown(false);
      }
    };

    if (showOrgDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOrgDropdown]);

  return (
    <header className="app-header">
      <div className="header-content">
        <Link to="/dashboard" className="logo-link">
          <div className="logo">
            <span className="logo-text">Mosaic</span>
          </div>
        </Link>

        {isAuthenticated && user && (
          <>
            {/* Organization Switcher */}
            <div className="org-switcher" ref={dropdownRef}>
              <button
                className="org-switcher-trigger"
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
              >
                <span className="org-icon">{isPersonalWorkspace ? '👤' : '🏢'}</span>
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
                    <span className="org-icon">👤</span>
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
                          <span className="org-icon">🏢</span>
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

            <nav className="header-nav">
              <Link to="/dashboard" className="nav-link">
                Dashboard
              </Link>
              <Link to="/organizations" className="nav-link">
                Organizations
              </Link>
            </nav>
            <div className="user-info">
            <div className="user-details">
              <span className="user-name">{user.full_name}</span>
              <span className="user-email">{user.email}</span>
            </div>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
          </>
        )}
      </div>
    </header>
  );
}


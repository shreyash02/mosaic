import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <Link to="/dashboard" className="logo-link">
          <div className="logo">
            <span className="logo-text">Mosaic</span>
          </div>
        </Link>
        
        {isAuthenticated && user && (
          <div className="user-info">
            <div className="user-details">
              <span className="user-name">{user.full_name}</span>
              <span className="user-email">{user.email}</span>
            </div>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}


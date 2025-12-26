import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

export default function Header() {
  return (
    <header className="app-header">
      <Link to="/dashboard" className="logo-link">
        <div className="logo">
          <span className="logo-text">Mosaic</span>
        </div>
      </Link>
    </header>
  );
}


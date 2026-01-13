import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'Admin') return '/admin';
    if (user.role === 'Officer') return '/officer';
    return '/citizen';
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          <Link to={getDashboardLink()} className="navbar-brand">
            SmartRedressal
          </Link>
          <div className="navbar-links">
            {user ? (
              <>
                <span className="navbar-user">👋 Welcome, {user.name} <span style={{ opacity: 0.9 }}>({user.role})</span></span>
                <Link to={getDashboardLink()} className="navbar-link">
                  📊 Dashboard
                </Link>
                <button onClick={handleLogout} className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="navbar-link">
                  Login
                </Link>
                <Link to="/register" className="navbar-link">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

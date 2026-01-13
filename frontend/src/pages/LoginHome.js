import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginHome.css';

const LoginHome = () => {
  const navigate = useNavigate();

  const roleCards = [
    {
      role: 'Citizen',
      icon: '👤',
      description: 'Submit and track your complaints',
      color: '#007bff',
      route: '/citizen-login'
    },
    {
      role: 'Officer',
      icon: '👮',
      description: 'Manage and resolve complaints',
      color: '#28a745',
      route: '/officer-login'
    },
    {
      role: 'Admin',
      icon: '👔',
      description: 'Monitor and analyze system',
      color: '#dc3545',
      route: '/admin-login'
    }
  ];

  return (
    <div className="login-home-container">
      <div className="login-home-content">
        <div className="login-header">
          <h1>AI Grievance Redressal Platform</h1>
          <p>Select your role to continue</p>
        </div>

        <div className="role-cards">
          {roleCards.map((card) => (
            <div
              key={card.role}
              className="role-card"
              onClick={() => navigate(card.route)}
              style={{ '--card-color': card.color }}
            >
              <div className="role-icon">{card.icon}</div>
              <h2>{card.role}</h2>
              <p>{card.description}</p>
              <div className="role-card-arrow">→</div>
            </div>
          ))}
        </div>

        <div className="login-footer">
          <p>
            Don't have an account? <a href="/register">Register here</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginHome;

import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Auth.css';

const OfficerLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.email, formData.password);
    setLoading(false);

    if (result.success) {
      setTimeout(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (storedUser.role === 'Officer') {
          navigate('/officer');
        } else {
          setError('This account is not an Officer account. Please use the correct login page.');
          setTimeout(() => {
            window.location.href = '/officer-login';
          }, 2000);
        }
      }, 100);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Officer Login</h2>
        <div className="alert alert-info" style={{ marginBottom: '20px', fontSize: '14px' }}>
          <strong>Note:</strong> Domain/Department is selected during <strong>registration</strong>, not login. 
          If you don't have an account, please <Link to="/register">register</Link> and select your domain.
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login as Officer'}
          </button>
        </form>
        <p className="auth-link">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
        <p className="auth-link" style={{ marginTop: '10px' }}>
          <Link to="/login">Citizen Login</Link> | <Link to="/admin-login">Admin Login</Link>
        </p>
      </div>
    </div>
  );
};

export default OfficerLogin;

import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'Citizen',
    domain: '',
    phone: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, user } = useContext(AuthContext);
  const navigate = useNavigate();

  const domains = ['Municipal', 'Healthcare', 'Education', 'Transport', 'Utilities', 'Other'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Clear domain if role changes away from Officer
    if (name === 'role' && value !== 'Officer') {
      setFormData({ ...formData, [name]: value, domain: '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Validate domain for officers
    if (formData.role === 'Officer' && !formData.domain) {
      setError('Please select a domain/department for Officer role');
      return;
    }

    setLoading(true);
    const { confirmPassword, ...registerData } = formData;
    // Remove domain if not officer
    if (registerData.role !== 'Officer') {
      delete registerData.domain;
    }
    const result = await register(registerData);
    setLoading(false);

    if (result.success) {
      // Wait a moment for context to update, then navigate
      setTimeout(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (storedUser.role === 'Admin') {
          navigate('/admin');
        } else if (storedUser.role === 'Officer') {
          navigate('/officer');
        } else {
          navigate('/citizen');
        }
      }, 100);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>📝 Create Account</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
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
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="Citizen">Citizen</option>
              <option value="Officer">Officer</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          {formData.role === 'Officer' && (
            <div className="form-group">
              <label>Domain/Department *</label>
              <select 
                name="domain" 
                value={formData.domain} 
                onChange={handleChange}
                required
              >
                <option value="">Select Domain</option>
                {domains.map(domain => (
                  <option key={domain} value={domain}>{domain}</option>
                ))}
              </select>
              <small style={{ color: '#666', fontSize: '12px' }}>
                Select the department/domain you work in
              </small>
            </div>
          )}
          <div className="form-group">
            <label>Phone (Optional)</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
          <div className="form-group">
            <label>Address (Optional)</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="auth-link">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

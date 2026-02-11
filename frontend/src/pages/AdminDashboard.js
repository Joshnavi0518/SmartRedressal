import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Dashboard.css';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!stats) {
    return <div className="container">Failed to load statistics</div>;
  }

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>👔 Admin Dashboard</h1>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
        <button
          className={`tab ${activeTab === 'recent' ? 'active' : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          Recent Complaints
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Complaints</h3>
            <p className="stat-number">{stats.totalComplaints}</p>
          </div>
          <div className="stat-card">
            <h3>Resolved</h3>
            <p className="stat-number">{stats.resolvedComplaints}</p>
            <p className="stat-percentage">
              {stats.resolutionRate}% resolution rate
            </p>
          </div>
          <div className="stat-card">
            <h3>In Progress</h3>
            <p className="stat-number">{stats.inProgressComplaints}</p>
          </div>
          <div className="stat-card">
            <h3>Pending</h3>
            <p className="stat-number">{stats.pendingComplaints}</p>
          </div>
          <div className="stat-card">
            <h3>Total Users</h3>
            <p className="stat-number">{stats.totalUsers}</p>
            <p className="stat-detail">
              {stats.totalCitizens} Citizens, {stats.totalOfficers} Officers
            </p>
          </div>
          <div className="stat-card">
            <h3>Avg Resolution Time</h3>
            <p className="stat-number">{stats.avgResolutionTime}</p>
            <p className="stat-detail">days</p>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="analytics-section">
          <div className="card">
            <h3>Complaints by Category</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {stats.complaintsByCategory.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item._id}</td>
                    <td>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Complaints by Status</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {stats.complaintsByStatus.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item._id}</td>
                    <td>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Complaints by Priority</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {stats.complaintsByPriority.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item._id}</td>
                    <td>{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'recent' && (
        <div className="recent-complaints">
          <h2>Recent Complaints</h2>
          {stats.recentComplaints.length === 0 ? (
            <div className="card">
              <p>No complaints yet.</p>
            </div>
          ) : (
            stats.recentComplaints.map((complaint) => (
              <div key={complaint._id} className="card">
                <div className="complaint-header">
                  <h3>{complaint.title}</h3>
                  <span className={`badge badge-${complaint.status === 'Resolved' ? 'success' : 'warning'}`}>
                    {complaint.status}
                  </span>
                </div>
                <p className="complaint-description">{complaint.description}</p>
                <div className="complaint-meta">
                  <p><strong>Category:</strong> {complaint.category}</p>
                  <p><strong>Citizen:</strong> {complaint.citizen?.name}</p>
                  <p><strong>Department:</strong> {complaint.department?.name}</p>
                  <p><strong>Submitted:</strong> {new Date(complaint.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

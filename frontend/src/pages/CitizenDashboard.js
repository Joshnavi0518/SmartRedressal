import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import FeedbackModal from '../components/FeedbackModal';
import './Dashboard.css';

const CitizenDashboard = () => {
  const { socket } = useSocket();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', location: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [feedbackComplaint, setFeedbackComplaint] = useState(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  // Listen for real-time status updates
  useEffect(() => {
    if (!socket) return;

    const handleStatusChange = async (data) => {
      // Update the specific complaint in the list immediately
      setComplaints(prevComplaints => 
        prevComplaints.map(complaint => 
          complaint._id === data.complaintId 
            ? { ...complaint, status: data.status }
            : complaint
        )
      );
      
      // Also refresh to get complete updated data
      await fetchComplaints();
      
      // Show notification message
      const statusMessages = {
        'Submitted': 'Your complaint has been submitted',
        'Assigned': 'Your complaint has been assigned to an officer',
        'In Progress': '✅ Work has started on your complaint! An officer is now actively working on it.',
        'Resolved': 'Your complaint has been resolved',
        'Closed': 'Your complaint has been closed'
      };
      
      const messageType = data.status === 'Resolved' ? 'success' : data.status === 'In Progress' ? 'success' : 'info';
      
      setMessage({ 
        type: messageType, 
        text: statusMessages[data.status] || data.message 
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 7000);
    };

    const handleResolution = (data) => {
      // Find the resolved complaint and show feedback modal
      const complaint = complaints.find(c => c._id === data.complaintId);
      if (complaint) {
        setFeedbackComplaint({ ...complaint, resolution: data.resolution });
      } else {
        // Fetch if not in list
        fetchComplaints().then(() => {
          setTimeout(() => {
            const updatedComplaint = complaints.find(c => c._id === data.complaintId);
            if (updatedComplaint) {
              setFeedbackComplaint({ ...updatedComplaint, resolution: data.resolution });
            }
          }, 500);
        });
      }
    };

    socket.on('complaint_status_changed', handleStatusChange);
    socket.on('complaint_resolved', handleResolution);

    return () => {
      socket.off('complaint_status_changed', handleStatusChange);
      socket.off('complaint_resolved', handleResolution);
    };
  }, [socket]);

  const fetchComplaints = async () => {
    try {
      const response = await api.get('/complaints');
      setComplaints(response.data.complaints);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setMessage({ type: 'error', text: 'Failed to fetch complaints' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/complaints', formData);
      setComplaints([response.data.complaint, ...complaints]);
      setFormData({ title: '', description: '', location: '' });
      setShowForm(false);
      setMessage({ type: 'success', text: 'Complaint submitted successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to submit complaint' });
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'Submitted': 'badge-info',
      'Assigned': 'badge-primary',
      'In Progress': 'badge-warning',
      'Resolved': 'badge-success',
      'Closed': 'badge-secondary',
    };
    return badges[status] || 'badge-info';
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      'Low': 'badge-info',
      'Medium': 'badge-primary',
      'High': 'badge-warning',
      'Critical': 'badge-danger',
    };
    return badges[priority] || 'badge-info';
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>👤 Citizen Dashboard</h1>
      </div>
      
      {message.text && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : message.type === 'info' ? 'info' : 'error'}`}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>📋 My Complaints</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '❌ Cancel' : '➕ Submit New Complaint'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3>Submit Complaint</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Brief description of your complaint"
              />
            </div>
            <div className="form-group">
              <label>Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                placeholder="Detailed description of the issue"
                rows="5"
              />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Address or location of the issue"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Submit Complaint
            </button>
          </form>
        </div>
      )}

      <div className="complaints-list">
        {complaints.length === 0 ? (
          <div className="card">
            <p>No complaints submitted yet. Submit your first complaint above!</p>
          </div>
        ) : (
          complaints.map((complaint) => (
            <div key={complaint._id} className="card">
              <div className="complaint-header">
                <h3>{complaint.title}</h3>
                <div>
                  <span className={`badge ${getStatusBadge(complaint.status)}`}>
                    {complaint.status}
                  </span>
                  <span className={`badge ${getPriorityBadge(complaint.priority)}`}>
                    {complaint.priority}
                  </span>
                </div>
              </div>
              <p className="complaint-description">{complaint.description}</p>
              <div className="complaint-meta">
                <p><strong>📂 Category:</strong> {complaint.category}</p>
                <p><strong>🏢 Department:</strong> {complaint.department?.name || 'N/A'}</p>
                {complaint.location && <p><strong>📍 Location:</strong> {complaint.location}</p>}
                <p><strong>📅 Submitted:</strong> {new Date(complaint.createdAt).toLocaleDateString()}</p>
                {complaint.assignedOfficer && (
                  <p><strong>👤 Assigned Officer:</strong> {complaint.assignedOfficer.name || 'N/A'}</p>
                )}
                {complaint.resolution && (
                  <div className="resolution">
                    <strong>✅ Resolution:</strong> {complaint.resolution}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {feedbackComplaint && (
        <FeedbackModal
          complaint={feedbackComplaint}
          onClose={() => setFeedbackComplaint(null)}
          onSuccess={() => {
            fetchComplaints();
            setMessage({ type: 'success', text: 'Thank you for your feedback!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
          }}
        />
      )}
    </div>
  );
};

export default CitizenDashboard;

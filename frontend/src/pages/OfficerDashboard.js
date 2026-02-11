import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import './Dashboard.css';

const OfficerDashboard = () => {
  const { user } = useContext(AuthContext);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [statusForm, setStatusForm] = useState({ status: '', resolution: '' });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchComplaints();
  }, []);

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

  const handleStatusChange = (complaint) => {
    setSelectedComplaint(complaint);
    setStatusForm({ status: complaint.status, resolution: complaint.resolution || '' });
  };

  const handleAssignToMe = async (complaintId) => {
    try {
      setLoading(true);
      const response = await api.put(`/complaints/${complaintId}/assign`, {});
      await fetchComplaints(); // Refresh the list
      setMessage({ type: 'success', text: 'Complaint assigned to you successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to assign complaint' });
      setLoading(false);
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.put(`/complaints/${selectedComplaint._id}/status`, statusForm);
      setSelectedComplaint(null);
      await fetchComplaints(); // Refresh the list
      setMessage({ type: 'success', text: 'Status updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update status' });
      setLoading(false);
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

  // Check if user has department
  const hasDepartment = user?.department && (user.department._id || user.department);

  return (
    <div className="container">
      <div className="dashboard-header">
        <div>
          <h1>👮 Officer Dashboard</h1>
          {user && (
            <p style={{ color: '#666', marginTop: '5px' }}>
              {hasDepartment ? (
                <>Department: <strong>{typeof user.department === 'object' ? user.department.name : 'N/A'}</strong></>
              ) : (
                <span style={{ color: '#dc3545' }}>
                  ⚠️ No department assigned. Please contact admin or re-register with a domain.
                </span>
              )}
            </p>
          )}
        </div>
        <button className="btn btn-secondary" onClick={fetchComplaints} disabled={loading}>
          {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>
      
      {message.text && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : message.type === 'info' ? 'info' : 'error'}`}>
          {message.text}
        </div>
      )}

      {!hasDepartment && (
        <div className="alert alert-error">
          <strong>Warning:</strong> You are not assigned to any department. 
          You will only see complaints that are directly assigned to you. 
          To see unassigned complaints from your department, you need to be assigned to a department. 
          Please contact an administrator or register a new account with a domain selection.
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Complaints</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span className="badge badge-info">Active: {complaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length}</span>
          <span className="badge badge-secondary">Resolved: {complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length}</span>
        </div>
      </div>

      {complaints.length === 0 ? (
        <div className="card">
          <p>No complaints available. Complaints from your department will appear here.</p>
        </div>
      ) : (
        <>
          {/* Active Complaints */}
          {complaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length > 0 && (
            <div>
              <h3 style={{ marginBottom: '15px', color: '#333', fontSize: '1.3rem' }}>Active Complaints</h3>
              <div className="complaints-list">
                {complaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').map((complaint) => {
                  const isUnassigned = !complaint.assignedOfficer;
                  const userId = user?._id || user?.id;
                  const isAssignedToMe = complaint.assignedOfficer && 
                    userId && 
                    complaint.assignedOfficer._id === userId;
                  
                  return (
                    <div key={complaint._id} className={`card ${isUnassigned ? 'unassigned-complaint' : ''}`}>
                      <div className="complaint-header">
                        <h3>{complaint.title}</h3>
                        <div>
                          {isUnassigned && (
                            <span className="badge badge-warning">Unassigned</span>
                          )}
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
                        <p><strong>Category:</strong> {complaint.category}</p>
                        <p><strong>Department:</strong> {complaint.department?.name || 'N/A'}</p>
                        <p><strong>Citizen:</strong> {complaint.citizen?.name || 'N/A'} ({complaint.citizen?.email})</p>
                        {complaint.location && <p><strong>Location:</strong> {complaint.location}</p>}
                        <p><strong>Submitted:</strong> {new Date(complaint.createdAt).toLocaleDateString()}</p>
                        {complaint.sentiment && (
                          <p><strong>Sentiment:</strong> {complaint.sentiment}</p>
                        )}
                        {!isUnassigned && complaint.assignedOfficer && (
                          <p><strong>Assigned To:</strong> {complaint.assignedOfficer.name || 'You'}</p>
                        )}
                      </div>
                      <div className="complaint-actions">
                        {isUnassigned ? (
                          <button
                            className="btn btn-success"
                            onClick={() => handleAssignToMe(complaint._id)}
                          >
                            Assign to Me
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {complaint.status === 'Submitted' || complaint.status === 'Assigned' ? (
                              <button
                                className="btn btn-success"
                                onClick={async () => {
                                  try {
                                    setLoading(true);
                                    await api.put(`/complaints/${complaint._id}/status`, { 
                                      status: 'In Progress',
                                      resolution: ''
                                    });
                                    await fetchComplaints();
                                    setMessage({ type: 'success', text: 'Status updated to In Progress!' });
                                    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                                  } catch (error) {
                                    setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update status' });
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                              >
                                Start Working
                              </button>
                            ) : null}
                            {complaint.status === 'In Progress' ? (
                              <button
                                className="btn btn-primary"
                                onClick={() => {
                                  setStatusForm({ status: 'Resolved', resolution: '' });
                                  handleStatusChange(complaint);
                                }}
                              >
                                Mark as Resolved
                              </button>
                            ) : null}
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleStatusChange(complaint)}
                            >
                              Update Status
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resolved/Completed Complaints */}
          {complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length > 0 && (
            <div style={{ marginTop: '40px' }}>
              <h3 style={{ marginBottom: '15px', color: '#666', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>✅</span> Completed Complaints
              </h3>
              <div className="complaints-list resolved-complaints">
                {complaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').map((complaint) => {
                  return (
                    <div key={complaint._id} className="card resolved-complaint-card">
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
                        <p><strong>Category:</strong> {complaint.category}</p>
                        <p><strong>Citizen:</strong> {complaint.citizen?.name || 'N/A'}</p>
                        <p><strong>Submitted:</strong> {new Date(complaint.createdAt).toLocaleDateString()}</p>
                        {complaint.resolvedAt && (
                          <p><strong>Resolved:</strong> {new Date(complaint.resolvedAt).toLocaleDateString()}</p>
                        )}
                        {complaint.resolution && (
                          <div className="resolution">
                            <strong>Resolution:</strong> {complaint.resolution}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
      {selectedComplaint && (
        <div className="modal-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Update Complaint Status</h3>
            <form onSubmit={handleStatusSubmit}>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={statusForm.status}
                  onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                  required
                >
                  <option value="Submitted">Submitted</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div className="form-group">
                <label>
                  {statusForm.status === 'Resolved' || statusForm.status === 'Closed' 
                    ? 'Resolution *' 
                    : statusForm.status === 'In Progress'
                    ? 'Progress Notes'
                    : 'Notes'}
                </label>
                <textarea
                  value={statusForm.resolution}
                  onChange={(e) => setStatusForm({ ...statusForm, resolution: e.target.value })}
                  rows="4"
                  placeholder={
                    statusForm.status === 'Resolved' 
                      ? 'Describe how the issue was resolved...' 
                      : statusForm.status === 'In Progress'
                      ? 'Describe the progress made or actions taken...'
                      : 'Add any notes or comments...'
                  }
                  required={statusForm.status === 'Resolved' || statusForm.status === 'Closed'}
                />
                <small style={{ color: '#666', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                  {statusForm.status === 'Resolved' && 'Citizen will be asked for feedback after resolution'}
                  {statusForm.status === 'In Progress' && 'Citizen will be notified that work has started'}
                </small>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Update
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedComplaint(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficerDashboard;

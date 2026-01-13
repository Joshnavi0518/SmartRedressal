const { getIO } = require('../socket/socketServer');
const Complaint = require('../models/Complaint');
const User = require('../models/User');

/**
 * Emit notification to specific user
 */
const notifyUser = (userId, event, data) => {
  try {
    const io = getIO();
    console.log(`📤 Emitting ${event} to user_${userId}:`, data);
    io.to(`user_${userId}`).emit(event, data);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

/**
 * Emit notification to all users with specific role
 */
const notifyRole = (role, event, data) => {
  try {
    const io = getIO();
    console.log(`📤 Emitting ${event} to role_${role}:`, data);
    io.to(`role_${role}`).emit(event, data);
  } catch (error) {
    console.error('Error sending role notification:', error);
  }
};

/**
 * Notify citizen when complaint status changes
 */
const notifyStatusChange = async (complaintId, newStatus) => {
  try {
    const complaint = await Complaint.findById(complaintId)
      .populate('citizen', 'name email')
      .populate('assignedOfficer', 'name email')
      .populate('department', 'name');

    if (complaint && complaint.citizen) {
      notifyUser(complaint.citizen._id, 'complaint_status_changed', {
        complaintId: complaint._id,
        title: complaint.title,
        status: newStatus,
        message: `Your complaint "${complaint.title}" status has been updated to ${newStatus}`
      });
    }
  } catch (error) {
    console.error('Error notifying status change:', error);
  }
};

/**
 * Notify officer when assigned a new complaint
 */
const notifyNewAssignment = async (complaintId, officerId) => {
  try {
    const complaint = await Complaint.findById(complaintId)
      .populate('citizen', 'name email')
      .populate('department', 'name');

    if (complaint) {
      notifyUser(officerId, 'new_assignment', {
        complaintId: complaint._id,
        title: complaint.title,
        category: complaint.category,
        priority: complaint.priority,
        message: `You have been assigned a new complaint: "${complaint.title}"`
      });
    }
  } catch (error) {
    console.error('Error notifying new assignment:', error);
  }
};

/**
 * Notify admin on priority escalation
 */
const notifyPriorityEscalation = async (complaintId) => {
  try {
    const complaint = await Complaint.findById(complaintId)
      .populate('citizen', 'name email')
      .populate('department', 'name');

    if (complaint && (complaint.priority === 'High' || complaint.priority === 'Critical')) {
      notifyRole('Admin', 'priority_escalation', {
        complaintId: complaint._id,
        title: complaint.title,
        priority: complaint.priority,
        category: complaint.category,
        message: `Priority escalation: ${complaint.priority} priority complaint "${complaint.title}"`
      });
    }
  } catch (error) {
    console.error('Error notifying priority escalation:', error);
  }
};

/**
 * Notify citizen when complaint is resolved (for feedback)
 */
const notifyResolution = async (complaintId) => {
  try {
    const complaint = await Complaint.findById(complaintId)
      .populate('citizen', 'name email')
      .populate('assignedOfficer', 'name email');

    if (complaint && complaint.citizen) {
      notifyUser(complaint.citizen._id, 'complaint_resolved', {
        complaintId: complaint._id,
        title: complaint.title,
        resolution: complaint.resolution,
        message: `Your complaint "${complaint.title}" has been resolved. Please provide feedback.`
      });
    }
  } catch (error) {
    console.error('Error notifying resolution:', error);
  }
};

/**
 * Notify department officers of new unassigned complaint
 */
const notifyNewComplaint = async (complaintId) => {
  try {
    const complaint = await Complaint.findById(complaintId)
      .populate('department', 'name')
      .populate('citizen', 'name email');

    if (complaint && complaint.department) {
      const io = getIO();
      const notificationData = {
        complaintId: complaint._id,
        title: complaint.title,
        category: complaint.category,
        priority: complaint.priority,
        message: `New ${complaint.category} complaint: "${complaint.title}"`
      };
      console.log(`📤 Emitting new_complaint to dept_${complaint.department._id}:`, notificationData);
      io.to(`dept_${complaint.department._id}`).emit('new_complaint', notificationData);
    }
  } catch (error) {
    console.error('Error notifying new complaint:', error);
  }
};

module.exports = {
  notifyUser,
  notifyRole,
  notifyStatusChange,
  notifyNewAssignment,
  notifyPriorityEscalation,
  notifyResolution,
  notifyNewComplaint
};

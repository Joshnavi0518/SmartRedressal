const express = require('express');
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const Department = require('../models/Department');
const Feedback = require('../models/Feedback');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require Admin role
router.use(protect);
router.use(authorize('Admin'));

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics
// @access  Private (Admin)
router.get('/stats', async (req, res, next) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolvedComplaints = await Complaint.countDocuments({ status: 'Resolved' });
    const inProgressComplaints = await Complaint.countDocuments({ status: 'In Progress' });
    const pendingComplaints = await Complaint.countDocuments({ status: 'Submitted' });
    const totalUsers = await User.countDocuments();
    const totalOfficers = await User.countDocuments({ role: 'Officer' });
    const totalCitizens = await User.countDocuments({ role: 'Citizen' });

    // Complaints by category
    const complaintsByCategory = await Complaint.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
    ]);

    // Complaints by status
    const complaintsByStatus = await Complaint.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Complaints by priority
    const complaintsByPriority = await Complaint.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
        },
      },
    ]);

    // Average resolution time (for resolved complaints)
    const resolvedComplaintsWithTime = await Complaint.find({
      status: 'Resolved',
      resolvedAt: { $exists: true },
    });

    let avgResolutionTime = 0;
    if (resolvedComplaintsWithTime.length > 0) {
      const totalTime = resolvedComplaintsWithTime.reduce((sum, complaint) => {
        const timeDiff = complaint.resolvedAt - complaint.createdAt;
        return sum + timeDiff;
      }, 0);
      avgResolutionTime = totalTime / resolvedComplaintsWithTime.length / (1000 * 60 * 60 * 24); // Convert to days
    }

    // Recent complaints
    const recentComplaints = await Complaint.find()
      .populate('citizen', 'name email')
      .populate('department', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      stats: {
        totalComplaints,
        resolvedComplaints,
        inProgressComplaints,
        pendingComplaints,
        totalUsers,
        totalOfficers,
        totalCitizens,
        resolutionRate: totalComplaints > 0 ? (resolvedComplaints / totalComplaints * 100).toFixed(2) : 0,
        avgResolutionTime: avgResolutionTime.toFixed(2),
        complaintsByCategory,
        complaintsByStatus,
        complaintsByPriority,
        recentComplaints,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().select('-password').populate('department', 'name');
    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

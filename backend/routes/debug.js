const express = require('express');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/debug/departments
// @desc    Debug: Get all departments with their officers and complaints
// @access  Private
router.get('/departments', protect, async (req, res, next) => {
  try {
    const departments = await Department.find()
      .populate('officers', 'name email role')
      .lean();

    const departmentsWithComplaints = await Promise.all(
      departments.map(async (dept) => {
        const complaints = await Complaint.find({ department: dept._id })
          .populate('citizen', 'name email')
          .populate('assignedOfficer', 'name email')
          .lean();

        return {
          ...dept,
          complaints: complaints.map(c => ({
            id: c._id.toString(),
            title: c.title,
            category: c.category,
            status: c.status,
            assignedOfficer: c.assignedOfficer ? c.assignedOfficer.name : 'Unassigned',
            citizen: c.citizen.name
          })),
          totalComplaints: complaints.length,
          unassignedComplaints: complaints.filter(c => !c.assignedOfficer).length
        };
      })
    );

    res.json({
      success: true,
      departments: departmentsWithComplaints,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/debug/officer/:officerId
// @desc    Debug: Get officer's department and matching complaints
// @access  Private
router.get('/officer/:officerId', protect, async (req, res, next) => {
  try {
    const officer = await User.findById(req.params.officerId).populate('department');
    
    if (!officer) {
      return res.status(404).json({
        success: false,
        message: 'Officer not found',
      });
    }

    let matchingComplaints = [];
    if (officer.department) {
      matchingComplaints = await Complaint.find({
        $or: [
          { assignedOfficer: officer._id },
          { 
            assignedOfficer: null, 
            department: officer.department._id 
          }
        ]
      })
      .populate('citizen', 'name email')
      .populate('department', 'name category')
      .lean();
    }

    res.json({
      success: true,
      officer: {
        id: officer._id.toString(),
        name: officer.name,
        email: officer.email,
        role: officer.role,
        department: officer.department ? {
          id: officer.department._id.toString(),
          name: officer.department.name,
          category: officer.department.category
        } : null
      },
      matchingComplaints: matchingComplaints.map(c => ({
        id: c._id.toString(),
        title: c.title,
        category: c.category,
        status: c.status,
        departmentId: c.department?._id?.toString(),
        departmentName: c.department?.name,
        departmentCategory: c.department?.category,
        assignedOfficer: c.assignedOfficer ? c.assignedOfficer._id.toString() : null,
        isUnassigned: !c.assignedOfficer
      })),
      totalMatching: matchingComplaints.length
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

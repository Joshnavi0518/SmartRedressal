const express = require('express');
const { body, validationResult } = require('express-validator');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const { protect, authorize } = require('../middleware/auth');
const { analyzeComplaint } = require('../utils/aiService');

const router = express.Router();

// @route   POST /api/complaints
// @desc    Create a new complaint
// @access  Private (Citizen)
router.post(
  '/',
  protect,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('location').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { title, description, location } = req.body;

      // Get AI analysis
      const aiAnalysis = await analyzeComplaint(title, description);
      
      console.log('🤖 AI Analysis Result:', {
        category: aiAnalysis.category,
        sentiment: aiAnalysis.sentiment,
        priority: aiAnalysis.priority,
        confidence: aiAnalysis.confidence,
        complaintTitle: title
      });

      // Find or create department based on category
      // First try to find existing department by category
      let department = await Department.findOne({ category: aiAnalysis.category });
      
      console.log('🏢 Department Lookup:', {
        category: aiAnalysis.category,
        departmentFound: department ? department.name : 'NOT FOUND - will create'
      });
      
      if (!department) {
        // If no department found for this category, create one
        const departmentNames = {
          'Municipal': 'Municipal Services',
          'Healthcare': 'Healthcare Department',
          'Education': 'Education Department',
          'Transport': 'Transport Department',
          'Utilities': 'Utilities Department',
          'Other': 'General Department',
        };

        department = await Department.create({
          name: departmentNames[aiAnalysis.category] || aiAnalysis.category,
          category: aiAnalysis.category,
          description: `${aiAnalysis.category} complaints department`,
        });
      }

      // Create complaint
      const complaint = await Complaint.create({
        title,
        description,
        category: aiAnalysis.category,
        priority: aiAnalysis.priority,
        sentiment: aiAnalysis.sentiment,
        citizen: req.user._id,
        department: department._id,
        location,
        aiAnalysis,
      });

      // Debug logging (remove in production)
      console.log('Complaint created:', {
        complaintId: complaint._id,
        category: aiAnalysis.category,
        departmentId: department._id.toString(),
        departmentName: department.name,
        departmentCategory: department.category
      });

      await complaint.populate('citizen', 'name email');
      await complaint.populate('department', 'name category');

      res.status(201).json({
        success: true,
        complaint,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/complaints
// @desc    Get all complaints (filtered by role)
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    let query = {};

    // Citizens see only their complaints
    if (req.user.role === 'Citizen') {
      query.citizen = req.user._id;
    }

    // Officers see:
    // 1. Complaints assigned to them
    // 2. Unassigned complaints from their department (so they can pick them up)
    if (req.user.role === 'Officer') {
      // Populate user to get department
      await req.user.populate('department');
      
      if (req.user.department) {
        const departmentId = req.user.department._id || req.user.department;
        
        // Show complaints assigned to this officer OR unassigned complaints from their department
        query.$or = [
          { assignedOfficer: req.user._id },
          { 
            assignedOfficer: null, 
            department: departmentId 
          }
        ];
        
        // Debug logging (remove in production)
        console.log('Officer department:', {
          departmentId: departmentId.toString(),
          departmentName: req.user.department.name,
          departmentCategory: req.user.department.category
        });
      } else {
        // If officer has no department, only show assigned complaints
        query.assignedOfficer = req.user._id;
        console.log('Officer has no department assigned');
      }
    }

    // Admins see all complaints
    // (no query filter needed)

    const complaints = await Complaint.find(query)
      .populate('citizen', 'name email')
      .populate('assignedOfficer', 'name email')
      .populate('department', 'name category')
      .sort({ createdAt: -1 });

    // Debug logging for officers (remove in production)
    if (req.user.role === 'Officer') {
      console.log('Officer complaints query result:', {
        officerId: req.user._id.toString(),
        query: JSON.stringify(query),
        complaintsFound: complaints.length,
        complaintDetails: complaints.map(c => ({
          id: c._id.toString(),
          title: c.title,
          departmentId: c.department?._id?.toString(),
          departmentName: c.department?.name,
          assignedOfficer: c.assignedOfficer?._id?.toString()
        }))
      });
    }

    res.json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/complaints/:id
// @desc    Get single complaint
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    let complaint = await Complaint.findById(req.params.id)
      .populate('citizen', 'name email')
      .populate('assignedOfficer', 'name email')
      .populate('department', 'name category')
      .populate('feedback');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Check access rights
    if (req.user.role === 'Citizen' && complaint.citizen._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this complaint',
      });
    }

    if (req.user.role === 'Officer') {
      // Officers can view:
      // 1. Complaints assigned to them
      // 2. Unassigned complaints from their department
      await req.user.populate('department');
      
      const isAssignedToMe = complaint.assignedOfficer && 
        complaint.assignedOfficer._id.toString() === req.user._id.toString();
      
      const isUnassignedFromMyDept = !complaint.assignedOfficer && 
        req.user.department &&
        complaint.department._id.toString() === req.user.department._id.toString();
      
      if (!isAssignedToMe && !isUnassignedFromMyDept) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to access this complaint',
        });
      }
    }

    res.json({
      success: true,
      complaint,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/complaints/:id/assign
// @desc    Assign complaint to officer
// @access  Private (Admin/Officer)
router.put(
  '/:id/assign',
  protect,
  authorize('Admin', 'Officer'),
  async (req, res, next) => {
    try {
      const complaint = await Complaint.findById(req.params.id).populate('department');
      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found',
        });
      }

      // If officerId is provided (Admin assigning), use it
      // Otherwise, if Officer is self-assigning, use their own ID
      let officerId = req.body.officerId;
      
      if (req.user.role === 'Officer') {
        // Officers can only assign to themselves
        // Check if complaint is from their department
        await req.user.populate('department');
        
        if (!req.user.department) {
          return res.status(403).json({
            success: false,
            message: 'You must be assigned to a department to assign complaints',
          });
        }

        if (complaint.department._id.toString() !== req.user.department._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'You can only assign complaints from your department',
          });
        }

        // Self-assign
        officerId = req.user._id;
      } else if (req.user.role === 'Admin') {
        // Admin must provide officerId
        if (!officerId) {
          return res.status(400).json({
            success: false,
            message: 'Officer ID is required',
          });
        }
      }

      complaint.assignedOfficer = officerId;
      complaint.status = 'Assigned';
      await complaint.save();

      await complaint.populate('assignedOfficer', 'name email');
      await complaint.populate('citizen', 'name email');
      await complaint.populate('department', 'name category');

      res.json({
        success: true,
        complaint,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/complaints/:id/status
// @desc    Update complaint status
// @access  Private (Officer, Admin)
router.put(
  '/:id/status',
  protect,
  authorize('Officer', 'Admin'),
  [
    body('status').isIn(['Submitted', 'Assigned', 'In Progress', 'Resolved', 'Closed']).withMessage('Invalid status'),
    body('resolution').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const complaint = await Complaint.findById(req.params.id);
      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found',
        });
      }

      // Check if officer is assigned to this complaint or if it's unassigned from their department
      if (req.user.role === 'Officer') {
        await req.user.populate('department');
        const isAssignedToMe = complaint.assignedOfficer && 
          complaint.assignedOfficer.toString() === req.user._id.toString();
        const isUnassignedFromMyDept = !complaint.assignedOfficer && 
          req.user.department &&
          complaint.department.toString() === req.user.department._id.toString();
        
        if (!isAssignedToMe && !isUnassignedFromMyDept) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to update this complaint',
          });
        }
      }

      const oldStatus = complaint.status;
      complaint.status = req.body.status;
      if (req.body.resolution) {
        complaint.resolution = req.body.resolution;
      }
      if (req.body.status === 'Resolved') {
        complaint.resolvedAt = new Date();
      }

      await complaint.save();

      await complaint.populate('assignedOfficer', 'name email');
      await complaint.populate('citizen', 'name email');

      res.json({
        success: true,
        complaint,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;

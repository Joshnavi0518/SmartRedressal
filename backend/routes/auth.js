const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Department = require('../models/Department');
const generateToken = require('../utils/generateToken');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['Citizen', 'Officer', 'Admin']).withMessage('Invalid role'),
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

      const { name, email, password, role, phone, address, domain } = req.body;

      // Check if user exists
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({
          success: false,
          message: 'User already exists',
        });
      }

      let departmentId = null;

      // For Officers, assign department based on domain/category
      if (role === 'Officer' && domain) {
        // Validate domain
        const validDomains = ['Municipal', 'Healthcare', 'Education', 'Transport', 'Utilities', 'Other'];
        if (!validDomains.includes(domain)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid domain. Must be one of: Municipal, Healthcare, Education, Transport, Utilities, Other',
          });
        }

        // Find or create department for this category
        // IMPORTANT: Use the same logic as complaint creation to ensure matching
        let department = await Department.findOne({ category: domain });
        if (!department) {
          // Create department if it doesn't exist
          const departmentNames = {
            'Municipal': 'Municipal Services',
            'Healthcare': 'Healthcare Department',
            'Education': 'Education Department',
            'Transport': 'Transport Department',
            'Utilities': 'Utilities Department',
            'Other': 'General Department',
          };

          department = await Department.create({
            name: departmentNames[domain] || domain,
            category: domain,
            description: `${domain} complaints department`,
          });
        }
        departmentId = department._id;
        
        // Debug logging (remove in production)
        console.log('Officer registered with department:', {
          officerEmail: email,
          domain: domain,
          departmentId: departmentId.toString(),
          departmentName: department.name,
          departmentCategory: department.category
        });
      }

      // Create user
      const user = await User.create({
        name,
        email,
        password,
        role: role || 'Citizen',
        phone,
        address,
        department: departmentId,
      });

      // If officer, add them to department's officers array
      if (role === 'Officer' && departmentId) {
        await Department.findByIdAndUpdate(departmentId, {
          $addToSet: { officers: user._id },
        });
      }

      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
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

      const { email, password } = req.body;

      // Check if user exists and get password
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const token = generateToken(user._id);

      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('department', 'name');
    
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

const express = require('express');
const { body, validationResult } = require('express-validator');
const Department = require('../models/Department');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/departments
// @desc    Get all departments
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const departments = await Department.find().populate('officers', 'name email');
    res.json({
      success: true,
      count: departments.length,
      departments,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/departments
// @desc    Create a new department
// @access  Private (Admin)
router.post(
  '/',
  protect,
  authorize('Admin'),
  [
    body('name').trim().notEmpty().withMessage('Department name is required'),
    body('category').isIn(['Municipal', 'Healthcare', 'Education', 'Transport', 'Utilities', 'Other']).withMessage('Invalid category'),
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

      const department = await Department.create(req.body);
      res.status(201).json({
        success: true,
        department,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/departments/:id
// @desc    Get single department
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id).populate('officers', 'name email');
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }
    res.json({
      success: true,
      department,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

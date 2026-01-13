const express = require('express');
const { body, validationResult } = require('express-validator');
const Feedback = require('../models/Feedback');
const Complaint = require('../models/Complaint');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/feedback
// @desc    Submit feedback for a complaint
// @access  Private (Citizen)
router.post(
  '/',
  protect,
  [
    body('complaintId').notEmpty().withMessage('Complaint ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().trim(),
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

      const { complaintId, rating, comment } = req.body;

      // Check if complaint exists and belongs to user
      const complaint = await Complaint.findById(complaintId);
      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found',
        });
      }

      if (complaint.citizen.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to provide feedback for this complaint',
        });
      }

      // Check if feedback already exists
      let feedback = await Feedback.findOne({ complaint: complaintId });
      if (feedback) {
        feedback.rating = rating;
        feedback.comment = comment;
        await feedback.save();
      } else {
        feedback = await Feedback.create({
          complaint: complaintId,
          citizen: req.user._id,
          rating,
          comment,
        });
        complaint.feedback = feedback._id;
        await complaint.save();
      }

      await feedback.populate('citizen', 'name email');
      await feedback.populate('complaint', 'title status');

      res.status(201).json({
        success: true,
        feedback,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/feedback
// @desc    Get all feedback
// @access  Private (Admin)
router.get('/', protect, async (req, res, next) => {
  try {
    let query = {};
    
    // Citizens see only their feedback
    if (req.user.role === 'Citizen') {
      query.citizen = req.user._id;
    }

    const feedbacks = await Feedback.find(query)
      .populate('citizen', 'name email')
      .populate('complaint', 'title status')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: feedbacks.length,
      feedbacks,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

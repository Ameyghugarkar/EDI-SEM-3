const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Violation = require('../models/Violation');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');

// Get employee violations
router.get('/violations', ensureAuthenticated, async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const violations = await Violation.find({ employeeId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Violation.countDocuments({ employeeId: req.user._id });

    const stats = {
      total,
      pending: await Violation.countDocuments({ employeeId: req.user._id, status: 'pending' }),
      acknowledged: await Violation.countDocuments({ employeeId: req.user._id, status: 'acknowledged' }),
      resolved: await Violation.countDocuments({ employeeId: req.user._id, status: 'resolved' })
    };

    res.json({
      violations,
      stats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get violations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Acknowledge violation
router.put('/violations/:id/acknowledge', ensureAuthenticated, async (req, res) => {
  try {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid violation ID format' });
    }

    const violation = await Violation.findById(req.params.id);

    if (!violation) {
      return res.status(404).json({ message: 'Violation not found' });
    }

    if (violation.employeeId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (violation.status === 'acknowledged') {
      return res.status(400).json({ message: 'Violation already acknowledged' });
    }

    violation.status = 'acknowledged';
    violation.acknowledgedAt = Date.now();
    await violation.save();

    res.json({ message: 'Violation acknowledged', violation });
  } catch (err) {
    console.error('Acknowledge violation error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

const Employee = require('../models/Employee');

// Get employee profile
router.get('/profile', ensureAuthenticated, async (req, res) => {
  try {
    const profile = await Employee.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    res.json({ profile });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get employee training records
router.get('/training', ensureAuthenticated, async (req, res) => {
  try {
    const profile = await Employee.findOne({ userId: req.user._id })
      .select('safetyTraining');

    if (!profile) {
      return res.json({ trainings: [] });
    }

    res.json({ trainings: profile.safetyTraining || [] });
  } catch (err) {
    console.error('Get training error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get employee equipment
router.get('/equipment', ensureAuthenticated, async (req, res) => {
  try {
    const profile = await Employee.findOne({ userId: req.user._id })
      .select('assignedEquipment');

    if (!profile) {
      return res.json({ equipment: [] });
    }

    res.json({ equipment: profile.assignedEquipment || [] });
  } catch (err) {
    console.error('Get equipment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
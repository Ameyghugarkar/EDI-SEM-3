const express = require('express');
const router = express.Router();
const Violation = require('../models/Violation');
const User = require('../models/User');
const Employee = require('../models/Employee');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');
const { updateEmployeeStatsOnViolation } = require('../middleware/violationHooks');

// Get all violations (for manager)
router.get('/violations', ensureRole('manager', 'admin'), async (req, res) => {
  try {
    // Check if user wants to see all violations or just unresolved ones
    const showAll = req.query.showAll === 'true';
    
    // Build query filter
    const filter = showAll 
      ? {} // Show all violations
      : { status: { $in: ['pending', 'acknowledged'] } }; // Only unresolved violations
    
    const violations = await Violation.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json({ 
      violations,
      filter: showAll ? 'all' : 'unresolved',
      count: violations.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create violation
router.post('/violations', ensureRole('manager', 'admin'), async (req, res) => {
  const {
    employeeId,
    violationType,
    latitude,
    longitude,
    address,
    description,
    severity
  } = req.body;

  try {
    // Validate coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: 'Invalid coordinates provided' });
    }

    if (lat < -90 || lat > 90) {
      return res.status(400).json({ message: 'Latitude must be between -90 and 90' });
    }

    if (lng < -180 || lng > 180) {
      return res.status(400).json({ message: 'Longitude must be between -180 and 180' });
    }

    // Get employee details
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (employee.role !== 'employee') {
      return res.status(400).json({ message: 'User is not an employee' });
    }

    // Check if employee profile exists
    const employeeProfile = await Employee.findOne({ userId: employeeId });
    if (!employeeProfile) {
      return res.status(404).json({ message: 'Employee profile not found. Please create employee profile first.' });
    }

    const violation = new Violation({
      employeeId,
      employeeName: employee.name,
      violationType,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
        address
      },
      description,
      severity,
      recordedBy: req.user._id,
      recordedByName: req.user.name
    });

    await violation.save();

    // Update employee stats
    try {
      await updateEmployeeStatsOnViolation(violation);
    } catch (statsErr) {
      console.error('Error updating employee stats:', statsErr);
      // Don't fail the request if stats update fails
    }

    res.json({ message: 'Violation recorded successfully', violation });
  } catch (err) {
    console.error('Create violation error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all employees
router.get('/employees', ensureRole('manager', 'admin'), async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' })
      .select('-password');
    res.json({ employees });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update violation status and assign to employee
router.put('/violations/:id', ensureRole('manager', 'admin'), async (req, res) => {
  try {
    const { status, employeeId, employeeName } = req.body;
    const violation = await Violation.findById(req.params.id);

    if (!violation) {
      return res.status(404).json({ message: 'Violation not found' });
    }

    // Update status
    if (status) {
      violation.status = status;
      if (status === 'acknowledged' && !violation.acknowledgedAt) {
        violation.acknowledgedAt = Date.now();
      }
      if (status === 'resolved') {
        violation.resolvedAt = Date.now();
      }
    }

    // Assign to employee if provided
    if (employeeId) {
      const employee = await User.findById(employeeId);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      if (employee.role !== 'employee') {
        return res.status(400).json({ message: 'User is not an employee' });
      }
      violation.employeeId = employeeId;
      violation.employeeName = employeeName || employee.name;

      // Update employee stats
      try {
        const Employee = require('../models/Employee');
        const employeeProfile = await Employee.findOne({ userId: employeeId });
        if (employeeProfile) {
          await employeeProfile.updateViolationStats();
          employeeProfile.calculateSafetyScore();
          await employeeProfile.save();
        }
      } catch (statsErr) {
        console.error('Error updating employee stats:', statsErr);
      }
    }

    await violation.save();

    res.json({ message: 'Violation updated', violation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get employee profile
router.get('/employees/:id/profile', ensureRole('manager', 'admin'), async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.params.id })
      .populate('userId', '-password');

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ employee });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create employee profile
router.post('/employees/profile', ensureRole('manager', 'admin'), async (req, res) => {
  try {
    const {
      userId,
      employeeId,
      firstName,
      lastName,
      department,
      position,
      dateOfJoining,
      dateOfBirth,
      address,
      emergencyContact
    } = req.body;

    // Check if employee profile already exists
    let employee = await Employee.findOne({ userId });
    if (employee) {
      return res.status(400).json({ message: 'Employee profile already exists' });
    }

    employee = new Employee({
      userId,
      employeeId,
      firstName,
      lastName,
      department,
      position,
      dateOfJoining,
      dateOfBirth,
      address,
      emergencyContact
    });

    await employee.save();
    res.json({ message: 'Employee profile created', employee });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update employee profile
router.put('/employees/:id/profile', ensureRole('manager', 'admin'), async (req, res) => {
  try {
    const employee = await Employee.findOneAndUpdate(
      { userId: req.params.id },
      { $set: req.body },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ message: 'Employee profile updated', employee });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add safety training
router.post('/employees/:id/training', ensureRole('manager', 'admin'), async (req, res) => {
  try {
    const { trainingName, completedDate, expiryDate, certificateUrl } = req.body;

    const employee = await Employee.findOne({ userId: req.params.id });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    employee.safetyTraining.push({
      trainingName,
      completedDate,
      expiryDate,
      certificateUrl
    });

    await employee.save();
    res.json({ message: 'Training added', employee });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Issue safety equipment
router.post('/employees/:id/equipment', ensureRole('manager', 'admin'), async (req, res) => {
  try {
    const { equipmentType, equipmentId, issuedDate } = req.body;

    const employee = await Employee.findOne({ userId: req.params.id });
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    employee.assignedEquipment.push({
      equipmentType,
      equipmentId,
      issuedDate,
      status: 'issued'
    });

    await employee.save();
    res.json({ message: 'Equipment issued', employee });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get team statistics
router.get('/team-stats', ensureRole('manager', 'admin'), async (req, res) => {
  try {
    const department = req.user.department;

    // Get all employees in the department
    const employees = await Employee.find(department ? { department } : {})
      .populate('userId', 'name email');

    const teamSize = employees.length;

    // Calculate total violations
    const totalViolations = employees.reduce((sum, emp) =>
      sum + (emp.violationStats?.totalViolations || 0), 0);

    // Calculate average safety score
    const avgSafetyScore = employees.length > 0
      ? employees.reduce((sum, emp) => sum + (emp.performanceRating?.safetyScore || 100), 0) / employees.length
      : 0;

    // Calculate pending violations
    const pendingViolations = employees.reduce((sum, emp) =>
      sum + (emp.violationStats?.pendingViolations || 0), 0);

    // Get violation trend for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const violationTrend = await Violation.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      teamSize,
      totalViolations,
      avgSafetyScore,
      pendingViolations,
      violationTrend: violationTrend.map(v => ({ date: v._id, count: v.count }))
    });
  } catch (err) {
    console.error('Team stats error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get team members
router.get('/team-members', ensureRole('manager', 'admin'), async (req, res) => {
  try {
    const department = req.user.department;

    const members = await Employee.find(department ? { department } : {})
      .populate('userId', 'name email')
      .sort({ 'performanceRating.safetyScore': -1 });

    res.json({ members });
  } catch (err) {
    console.error('Team members error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const Violation = require('../models/Violation');
const User = require('../models/User');
const { ensureRole } = require('../middleware/auth');

// Dashboard statistics
router.get('/dashboard', ensureRole('admin'), async (req, res) => {
  try {
    const totalViolations = await Violation.countDocuments();
    const totalEmployees = await User.countDocuments({ role: 'employee' });
    const pendingViolations = await Violation.countDocuments({ status: 'pending' });

    // Violations by type
    const violationsByType = await Violation.aggregate([
      {
        $group: {
          _id: '$violationType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Violations by severity
    const violationsBySeverity = await Violation.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent violations
    const recentViolations = await Violation.find()
      .sort({ createdAt: -1 })
      .limit(10);

    // Top violators
    const topViolators = await Violation.aggregate([
      {
        $group: {
          _id: '$employeeId',
          employeeName: { $first: '$employeeName' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Violations over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const violationsOverTime = await Violation.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
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
      stats: {
        totalViolations,
        totalEmployees,
        pendingViolations,
        resolvedViolations: await Violation.countDocuments({ status: 'resolved' })
      },
      violationsByType,
      violationsBySeverity,
      recentViolations,
      topViolators,
      violationsOverTime
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Heat map data
router.get('/heatmap', ensureRole('admin'), async (req, res) => {
  try {
    const violations = await Violation.find()
      .select('location violationType severity createdAt');

    const heatmapData = violations.map(v => ({
      lat: v.location.coordinates[1],
      lng: v.location.coordinates[0],
      intensity: v.severity === 'critical' ? 4 : v.severity === 'high' ? 3 : v.severity === 'medium' ? 2 : 1,
      type: v.violationType
    }));

    res.json({ heatmapData });
  } catch (err) {
    console.error('Heatmap data error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all users
router.get('/users', ensureRole('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user
router.put('/users/:id', ensureRole('admin'), async (req, res) => {
  try {
    const { isActive, role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive, role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated', user });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


const Employee = require('../models/Employee');

// Get all employee profiles with stats
router.get('/employees/profiles', ensureRole('admin'), async (req, res) => {
  try {
    const employees = await Employee.find()
      .populate('userId', 'name email phone')
      .sort({ 'violationStats.totalViolations': -1 });

    res.json({ employees });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get employee safety rankings
router.get('/employees/rankings', ensureRole('admin'), async (req, res) => {
  try {
    const employees = await Employee.find()
      .populate('userId', 'name email')
      .sort({ 'performanceRating.safetyScore': -1 });

    res.json({ employees });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Department-wise statistics
router.get('/departments/stats', ensureRole('admin'), async (req, res) => {
  try {
    const stats = await Employee.aggregate([
      {
        $group: {
          _id: '$department',
          employeeCount: { $sum: 1 },
          avgSafetyScore: { $avg: '$performanceRating.safetyScore' },
          totalViolations: { $sum: '$violationStats.totalViolations' }
        }
      },
      { $sort: { totalViolations: -1 } }
    ]);

    res.json({ departmentStats: stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Training compliance data
router.get('/training/compliance', ensureRole('admin'), async (req, res) => {
  try {
    const employees = await Employee.find()
      .populate('userId', 'name email')
      .select('safetyTraining department');

    let allTrainings = [];
    let total = 0;
    let expiringSoon = 0;
    let expired = 0;

    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    employees.forEach(emp => {
      if (emp.safetyTraining && emp.safetyTraining.length > 0) {
        emp.safetyTraining.forEach(training => {
          total++;
          const expiryDate = new Date(training.expiryDate);

          if (expiryDate < today) {
            expired++;
          } else if (expiryDate <= thirtyDaysFromNow) {
            expiringSoon++;
          }

          allTrainings.push({
            employeeName: emp.userId?.name || 'Unknown',
            department: emp.department,
            trainingName: training.trainingName,
            completedDate: training.completedDate,
            expiryDate: training.expiryDate,
            status: expiryDate < today ? 'expired' : expiryDate <= thirtyDaysFromNow ? 'expiring' : 'valid'
          });
        });
      }
    });

    const complianceRate = total > 0 ? ((total - expired) / total) * 100 : 0;

    res.json({
      stats: {
        total,
        expiringSoon,
        expired,
        complianceRate
      },
      trainings: allTrainings.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
    });
  } catch (err) {
    console.error('Training compliance error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Equipment tracking data
router.get('/equipment/tracking', ensureRole('admin'), async (req, res) => {
  try {
    const employees = await Employee.find()
      .populate('userId', 'name email')
      .select('assignedEquipment');

    let allEquipment = [];
    let total = 0;
    let issued = 0;
    let damaged = 0;
    let lost = 0;

    employees.forEach(emp => {
      if (emp.assignedEquipment && emp.assignedEquipment.length > 0) {
        emp.assignedEquipment.forEach(equipment => {
          total++;

          switch (equipment.status) {
            case 'issued':
              issued++;
              break;
            case 'damaged':
              damaged++;
              break;
            case 'lost':
              lost++;
              break;
          }

          allEquipment.push({
            employeeName: emp.userId?.name || 'Unknown',
            equipmentType: equipment.equipmentType,
            equipmentId: equipment.equipmentId,
            issuedDate: equipment.issuedDate,
            returnDate: equipment.returnDate,
            status: equipment.status
          });
        });
      }
    });

    res.json({
      stats: {
        total,
        issued,
        damaged,
        lost
      },
      equipment: allEquipment.sort((a, b) => new Date(b.issuedDate) - new Date(a.issuedDate))
    });
  } catch (err) {
    console.error('Equipment tracking error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
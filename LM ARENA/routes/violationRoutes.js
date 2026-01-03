const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Violation = require('../models/Violation');
const User = require('../models/User');
const Camera = require('../models/Camera');
const telegramService = require('../services/telegramService');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../public/uploads/violations');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'violation-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Helper function to determine severity based on violation type
function getSeverityForViolationType(violationType) {
  const severityMap = {
    'helmet': 'high',
    'safety_jacket': 'high',
    'goggles': 'medium',
    'gloves': 'medium',
    'boots': 'medium',
    'posture': 'low',
    'risky_area': 'critical',
    'other': 'medium'
  };
  return severityMap[violationType] || 'medium';
}

// @route   POST /api/violations/detect
// @desc    Receive violation from Python detection system
// @access  Public (protected by internal logic/API key if needed)
router.post('/detect', upload.single('image'), async (req, res) => {
  try {
    const { violationType, description, location, employeeId, cameraId, detectionArea } = req.body;

    // 1. Find or Create System User for recording
    const bcrypt = require('bcryptjs');
    let systemUser = await User.findOne({ email: 'system@safety.com' });
    if (!systemUser) {
      const hashedPassword = await bcrypt.hash('system_password_secure_123', 10);
      systemUser = await User.create({
        name: 'System AI',
        email: 'system@safety.com',
        password: hashedPassword,
        role: 'admin',
        employeeId: 'SYS001',
        phone: '+0000000000'
      });
    }

    // 2. Try to find employee if employeeId provided
    let employee = null;
    let employeeName = 'Unknown (Detected)';
    let employeeUserId = systemUser._id;

    if (employeeId) {
      employee = await User.findOne({ employeeId: employeeId });
      if (employee) {
        employeeUserId = employee._id;
        employeeName = employee.name;
      }
    }

    // 3. Determine severity based on violation type
    const severity = getSeverityForViolationType(violationType);

    // 4. Create Violation Record
    const newViolation = new Violation({
      employeeId: employeeUserId,
      employeeName: employeeName,
      violationType: violationType || 'other',
      location: {
        type: 'Point',
        coordinates: [0, 0], // Default or from camera metadata
        address: location || detectionArea || 'Unknown Area'
      },
      description: description || `Automated ${violationType} detection`,
      severity: severity,
      recordedBy: systemUser._id,
      recordedByName: systemUser.name,
      cameraId: cameraId || 'default',
      detectionArea: detectionArea || location || 'Unknown Area',
      imageUrl: req.file ? `/uploads/violations/${req.file.filename}` : '',
      status: 'pending'
    });

    await newViolation.save();

    // 5. Update employee stats if employee found
    if (employee) {
      try {
        const Employee = require('../models/Employee');
        const employeeProfile = await Employee.findOne({ userId: employee._id });
        if (employeeProfile) {
          await employeeProfile.updateViolationStats();
          employeeProfile.calculateSafetyScore();
          await employeeProfile.save();
        }
      } catch (statsErr) {
        console.error('Error updating employee stats:', statsErr);
      }
    }

    // 6. Send Telegram Alerts to Managers
    console.log('🔄 Attempting to send Telegram alerts...');
    const managers = await User.find({ role: 'manager', isActive: true });
    console.log(`👥 Found ${managers.length} active managers`);

    // Fetch camera details if cameraId is provided
    let cameraDetails = null;
    if (cameraId && cameraId !== 'default') {
      try {
        cameraDetails = await Camera.findOne({ cameraId: cameraId }).populate('blueprint');
      } catch (cameraErr) {
        console.error('❌ Error fetching camera details:', cameraErr.message);
      }
    }

    for (const manager of managers) {
      if (manager.telegramChatId) {
        try {
          console.log(`📨 Sending Telegram alert to ${manager.name} (Chat ID: ${manager.telegramChatId})...`);

          // Build camera info
          let cameraInfo = cameraId || 'Unknown Camera';
          if (cameraDetails) {
            cameraInfo = `${cameraDetails.cameraId} (Zone ${cameraDetails.zone}`;
            if (cameraDetails.linkedArea) {
              cameraInfo += ` - ${cameraDetails.linkedArea}`;
            }
            cameraInfo += ')';
          }

          const dashboardLink = `http://localhost:5000/manager-dashboard?highlight=${newViolation._id}`;

          // Send Telegram alert with photo
          await telegramService.sendViolationAlert(manager.telegramChatId, {
            violationType: violationType || 'other',
            employeeName: employeeName,
            severity: severity,
            location: detectionArea || location || 'Unknown Area',
            cameraInfo: cameraInfo,
            dashboardLink: dashboardLink,
            imageUrl: req.file ? `/uploads/violations/${req.file.filename}` : null
          });

          console.log(`✅ Telegram alert sent to ${manager.name}`);

          // Mark violation as alerted
          newViolation.alertSent = true;
          await newViolation.save();

        } catch (telegramError) {
          console.error(`❌ Failed to send Telegram alert to ${manager.name}:`, telegramError.message);
        }
      } else {
        console.log(`⚠️  Manager ${manager.name} has no Telegram Chat ID configured`);
      }
    }

    res.status(201).json({
      success: true,
      data: newViolation,
      message: 'Violation recorded and alerts sent (if configured)'
    });

  } catch (err) {
    console.error('Error recording violation:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server Error'
    });
  }
});

module.exports = router;

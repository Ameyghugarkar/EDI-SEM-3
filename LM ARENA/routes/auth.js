const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Employee = require('../models/Employee');

// Register - with validation
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('role').isIn(['employee', 'manager', 'admin']).withMessage('Invalid role'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, role, phone, department, employeeId, position, dateOfJoining } = req.body;

  try {
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    let user = await User.findOne({ email: normalizedEmail });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Check if employeeId already exists (for employees) - FIXED: Check Employee model
    if (role === 'employee' && employeeId) {
      const existingEmployee = await Employee.findOne({ employeeId });
      if (existingEmployee) {
        return res.status(400).json({ message: 'Employee ID already exists' });
      }
    }

    // Create user
    user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
      phone: phone.trim(),
      department: department ? department.trim() : undefined,
      employeeId: role === 'employee' ? employeeId : undefined
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // If employee, create employee profile
    if (role === 'employee') {
      const nameParts = name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];

      const employee = new Employee({
        userId: user._id,
        employeeId: employeeId || `EMP${Date.now()}`,
        firstName,
        lastName,
        department: department || 'General',
        position: position || 'Worker',
        dateOfJoining: dateOfJoining || Date.now()
      });

      await employee.save();
    }

    res.json({
      message: 'Registration successful! Please login.',
      userId: user._id,
      role: user.role
    });
  } catch (err) {
    console.error('Registration error:', err.message);
    // Handle duplicate key errors from database
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ message: `${field} already exists` });
    }
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', (req, res, next) => {
  const requestedRole = req.body.role; // Get the role from login form

  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: 'Server error' });
    }
    if (!user) {
      return res.status(400).json({ message: info.message });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact administrator.' });
    }

    // Role-based login validation
    if (requestedRole && user.role !== requestedRole) {
      const roleNames = {
        employee: 'Employee',
        manager: 'Manager',
        admin: 'Administrator'
      };
      return res.status(403).json({
        message: `You cannot login as ${roleNames[requestedRole] || requestedRole}. Your account is registered as ${roleNames[user.role] || user.role}.`
      });
    }

    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Server error' });
      }
      return res.json({
        message: 'Login successful',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone
        }
      });
    });
  })(req, res, next);
});

// Logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/current', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone
      }
    });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// Check if email exists
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    res.json({ exists: !!user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
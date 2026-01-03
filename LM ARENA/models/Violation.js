const mongoose = require('mongoose');

const ViolationSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  violationType: {
    type: String,
    enum: ['helmet', 'safety_jacket', 'gloves', 'boots', 'goggles', 'posture', 'risky_area', 'other'],
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: {
      type: String
    }
  },
  description: {
    type: String
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  alertSent: {
    type: Boolean,
    default: false
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recordedByName: {
    type: String,
    required: true
  },
  camera: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Camera'
  },
  cameraId: {
    type: String
  },
  blueprint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blueprint'
  },
  detectionArea: {
    type: String
  },
  imageUrl: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'acknowledged', 'resolved', 'false_positive'],
    default: 'pending'
  },
  acknowledgedAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
  },
  lastReminderSentAt: {
    type: Date
  },
  reminderCount: {
    type: Number,
    default: 0
  },
  maxReminders: {
    type: Number,
    default: 6 // Stop after 6 reminders (1 hour at 10-minute intervals)
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create geospatial index
ViolationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Violation', ViolationSchema);
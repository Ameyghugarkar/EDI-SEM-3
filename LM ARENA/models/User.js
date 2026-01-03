const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['employee', 'manager', 'admin'],
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  telegramChatId: {
    type: String,
    required: false
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  department: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
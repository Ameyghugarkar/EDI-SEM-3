const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  position: {
    type: String,
    required: true
  },
  dateOfJoining: {
    type: Date,
    required: true
  },
  dateOfBirth: {
    type: Date
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  safetyTraining: [{
    trainingName: String,
    completedDate: Date,
    expiryDate: Date,
    certificateUrl: String
  }],
  assignedEquipment: [{
    equipmentType: String,
    equipmentId: String,
    issuedDate: Date,
    returnDate: Date,
    status: {
      type: String,
      enum: ['issued', 'returned', 'damaged', 'lost'],
      default: 'issued'
    }
  }],
  violationStats: {
    totalViolations: {
      type: Number,
      default: 0
    },
    pendingViolations: {
      type: Number,
      default: 0
    },
    resolvedViolations: {
      type: Number,
      default: 0
    },
    lastViolationDate: Date
  },
  performanceRating: {
    safetyScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    lastUpdated: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
EmployeeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for full name
EmployeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to update violation stats
EmployeeSchema.methods.updateViolationStats = async function() {
  const Violation = mongoose.model('Violation');
  
  const stats = await Violation.aggregate([
    { $match: { employeeId: this.userId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  this.violationStats.totalViolations = stats.reduce((sum, s) => sum + s.count, 0);
  this.violationStats.pendingViolations = stats.find(s => s._id === 'pending')?.count || 0;
  this.violationStats.resolvedViolations = stats.find(s => s._id === 'resolved')?.count || 0;

  // Get last violation date
  const lastViolation = await Violation.findOne({ employeeId: this.userId })
    .sort({ createdAt: -1 })
    .limit(1);
  
  if (lastViolation) {
    this.violationStats.lastViolationDate = lastViolation.createdAt;
  }

  await this.save();
};

// Method to calculate safety score
EmployeeSchema.methods.calculateSafetyScore = function() {
  const totalViolations = this.violationStats.totalViolations;
  const pendingViolations = this.violationStats.pendingViolations;
  
  // Base score is 100
  let score = 100;
  
  // Deduct points for violations
  score -= totalViolations * 2; // 2 points per violation
  score -= pendingViolations * 5; // Extra 5 points for pending violations
  
  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));
  
  this.performanceRating.safetyScore = score;
  this.performanceRating.lastUpdated = Date.now();
  
  return score;
};

module.exports = mongoose.model('Employee', EmployeeSchema);
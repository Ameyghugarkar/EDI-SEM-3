const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Employee = require('../models/Employee');

mongoose.connect('mongodb://localhost:27017/safety-monitoring', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createDemoData() {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Employee.deleteMany({});

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password', salt);

    // Create Admin
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@demo.com',
      password: hashedPassword,
      role: 'admin',
      phone: '+1234567890'
    });

    // Create Manager
    const manager = await User.create({
      name: 'Manager User',
      email: 'manager@demo.com',
      password: hashedPassword,
      role: 'manager',
      phone: '+1234567891'
    });

    // Create Employees
    const employee1User = await User.create({
      name: 'John Doe',
      email: 'employee@demo.com',
      password: hashedPassword,
      role: 'employee',
      phone: '+1234567892',
      employeeId: 'EMP001'
    });

    const employee2User = await User.create({
      name: 'Jane Smith',
      email: 'jane@demo.com',
      password: hashedPassword,
      role: 'employee',
      phone: '+1234567893',
      employeeId: 'EMP002'
    });

    // Create Employee Profiles
    await Employee.create({
      userId: employee1User._id,
      employeeId: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      department: 'Manufacturing',
      position: 'Machine Operator',
      dateOfJoining: new Date('2023-01-15'),
      dateOfBirth: new Date('1990-05-20'),
      address: {
        street: '123 Main St',
        city: 'Mumbai',
        state: 'Maharashtra',
        zipCode: '400001',
        country: 'India'
      },
      emergencyContact: {
        name: 'Mary Doe',
        relationship: 'Spouse',
        phone: '+1234567899'
      },
      safetyTraining: [
        {
          trainingName: 'Basic Safety Training',
          completedDate: new Date('2023-02-01'),
          expiryDate: new Date('2024-02-01')
        }
      ]
    });

    await Employee.create({
      userId: employee2User._id,
      employeeId: 'EMP002',
      firstName: 'Jane',
      lastName: 'Smith',
      department: 'Construction',
      position: 'Site Engineer',
      dateOfJoining: new Date('2023-03-10'),
      dateOfBirth: new Date('1992-08-15'),
      address: {
        street: '456 Park Ave',
        city: 'Delhi',
        state: 'Delhi',
        zipCode: '110001',
        country: 'India'
      },
      emergencyContact: {
        name: 'Robert Smith',
        relationship: 'Father',
        phone: '+1234567898'
      },
      safetyTraining: [
        {
          trainingName: 'Advanced Safety Training',
          completedDate: new Date('2023-04-01'),
          expiryDate: new Date('2024-04-01')
        }
      ]
    });

    console.log('✅ Demo users and employee profiles created successfully!');
    console.log('\nLogin Credentials:');
    console.log('Admin: admin@demo.com / password');
    console.log('Manager: manager@demo.com / password');
    console.log('Employee 1: employee@demo.com / password');
    console.log('Employee 2: jane@demo.com / password');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createDemoData();
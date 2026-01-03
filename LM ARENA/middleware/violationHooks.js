const Employee = require('../models/Employee');

// Middleware to update employee stats after violation is created
async function updateEmployeeStatsOnViolation(violation) {
  try {
    const employee = await Employee.findOne({ userId: violation.employeeId });
    if (!employee) {
      console.warn(`Employee profile not found for userId: ${violation.employeeId}`);
      return { success: false, message: 'Employee profile not found' };
    }

    await employee.updateViolationStats();
    employee.calculateSafetyScore();
    await employee.save();

    console.log(`Updated stats for employee: ${employee.employeeId}`);
    return { success: true, message: 'Employee stats updated' };
  } catch (error) {
    console.error('Error updating employee stats:', error.message);
    return { success: false, message: error.message };
  }
}

module.exports = { updateEmployeeStatsOnViolation };
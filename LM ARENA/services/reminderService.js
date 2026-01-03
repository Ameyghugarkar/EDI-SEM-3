/**
 * Violation Reminder Service
 * Automatically sends SMS reminders for unresolved violations every 10 minutes
 */

const Violation = require('../models/Violation');
const User = require('../models/User');
const twilio = require('twilio');

// Twilio Configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
let client;

if (accountSid && authToken && accountSid !== 'your_twilio_account_sid') {
    client = new twilio(accountSid, authToken);
    console.log('✅ Reminder Service: Twilio client initialized');
} else {
    console.log('⚠️  Reminder Service: Twilio not configured, reminders will be logged only');
}

// Reminder interval: 10 minutes
const REMINDER_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes in milliseconds
const CHECK_INTERVAL_MS = 1 * 60 * 1000; // Check every 1 minute

let reminderInterval = null;

/**
 * Check for violations that need reminders and send SMS
 */
async function checkAndSendReminders() {
    try {
        const now = new Date();
        const tenMinutesAgo = new Date(now.getTime() - REMINDER_INTERVAL_MS);

        // Find unresolved violations that need reminders
        const violations = await Violation.find({
            status: { $in: ['pending', 'acknowledged'] }, // Only unresolved violations
            $or: [
                { lastReminderSentAt: { $exists: false } }, // Never sent reminder
                { lastReminderSentAt: { $lte: tenMinutesAgo } } // Last reminder was 10+ minutes ago
            ],
            $expr: { $lt: ['$reminderCount', '$maxReminders'] } // Haven't reached max reminders
        }).sort({ createdAt: 1 }); // Oldest first

        if (violations.length === 0) {
            console.log('🔍 Reminder Check: No violations need reminders');
            return;
        }

        console.log(`📨 Reminder Check: Found ${violations.length} violation(s) needing reminders`);

        // Get active managers
        const managers = await User.find({ role: 'manager', isActive: true });

        if (managers.length === 0) {
            console.log('⚠️  No active managers found for reminders');
            return;
        }

        // Send reminders for each violation
        for (const violation of violations) {
            await sendReminderForViolation(violation, managers);
        }

    } catch (error) {
        console.error('❌ Reminder Service Error:', error.message);
    }
}

/**
 * Send reminder SMS for a specific violation
 */
async function sendReminderForViolation(violation, managers) {
    try {
        const violationTypeDisplay = violation.violationType.replace('_', ' ').toUpperCase();
        const timeSinceCreation = getTimeSinceCreation(violation.createdAt);
        const reminderNumber = violation.reminderCount + 1;

        console.log(`📨 Sending reminder #${reminderNumber} for violation ${violation._id}`);

        for (const manager of managers) {
            if (!manager.phone) {
                console.log(`⚠️  Manager ${manager.name} has no phone number`);
                continue;
            }

            try {
                const messageBody = `🔔 REMINDER #${reminderNumber} - UNRESOLVED VIOLATION\n` +
                    `Type: ${violationTypeDisplay}\n` +
                    `Employee: ${violation.employeeName}\n` +
                    `Location: ${violation.detectionArea || 'Unknown'}\n` +
                    `Severity: ${violation.severity.toUpperCase()}\n` +
                    `Time Since Detection: ${timeSinceCreation}\n` +
                    `Status: ${violation.status.toUpperCase()}\n` +
                    `${violation.imageUrl ? 'Image: http://localhost:5000' + violation.imageUrl + '\n' : ''}` +
                    `Dashboard: http://localhost:5000/manager/dashboard`;

                if (client) {
                    await client.messages.create({
                        body: messageBody,
                        from: twilioPhoneNumber,
                        to: manager.phone
                    });
                    console.log(`✅ Reminder sent to ${manager.name} (${manager.phone})`);
                } else {
                    console.log(`📝 [SIMULATED] Reminder to ${manager.name}:\n${messageBody}`);
                }

            } catch (smsError) {
                console.error(`❌ Failed to send reminder to ${manager.name}:`, smsError.message);
                if (smsError.code) console.error(`   Twilio Error Code: ${smsError.code}`);
            }
        }

        // Update violation reminder tracking
        violation.lastReminderSentAt = new Date();
        violation.reminderCount += 1;
        await violation.save();

        console.log(`✅ Updated violation ${violation._id}: reminderCount = ${violation.reminderCount}`);

    } catch (error) {
        console.error(`❌ Error sending reminder for violation ${violation._id}:`, error.message);
    }
}

/**
 * Calculate human-readable time since violation creation
 */
function getTimeSinceCreation(createdAt) {
    const now = new Date();
    const diffMs = now - createdAt;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
    }

    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;

    if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ${remainingMins} min`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
}

/**
 * Start the reminder service
 */
function startReminderService() {
    if (reminderInterval) {
        console.log('⚠️  Reminder Service already running');
        return;
    }

    console.log('🚀 Starting Violation Reminder Service');
    console.log(`   Check Interval: Every ${CHECK_INTERVAL_MS / 60000} minute(s)`);
    console.log(`   Reminder Interval: Every ${REMINDER_INTERVAL_MS / 60000} minutes`);
    console.log(`   Max Reminders: 6 (configurable per violation)`);

    // Run immediately on startup
    checkAndSendReminders();

    // Then run at regular intervals
    reminderInterval = setInterval(checkAndSendReminders, CHECK_INTERVAL_MS);

    console.log('✅ Reminder Service started successfully');
}

/**
 * Stop the reminder service
 */
function stopReminderService() {
    if (reminderInterval) {
        clearInterval(reminderInterval);
        reminderInterval = null;
        console.log('🛑 Reminder Service stopped');
    }
}

module.exports = {
    startReminderService,
    stopReminderService,
    checkAndSendReminders // Export for manual testing
};

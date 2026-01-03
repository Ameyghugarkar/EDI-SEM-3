require('dotenv').config();
const telegramService = require('../services/telegramService');
const mongoose = require('mongoose');
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/safety-monitoring')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

async function testTelegramAlert() {
    try {
        console.log('\n🧪 TELEGRAM ALERT TEST');
        console.log('='.repeat(50));

        // Find a manager with Telegram Chat ID
        const manager = await User.findOne({
            role: 'manager',
            isActive: true,
            telegramChatId: { $exists: true, $ne: null, $ne: '' }
        });

        if (!manager) {
            console.log('❌ No manager found with Telegram Chat ID!');
            console.log('\n💡 Steps to fix:');
            console.log('   1. Run: node scripts/get_telegram_chat_id.js');
            console.log('   2. Send a message to your bot');
            console.log('   3. Run: node scripts/update_manager_telegram.js');
            process.exit(1);
        }

        console.log(`\n✅ Found manager: ${manager.name}`);
        console.log(`   Chat ID: ${manager.telegramChatId}`);

        console.log('\n📨 Sending test violation alert...\n');

        // Send test alert
        await telegramService.sendViolationAlert(manager.telegramChatId, {
            violationType: 'helmet',
            employeeName: 'Test Employee',
            severity: 'high',
            location: 'Test Area - Zone A',
            cameraInfo: 'CAM-001 (Zone A - Main Entrance)',
            dashboardLink: 'http://localhost:5000/manager-dashboard',
            imageUrl: null // No image for test
        });

        console.log('✅ Test alert sent successfully!');
        console.log('\n📱 Check your Telegram to see the message.');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testTelegramAlert();

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/safety-monitoring')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

async function updateManagerTelegramId() {
    try {
        console.log('\n📝 UPDATE MANAGER TELEGRAM CHAT ID');
        console.log('='.repeat(50));

        // Find all managers
        const managers = await User.find({ role: 'manager' });

        if (managers.length === 0) {
            console.log('❌ No managers found in database!');
            console.log('\n💡 Create a manager first using: node scripts/createManager.js');
            process.exit(1);
        }

        console.log(`\n✅ Found ${managers.length} manager(s):\n`);
        managers.forEach((m, index) => {
            console.log(`${index + 1}. ${m.name} (${m.email})`);
            console.log(`   Current Chat ID: ${m.telegramChatId || 'Not set'}`);
            console.log('');
        });

        // For now, update the first manager
        // You can modify this to prompt for which manager to update
        const manager = managers[0];

        // IMPORTANT: Replace this with the actual Chat ID you got from running get_telegram_chat_id.js
        const newChatId = process.env.TELEGRAM_MANAGER_CHAT_ID || 'YOUR_CHAT_ID_HERE';

        if (newChatId === 'YOUR_CHAT_ID_HERE' || !newChatId) {
            console.log('⚠️  Please run the following steps:');
            console.log('   1. Run: node scripts/get_telegram_chat_id.js');
            console.log('   2. Open your Telegram bot and send a message');
            console.log('   3. Copy the Chat ID displayed');
            console.log('   4. Add it to .env as TELEGRAM_MANAGER_CHAT_ID=your_chat_id');
            console.log('   5. Run this script again');
            process.exit(1);
        }

        console.log(`\n🔄 Updating ${manager.name}'s Telegram Chat ID to: ${newChatId}`);

        manager.telegramChatId = newChatId;
        await manager.save();

        console.log('✅ Successfully updated!');
        console.log(`\n📊 Manager Details:`);
        console.log(`   Name: ${manager.name}`);
        console.log(`   Email: ${manager.email}`);
        console.log(`   Telegram Chat ID: ${manager.telegramChatId}`);

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

updateManagerTelegramId();

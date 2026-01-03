require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const twilio = require('twilio');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/safety-monitoring')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

async function checkStatus() {
    try {
        console.log('\n📋 TWILIO CONFIGURATION CHECK');
        console.log('='.repeat(50));

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromPhone = process.env.TWILIO_PHONE_NUMBER;

        console.log(`\n🔑 Credentials:`);
        console.log(`   Account SID: ${accountSid}`);
        console.log(`   Auth Token: ${authToken ? authToken.substring(0, 8) + '...' : 'Missing'}`);
        console.log(`   From Phone: ${fromPhone}`);

        if (!accountSid || !authToken || !fromPhone) {
            console.error('\n❌ Missing Twilio credentials in .env');
            process.exit(1);
        }

        console.log('\n📱 MANAGER INFORMATION');
        console.log('='.repeat(50));

        const manager = await User.findOne({ role: 'manager', isActive: true });

        if (!manager) {
            console.error('❌ No active manager found in database!');
            console.log('\n💡 Run: node scripts/createManager.js');
            process.exit(1);
        }

        console.log(`   Name: ${manager.name}`);
        console.log(`   Email: ${manager.email}`);
        console.log(`   Phone: ${manager.phone}`);
        console.log(`   Active: ${manager.isActive}`);

        if (!manager.phone) {
            console.error('\n❌ Manager has no phone number!');
            process.exit(1);
        }

        console.log('\n📨 ATTEMPTING TO SEND TEST SMS');
        console.log('='.repeat(50));

        const client = new twilio(accountSid, authToken);

        console.log(`   From: ${fromPhone}`);
        console.log(`   To: ${manager.phone}`);
        console.log(`   Message: Test SMS from Safety System`);
        console.log('\n⏳ Sending...\n');

        const message = await client.messages.create({
            body: '🔔 TEST: Safety System SMS is working! You will receive violation alerts on this number.',
            from: fromPhone,
            to: manager.phone
        });

        console.log('✅ SMS SENT SUCCESSFULLY!');
        console.log(`   Message SID: ${message.sid}`);
        console.log(`   Status: ${message.status}`);
        console.log(`   To: ${message.to}`);
        console.log(`   From: ${message.from}`);

        console.log('\n✅ All checks passed! SMS alerts are configured correctly.');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERROR OCCURRED');
        console.error('='.repeat(50));
        console.error(`   Error Code: ${error.code}`);
        console.error(`   Message: ${error.message}`);

        if (error.code === 21608) {
            console.log('\n⚠️  TRIAL ACCOUNT LIMITATION');
            console.log('='.repeat(50));
            console.log('   Your Twilio account is in trial mode.');
            console.log('   You can only send SMS to VERIFIED phone numbers.');
            console.log('\n📝 TO FIX THIS:');
            console.log('   1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
            console.log('   2. Click "Add a new number"');
            console.log('   3. Verify the manager\'s phone number: ' + (await User.findOne({ role: 'manager' })).phone);
            console.log('   4. Run this script again');
            console.log('\n   OR upgrade your Twilio account to send to any number.');
        } else if (error.code === 21211) {
            console.log('\n⚠️  INVALID PHONE NUMBER');
            console.log('='.repeat(50));
            console.log('   The phone number format is invalid.');
            console.log('   Make sure it includes country code (e.g., +919975689622)');
        } else if (error.code === 20003) {
            console.log('\n⚠️  AUTHENTICATION FAILED');
            console.log('='.repeat(50));
            console.log('   Your Twilio credentials are incorrect.');
            console.log('   Please check your Account SID and Auth Token.');
        }

        process.exit(1);
    }
}

checkStatus();

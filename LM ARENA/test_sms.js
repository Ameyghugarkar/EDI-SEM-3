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

async function testSMS() {
    try {
        console.log('\n🔍 Checking Twilio Configuration...');
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromPhone = process.env.TWILIO_PHONE_NUMBER;

        console.log(`   SID: ${accountSid ? 'Set' : 'Missing'}`);
        console.log(`   Token: ${authToken ? 'Set' : 'Missing'}`);
        console.log(`   From: ${fromPhone ? 'Set' : 'Missing'}`);

        if (!accountSid || !authToken || !fromPhone) {
            console.error('❌ Missing Twilio credentials in .env');
            process.exit(1);
        }

        const client = new twilio(accountSid, authToken);

        console.log('\n🔍 Checking Manager Account...');
        const manager = await User.findOne({ role: 'manager', isActive: true });

        if (!manager) {
            console.error('❌ No active manager found in database!');
            process.exit(1);
        }

        console.log(`   Found Manager: ${manager.name}`);
        console.log(`   Phone: ${manager.phone}`);

        if (!manager.phone) {
            console.error('❌ Manager has no phone number!');
            process.exit(1);
        }

        console.log('\n📨 Sending Test SMS...');
        const message = await client.messages.create({
            body: '🔔 This is a TEST SMS from your Safety System. If you see this, alerts are working!',
            from: fromPhone,
            to: manager.phone
        });

        console.log(`✅ SMS Sent Successfully! SID: ${message.sid}`);
        process.exit(0);

    } catch (error) {
        console.error('\n❌ SMS Failed:');
        console.error(`   Error Code: ${error.code}`);
        console.error(`   Message: ${error.message}`);

        if (error.code === 21608) {
            console.log('\n💡 Tip: This is a Trial Account. You can only send to verified numbers.');
            console.log('   Verify the number here: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
        }

        process.exit(1);
    }
}

testSMS();

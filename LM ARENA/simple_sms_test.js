require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const User = require('./models/User');
const twilio = require('twilio');

const logFile = 'sms_test_log.txt';
let logContent = '';

function log(message) {
    console.log(message);
    logContent += message + '\n';
}

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/safety-monitoring')
    .then(() => log('✅ MongoDB Connected'))
    .catch(err => {
        log('❌ MongoDB connection error: ' + err);
        process.exit(1);
    });

async function testSMS() {
    try {
        log('\n=== TWILIO SMS TEST ===\n');

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromPhone = process.env.TWILIO_PHONE_NUMBER;

        log('Credentials:');
        log('  SID: ' + accountSid);
        log('  Token: ' + (authToken ? 'Set (hidden)' : 'Missing'));
        log('  From: ' + fromPhone);

        const manager = await User.findOne({ role: 'manager', isActive: true });

        if (!manager) {
            log('\n❌ No manager found!');
            fs.writeFileSync(logFile, logContent);
            process.exit(1);
        }

        log('\nManager:');
        log('  Name: ' + manager.name);
        log('  Phone: ' + manager.phone);

        log('\nSending SMS...');

        const client = new twilio(accountSid, authToken);

        const message = await client.messages.create({
            body: 'TEST: Safety System SMS Alert is working!',
            from: fromPhone,
            to: manager.phone
        });

        log('\n✅ SUCCESS!');
        log('  Message SID: ' + message.sid);
        log('  Status: ' + message.status);
        log('  To: ' + message.to);

        fs.writeFileSync(logFile, logContent);
        process.exit(0);

    } catch (error) {
        log('\n❌ FAILED!');
        log('  Error Code: ' + error.code);
        log('  Error Message: ' + error.message);

        if (error.code === 21608) {
            log('\n⚠️  TRIAL ACCOUNT - Number not verified!');
            log('  Verify at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified');
        }

        fs.writeFileSync(logFile, logContent);
        process.exit(1);
    }
}

testSMS();

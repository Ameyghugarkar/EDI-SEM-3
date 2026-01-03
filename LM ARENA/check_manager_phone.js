
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/safety-monitoring')
    .then(async () => {
        console.log('\n🔍 MANAGER PHONE NUMBER CHECK');
        console.log('===============================');

        const managers = await User.find({ role: 'manager' });

        if (managers.length === 0) {
            console.log('❌ No managers found in database!');
        } else {
            console.log(`✅ Found ${managers.length} manager(s):`);
            managers.forEach(m => {
                console.log(`   - Name: ${m.name}`);
                console.log(`   - Phone: ${m.phone || '❌ NO PHONE NUMBER'}`);
                console.log(`   - Active: ${m.isActive}`);
                console.log('-------------------');
            });
        }
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

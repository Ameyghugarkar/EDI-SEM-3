require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/safety-monitoring')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

async function fixPhone() {
    try {
        const managers = await User.find({ role: 'manager' });
        console.log(`Found ${managers.length} managers.`);

        for (const manager of managers) {
            console.log(`Updating ${manager.name} (${manager.email})...`);
            manager.phone = '+919975689622';
            await manager.save();
            console.log('✅ Phone updated to +919975689622');
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

fixPhone();

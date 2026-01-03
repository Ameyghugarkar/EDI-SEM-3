/**
 * Create Manager Account for SMS Alerts
 * Run this script to add a manager who will receive SMS alerts
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/safety-monitoring')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// User Schema (simplified)
const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: String,
    phone: String,
    employeeId: String,
    department: String,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

async function createManager() {
    try {
        // Check if manager already exists
        const existingManager = await User.findOne({ phone: '+919975689622' });

        if (existingManager) {
            console.log('⚠️  Manager with this phone number already exists!');
            console.log('Updating phone number...');
            existingManager.phone = '+919975689622';
            existingManager.isActive = true;
            await existingManager.save();
            console.log('✅ Manager phone number updated!');
        } else {
            // Create new manager
            const hashedPassword = await bcrypt.hash('manager123', 10);

            const manager = new User({
                name: 'Safety Manager',
                email: 'manager@safety.com',
                password: hashedPassword,
                role: 'manager',
                phone: '+919975689622',  // Your phone number
                employeeId: 'MGR001',
                department: 'Safety',
                isActive: true
            });

            await manager.save();
            console.log('✅ Manager account created successfully!');
        }

        console.log('\n📱 SMS alerts will be sent to: +919975689622');
        console.log('📧 Login email: manager@safety.com');
        console.log('🔑 Password: manager123');
        console.log('\n✅ Ready to receive SMS alerts!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating manager:', error);
        process.exit(1);
    }
}

createManager();

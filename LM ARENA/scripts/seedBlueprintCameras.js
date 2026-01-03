/**
 * Seed Cameras based on Factory Blueprint
 * Run this script to populate the database with cameras mapped to the blueprint
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Blueprint = require('../models/Blueprint');
const Camera = require('../models/Camera');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/safety-monitoring')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

async function seedCameras() {
    try {
        // 1. Find a User for createdBy
        const User = require('../models/User');
        const adminUser = await User.findOne({ role: 'admin' }) || await User.findOne({ role: 'manager' });

        if (!adminUser) {
            console.error('❌ No admin or manager user found. Please run createManager.js first.');
            process.exit(1);
        }

        // 2. Find or Create Main Blueprint
        let blueprint = await Blueprint.findOne({ name: 'Factory Floor Plan' });

        if (!blueprint) {
            console.log('Creating Main Blueprint...');
            blueprint = await Blueprint.create({
                name: 'Factory Floor Plan',
                description: 'Main factory floor layout with machine zones and hazardous areas',
                dimensions: { width: 1200, height: 800 },
                imageUrl: '/uploads/blueprints/factory_layout.jpg', // Placeholder
                createdBy: adminUser._id
            });
        }

        // 2. Define Cameras based on Blueprint Zones
        const cameras = [
            {
                cameraId: 'CAM-MZ-01',
                zone: 'Machine Zone',
                linkedArea: 'Main Assembly Line',
                position: { x: 300, y: 400 },
                viewAngle: 90,
                status: 'online'
            },
            {
                cameraId: 'CAM-HA-01',
                zone: 'Hazardous Area',
                linkedArea: 'Chemical Storage',
                position: { x: 1000, y: 150 },
                viewAngle: 120,
                status: 'online'
            },
            {
                cameraId: 'CAM-WZ-01',
                zone: 'Hazardous Area',
                linkedArea: 'Welding Zone',
                position: { x: 1000, y: 650 },
                viewAngle: 120,
                status: 'online'
            },
            {
                cameraId: 'CAM-CB-01',
                zone: 'Conveyor Belt',
                linkedArea: 'Packaging Line',
                position: { x: 600, y: 150 },
                viewAngle: 180,
                status: 'online'
            },
            {
                cameraId: 'CAM-LD-01',
                zone: 'Loading Dock',
                linkedArea: 'Shipping Bay',
                position: { x: 600, y: 750 },
                viewAngle: 180,
                status: 'online'
            }
        ];

        // 3. Upsert Cameras
        for (const camData of cameras) {
            const existingCam = await Camera.findOne({ cameraId: camData.cameraId });

            if (existingCam) {
                console.log(`Updating camera ${camData.cameraId}...`);
                Object.assign(existingCam, camData);
                existingCam.blueprint = blueprint._id;
                await existingCam.save();
            } else {
                console.log(`Creating camera ${camData.cameraId}...`);
                await Camera.create({
                    ...camData,
                    blueprint: blueprint._id
                });
            }
        }

        console.log('✅ All cameras seeded successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding cameras:', error);
        process.exit(1);
    }
}

seedCameras();

const mongoose = require('mongoose');
const Blueprint = require('./models/Blueprint');
const Camera = require('./models/Camera');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/safety-watch', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log(err));

const seedBlueprints = async () => {
  try {
    // Get an admin user to assign as creator
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('No admin user found. Please create an admin user first.');
      process.exit(1);
    }

    // Clear existing blueprints and cameras
    await Blueprint.deleteMany({});
    await Camera.deleteMany({});
    console.log('Cleared existing blueprints and cameras');

    const blueprintsData = [
      {
        name: "Factory Floor Plan - Industrial Complex",
        description: "Main production floor with machine zones, conveyor belts, and hazardous areas.",
        imageUrl: "/blueprints/factory-floor.jpg",
        dimensions: { width: 1200, height: 800 }, // Estimated from image aspect ratio
        areas: [
          // Hazardous Areas (Red Zones)
          { name: "Chemical Storage", type: "Dangerous Zone", coordinates: [{x: 900, y: 50}, {x: 1150, y: 50}, {x: 1150, y: 250}, {x: 900, y: 250}], color: "#ef4444", riskLevel: "critical" },
          { name: "Welding Zone", type: "Dangerous Zone", coordinates: [{x: 600, y: 600}, {x: 850, y: 600}, {x: 850, y: 750}, {x: 600, y: 750}], color: "#ef4444", riskLevel: "high" },
          { name: "Hazardous Area 2", type: "Dangerous Zone", coordinates: [{x: 900, y: 500}, {x: 1150, y: 500}, {x: 1150, y: 750}, {x: 900, y: 750}], color: "#ef4444", riskLevel: "high" },
          
          // Machine Zones
          { name: "Machine Zone A", type: "Machinery Zone", coordinates: [{x: 50, y: 50}, {x: 350, y: 50}, {x: 350, y: 350}, {x: 50, y: 350}], color: "#f59e0b" },
          { name: "Machine Zone B", type: "Machinery Zone", coordinates: [{x: 250, y: 400}, {x: 500, y: 400}, {x: 500, y: 600}, {x: 250, y: 600}], color: "#f59e0b" },
          
          // Conveyor Belts
          { name: "Conveyor Belt System", type: "Machinery Zone", coordinates: [{x: 400, y: 50}, {x: 650, y: 50}, {x: 650, y: 300}, {x: 400, y: 300}], color: "#3b82f6" },
          
          // Control Rooms
          { name: "Control Room", type: "Office Area", coordinates: [{x: 500, y: 400}, {x: 650, y: 400}, {x: 650, y: 550}, {x: 500, y: 550}], color: "#10b981" },
          
          // Loading Docks
          { name: "Loading Docks", type: "Loading Dock", coordinates: [{x: 200, y: 700}, {x: 500, y: 700}, {x: 500, y: 800}, {x: 200, y: 800}], color: "#6366f1" }
        ],
        cameras: [
          // Cameras monitoring Hazardous Areas
          { cameraId: "CAM-HA01", position: {x: 1025, y: 150}, linkedArea: "Chemical Storage", zone: "C1", status: "online" },
          { cameraId: "CAM-HA02", position: {x: 725, y: 675}, linkedArea: "Welding Zone", zone: "B3", status: "online" },
          { cameraId: "CAM-HA03", position: {x: 1025, y: 625}, linkedArea: "Hazardous Area 2", zone: "C3", status: "online" },
          
          // Cameras monitoring Machine Zones
          { cameraId: "CAM-MZ01", position: {x: 200, y: 200}, linkedArea: "Machine Zone A", zone: "A1", status: "online" },
          { cameraId: "CAM-MZ02", position: {x: 375, y: 500}, linkedArea: "Machine Zone B", zone: "A2", status: "online" },
          
          // Cameras monitoring Conveyor
          { cameraId: "CAM-CB01", position: {x: 525, y: 175}, linkedArea: "Conveyor Belt System", zone: "B1", status: "online" },
          
          // Cameras monitoring Control Room
          { cameraId: "CAM-CR01", position: {x: 575, y: 475}, linkedArea: "Control Room", zone: "B2", status: "online" },
          
          // Cameras monitoring Loading Docks
          { cameraId: "CAM-LD01", position: {x: 350, y: 750}, linkedArea: "Loading Docks", zone: "A3", status: "online" }
        ]
      }
    ];

    for (const bpData of blueprintsData) {
      const blueprint = new Blueprint({
        name: bpData.name,
        description: bpData.description,
        imageUrl: bpData.imageUrl,
        dimensions: bpData.dimensions,
        areas: bpData.areas,
        createdBy: admin._id
      });

      await blueprint.save();
      console.log(`Created blueprint: ${blueprint.name}`);

      for (const camData of bpData.cameras) {
        const camera = new Camera({
          cameraId: camData.cameraId,
          blueprint: blueprint._id,
          position: camData.position,
          linkedArea: camData.linkedArea,
          zone: camData.zone,
          status: camData.status,
          viewAngle: 90,
          viewDirection: 0
        });
        
        // Calculate coverage
        camera.coverage = camera.calculateCoverage(blueprint.dimensions);
        
        await camera.save();
        console.log(`  - Added camera: ${camera.cameraId}`);
      }
    }

    console.log('Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedBlueprints();

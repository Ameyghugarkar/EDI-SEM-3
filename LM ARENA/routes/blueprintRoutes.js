const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Blueprint = require('../models/Blueprint');
const Camera = require('../models/Camera');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');

// Middleware for admin-only routes
const adminOnly = ensureRole('admin');

// Configure multer for blueprint image uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../public/uploads/blueprints');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'blueprint-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only images (JPEG, PNG) and PDF files are allowed'));
        }
    }
});

// @route   POST /api/blueprints/upload
// @desc    Upload blueprint image
// @access  Admin
router.post('/upload', ensureAuthenticated, adminOnly, upload.single('blueprint'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const imageUrl = `/uploads/blueprints/${req.file.filename}`;

        res.json({
            success: true,
            imageUrl,
            filename: req.file.filename,
            size: req.file.size
        });
    } catch (error) {
        console.error('Blueprint upload error:', error);
        res.status(500).json({ message: 'Error uploading blueprint', error: error.message });
    }
});

// @route   POST /api/blueprints
// @desc    Create new blueprint
// @access  Admin
router.post('/', ensureAuthenticated, adminOnly, async (req, res) => {
    try {
        const {
            name,
            description,
            imageUrl,
            imageData,
            dimensions,
            areas,
            gridZones
        } = req.body;

        const blueprint = new Blueprint({
            name,
            description,
            imageUrl,
            imageData,
            dimensions,
            areas: areas || [],
            gridZones: gridZones || { rows: 5, cols: 5 },
            createdBy: req.user._id
        });

        await blueprint.save();

        res.status(201).json({
            success: true,
            blueprint
        });
    } catch (error) {
        console.error('Create blueprint error:', error);
        res.status(500).json({ message: 'Error creating blueprint', error: error.message });
    }
});

// @route   GET /api/blueprints
// @desc    Get all blueprints
// @access  Admin
router.get('/', ensureAuthenticated, adminOnly, async (req, res) => {
    try {
        const blueprints = await Blueprint.find({ isActive: true })
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        // Get camera count for each blueprint
        const blueprintsWithCameras = await Promise.all(
            blueprints.map(async (blueprint) => {
                const cameraCount = await Camera.countDocuments({ blueprint: blueprint._id });
                return {
                    ...blueprint.toObject(),
                    cameraCount
                };
            })
        );

        res.json({
            success: true,
            blueprints: blueprintsWithCameras
        });
    } catch (error) {
        console.error('Get blueprints error:', error);
        res.status(500).json({ message: 'Error fetching blueprints', error: error.message });
    }
});

// @route   GET /api/blueprints/:id
// @desc    Get specific blueprint with cameras and areas
// @access  Admin
router.get('/:id', ensureAuthenticated, adminOnly, async (req, res) => {
    try {
        const blueprint = await Blueprint.findById(req.params.id)
            .populate('createdBy', 'name email');

        if (!blueprint) {
            return res.status(404).json({ message: 'Blueprint not found' });
        }

        // Get all cameras for this blueprint
        const cameras = await Camera.find({ blueprint: blueprint._id });

        // Get camera statistics
        const cameraStats = await Camera.getStatistics(blueprint._id);

        res.json({
            success: true,
            blueprint,
            cameras,
            cameraStats
        });
    } catch (error) {
        console.error('Get blueprint error:', error);
        res.status(500).json({ message: 'Error fetching blueprint', error: error.message });
    }
});

// @route   PUT /api/blueprints/:id
// @desc    Update blueprint
// @access  Admin
router.put('/:id', ensureAuthenticated, adminOnly, async (req, res) => {
    try {
        const {
            name,
            description,
            imageUrl,
            imageData,
            dimensions,
            areas,
            gridZones
        } = req.body;

        const blueprint = await Blueprint.findById(req.params.id);

        if (!blueprint) {
            return res.status(404).json({ message: 'Blueprint not found' });
        }

        // Update fields
        if (name) blueprint.name = name;
        if (description !== undefined) blueprint.description = description;
        if (imageUrl) blueprint.imageUrl = imageUrl;
        if (imageData) blueprint.imageData = imageData;
        if (dimensions) blueprint.dimensions = dimensions;
        if (areas) blueprint.areas = areas;
        if (gridZones) blueprint.gridZones = gridZones;

        await blueprint.save();

        res.json({
            success: true,
            blueprint
        });
    } catch (error) {
        console.error('Update blueprint error:', error);
        res.status(500).json({ message: 'Error updating blueprint', error: error.message });
    }
});

// @route   DELETE /api/blueprints/:id
// @desc    Delete blueprint (soft delete)
// @access  Admin
router.delete('/:id', ensureAuthenticated, adminOnly, async (req, res) => {
    try {
        const blueprint = await Blueprint.findById(req.params.id);

        if (!blueprint) {
            return res.status(404).json({ message: 'Blueprint not found' });
        }

        // Soft delete
        blueprint.isActive = false;
        await blueprint.save();

        // Also delete associated cameras
        await Camera.deleteMany({ blueprint: blueprint._id });

        res.json({
            success: true,
            message: 'Blueprint deleted successfully'
        });
    } catch (error) {
        console.error('Delete blueprint error:', error);
        res.status(500).json({ message: 'Error deleting blueprint', error: error.message });
    }
});

// @route   GET /api/blueprints/:id/heatmap
// @desc    Get heatmap data for blueprint
// @access  Admin
router.get('/:id/heatmap', ensureAuthenticated, adminOnly, async (req, res) => {
    try {
        const { type, start, end, violationType } = req.query;
        const Violation = require('../models/Violation');

        const blueprint = await Blueprint.findById(req.params.id);
        if (!blueprint) {
            return res.status(404).json({ message: 'Blueprint not found' });
        }

        const cameras = await Camera.find({ blueprint: blueprint._id });
        const cameraIds = cameras.map(c => c._id);

        let heatmapData = [];

        if (type === 'violations') {
            // Area-wise violation heatmap
            const query = { camera: { $in: cameraIds } };
            if (start && end) {
                query.timestamp = { $gte: new Date(start), $lte: new Date(end) };
            }
            if (violationType) {
                query.violationType = violationType;
            }

            const violations = await Violation.find(query).populate('camera');

            // Group by area
            const areaViolations = {};
            violations.forEach(v => {
                if (v.camera && v.camera.linkedArea) {
                    const area = v.camera.linkedArea;
                    areaViolations[area] = (areaViolations[area] || 0) + 1;
                }
            });

            // Calculate intensity (0-1 scale)
            const maxViolations = Math.max(...Object.values(areaViolations), 1);

            heatmapData = Object.entries(areaViolations).map(([areaName, count]) => {
                const area = blueprint.areas.find(a => a.name === areaName);
                return {
                    areaName,
                    violationCount: count,
                    intensity: count / maxViolations,
                    coordinates: area ? area.coordinates : [],
                    color: area ? area.color : '#667eea'
                };
            });

        } else if (type === 'time-based') {
            // Time-of-day risk zones
            const query = { camera: { $in: cameraIds } };
            if (start && end) {
                query.timestamp = { $gte: new Date(start), $lte: new Date(end) };
            }

            const violations = await Violation.find(query).populate('camera');

            // Group by hour and area
            const hourlyData = {};
            violations.forEach(v => {
                if (v.camera && v.camera.linkedArea) {
                    const hour = new Date(v.timestamp).getHours();
                    const key = `${v.camera.linkedArea}-${hour}`;
                    hourlyData[key] = (hourlyData[key] || 0) + 1;
                }
            });

            // Format for response
            heatmapData = Object.entries(hourlyData).map(([key, count]) => {
                const [areaName, hour] = key.split('-');
                const area = blueprint.areas.find(a => a.name === areaName);
                return {
                    areaName,
                    hour: parseInt(hour),
                    violationCount: count,
                    coordinates: area ? area.coordinates : []
                };
            });

        } else if (type === 'camera-status') {
            // Camera failure heatmap
            heatmapData = cameras.map(camera => ({
                cameraId: camera.cameraId,
                position: camera.position,
                status: camera.status,
                uptimePercentage: camera.uptimePercentage,
                lastOnline: camera.lastOnline,
                zone: camera.zone,
                linkedArea: camera.linkedArea
            }));
        }

        res.json({
            success: true,
            type,
            data: heatmapData
        });
    } catch (error) {
        console.error('Get heatmap error:', error);
        res.status(500).json({ message: 'Error generating heatmap', error: error.message });
    }
});

module.exports = router;

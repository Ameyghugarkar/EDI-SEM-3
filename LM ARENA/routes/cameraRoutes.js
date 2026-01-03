const express = require('express');
const router = express.Router();
const Camera = require('../models/Camera');
const Blueprint = require('../models/Blueprint');
const { ensureAuthenticated, ensureRole } = require('../middleware/auth');

// Middleware for admin-only routes
const adminOnly = ensureRole('admin');

// @route   POST /api/cameras
// @desc    Add camera to blueprint
// @access  Admin
router.post('/', ensureAuthenticated, adminOnly, async (req, res) => {
    try {
        const {
            blueprintId,
            position,
            viewAngle,
            viewDirection,
            linkedArea,
            model,
            resolution,
            notes
        } = req.body;

        // Validate blueprint exists
        const blueprint = await Blueprint.findById(blueprintId);
        if (!blueprint) {
            return res.status(404).json({ message: 'Blueprint not found' });
        }

        // Calculate zone from position
        const zone = blueprint.getZoneFromCoordinates(position.x, position.y);

        // Generate camera ID
        const cameraId = await Camera.generateCameraId(blueprintId, zone);

        // Create camera
        const camera = new Camera({
            cameraId,
            blueprint: blueprintId,
            position,
            zone,
            viewAngle: viewAngle || 90,
            viewDirection: viewDirection || 0,
            linkedArea,
            model,
            resolution,
            notes
        });

        // Calculate coverage area
        camera.coverage = camera.calculateCoverage(blueprint.dimensions);

        await camera.save();

        res.status(201).json({
            success: true,
            camera
        });
    } catch (error) {
        console.error('Create camera error:', error);
        res.status(500).json({ message: 'Error creating camera', error: error.message });
    }
});

// @route   GET /api/cameras/blueprint/:blueprintId
// @desc    Get all cameras for a blueprint
// @access  Admin
router.get('/blueprint/:blueprintId', ensureAuthenticated, adminOnly, async (req, res) => {
    try {
        const cameras = await Camera.find({ blueprint: req.params.blueprintId })
            .sort({ zone: 1, cameraId: 1 });

        res.json({
            success: true,
            cameras
        });
    } catch (error) {
        console.error('Get cameras error:', error);
        res.status(500).json({ message: 'Error fetching cameras', error: error.message });
    }
});

// @route   GET /api/cameras/:id
// @desc    Get specific camera
// @access  Admin
router.get('/:id', ensureAuthenticated, adminOnly, async (req, res) => {
    try {
        const camera = await Camera.findById(req.params.id)
            .populate('blueprint', 'name dimensions');

        if (!camera) {
            return res.status(404).json({ message: 'Camera not found' });
        }

        res.json({
            success: true,
            camera
        });
    } catch (error) {
        console.error('Get camera error:', error);
        res.status(500).json({ message: 'Error fetching camera', error: error.message });
    }
});

// @route   PUT /api/cameras/:id
// @desc    Update camera position/details
// @access  Admin
router.put('/:id', ensureAuthenticated, adminOnly, async (req, res) => {
    try {
        const camera = await Camera.findById(req.params.id);

        if (!camera) {
            return res.status(404).json({ message: 'Camera not found' });
        }

        const {
            position,
            viewAngle,
            viewDirection,
            linkedArea,
            model,
            resolution,
            notes,
            status
        } = req.body;

        // Update fields
        if (position) {
            camera.position = position;

            // Recalculate zone if position changed
            const blueprint = await Blueprint.findById(camera.blueprint);
            if (blueprint) {
                camera.zone = blueprint.getZoneFromCoordinates(position.x, position.y);
                camera.coverage = camera.calculateCoverage(blueprint.dimensions);
            }
        }

        if (viewAngle !== undefined) camera.viewAngle = viewAngle;
        if (viewDirection !== undefined) camera.viewDirection = viewDirection;
        if (linkedArea !== undefined) camera.linkedArea = linkedArea;
        if (model) camera.model = model;
        if (resolution) camera.resolution = resolution;
        if (notes !== undefined) camera.notes = notes;
        if (status) camera.status = status;

        await camera.save();

        res.json({
            success: true,
            camera
        });
    } catch (error) {
        console.error('Update camera error:', error);
        res.status(500).json({ message: 'Error updating camera', error: error.message });
    }
});

// @route   DELETE /api/cameras/:id
// @desc    Delete camera
// @access  Admin
router.delete('/:id', ensureAuthenticated, adminOnly, async (req, res) => {
    try {
        const camera = await Camera.findById(req.params.id);

        if (!camera) {
            return res.status(404).json({ message: 'Camera not found' });
        }

        await camera.deleteOne();

        res.json({
            success: true,
            message: 'Camera deleted successfully'
        });
    } catch (error) {
        console.error('Delete camera error:', error);
        res.status(500).json({ message: 'Error deleting camera', error: error.message });
    }
});

// @route   GET /api/cameras/:id/status
// @desc    Get camera status
// @access  Admin
router.get('/:id/status', ensureAuthenticated, adminOnly, async (req, res) => {
    try {
        const camera = await Camera.findById(req.params.id);

        if (!camera) {
            return res.status(404).json({ message: 'Camera not found' });
        }

        res.json({
            success: true,
            cameraId: camera.cameraId,
            status: camera.status,
            lastOnline: camera.lastOnline,
            uptimePercentage: camera.uptimePercentage
        });
    } catch (error) {
        console.error('Get camera status error:', error);
        res.status(500).json({ message: 'Error fetching camera status', error: error.message });
    }
});

// @route   POST /api/cameras/:id/violations
// @desc    Link camera to violation
// @access  Manager/Admin
router.post('/:id/violations', ensureAuthenticated, async (req, res) => {
    try {
        const { violationId } = req.body;
        const Violation = require('../models/Violation');

        const camera = await Camera.findById(req.params.id);
        if (!camera) {
            return res.status(404).json({ message: 'Camera not found' });
        }

        const violation = await Violation.findById(violationId);
        if (!violation) {
            return res.status(404).json({ message: 'Violation not found' });
        }

        // Link camera to violation
        violation.camera = camera._id;
        await violation.save();

        res.json({
            success: true,
            message: 'Camera linked to violation successfully',
            violation
        });
    } catch (error) {
        console.error('Link camera to violation error:', error);
        res.status(500).json({ message: 'Error linking camera', error: error.message });
    }
});

// @route   GET /api/cameras/statistics/:blueprintId
// @desc    Get camera statistics for blueprint
// @access  Admin
router.get('/statistics/:blueprintId', ensureAuthenticated, adminOnly, async (req, res) => {
    try {
        const stats = await Camera.getStatistics(req.params.blueprintId);

        res.json({
            success: true,
            statistics: stats
        });
    } catch (error) {
        console.error('Get camera statistics error:', error);
        res.status(500).json({ message: 'Error fetching statistics', error: error.message });
    }
});

// @route   PUT /api/cameras/bulk-update-status
// @desc    Bulk update camera statuses (for simulation/testing)
// @access  Admin
router.put('/bulk-update-status', ensureAuthenticated, adminOnly, async (req, res) => {
    try {
        const { updates } = req.body; // Array of { cameraId, status }

        const results = await Promise.all(
            updates.map(async ({ cameraId, status }) => {
                const camera = await Camera.findOne({ cameraId });
                if (camera) {
                    camera.status = status;
                    await camera.save();
                    return { cameraId, success: true };
                }
                return { cameraId, success: false, message: 'Camera not found' };
            })
        );

        res.json({
            success: true,
            results
        });
    } catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({ message: 'Error updating cameras', error: error.message });
    }
});

module.exports = router;

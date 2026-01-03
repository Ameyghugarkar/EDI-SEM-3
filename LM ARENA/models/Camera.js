const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema({
    cameraId: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    blueprint: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Blueprint',
        required: true
    },
    position: {
        x: {
            type: Number,
            required: true
        },
        y: {
            type: Number,
            required: true
        }
    },
    zone: {
        type: String,
        required: true // e.g., "A1", "B3", "C2"
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'maintenance'],
        default: 'online'
    },
    lastOnline: {
        type: Date,
        default: Date.now
    },
    viewAngle: {
        type: Number,
        default: 90, // Degrees
        min: 0,
        max: 360
    },
    viewDirection: {
        type: Number,
        default: 0, // Degrees from north (0-360)
        min: 0,
        max: 360
    },
    coverage: [{
        x: Number,
        y: Number
    }], // Polygon representing camera's field of view
    linkedArea: {
        type: String // Name of the area this camera monitors
    },
    model: {
        type: String,
        default: 'Generic'
    },
    resolution: {
        type: String,
        default: '1080p'
    },
    notes: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
cameraSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    if (this.status === 'online') {
        this.lastOnline = Date.now();
    }
    next();
});

// Index for faster queries
cameraSchema.index({ blueprint: 1, zone: 1 });
cameraSchema.index({ cameraId: 1 });
cameraSchema.index({ status: 1 });

// Virtual for uptime percentage (last 24 hours)
cameraSchema.virtual('uptimePercentage').get(function () {
    if (this.status === 'online') return 100;

    const hoursSinceOnline = (Date.now() - this.lastOnline) / (1000 * 60 * 60);
    if (hoursSinceOnline >= 24) return 0;

    return Math.max(0, 100 - (hoursSinceOnline / 24 * 100));
});

// Method to calculate coverage area
cameraSchema.methods.calculateCoverage = function (blueprintDimensions) {
    const { x, y } = this.position;
    const angle = this.viewAngle;
    const direction = this.viewDirection;
    const range = 15; // meters

    // Calculate coverage polygon based on view angle and direction
    const coverage = [];
    const startAngle = direction - (angle / 2);
    const endAngle = direction + (angle / 2);

    // Add camera position as first point
    coverage.push({ x, y });

    // Calculate arc points
    for (let a = startAngle; a <= endAngle; a += 10) {
        const radians = (a * Math.PI) / 180;
        const px = x + range * Math.cos(radians);
        const py = y + range * Math.sin(radians);

        // Clamp to blueprint boundaries
        const clampedX = Math.max(0, Math.min(blueprintDimensions.width, px));
        const clampedY = Math.max(0, Math.min(blueprintDimensions.height, py));

        coverage.push({ x: clampedX, y: clampedY });
    }

    return coverage;
};

// Static method to generate next camera ID for a zone
cameraSchema.statics.generateCameraId = async function (blueprintId, zone) {
    // Find all cameras in this zone
    const camerasInZone = await this.find({
        blueprint: blueprintId,
        zone: zone
    }).sort({ cameraId: -1 });

    // Extract number from last camera ID
    let nextNumber = 1;
    if (camerasInZone.length > 0) {
        const lastId = camerasInZone[0].cameraId;
        const match = lastId.match(/\d+$/);
        if (match) {
            nextNumber = parseInt(match[0]) + 1;
        }
    }

    // Format: CAM-A01, CAM-B03, etc.
    const formattedNumber = String(nextNumber).padStart(2, '0');
    return `CAM-${zone}${formattedNumber}`;
};

// Static method to get camera statistics
cameraSchema.statics.getStatistics = async function (blueprintId) {
    const cameras = await this.find({ blueprint: blueprintId });

    const total = cameras.length;
    const online = cameras.filter(c => c.status === 'online').length;
    const offline = cameras.filter(c => c.status === 'offline').length;
    const maintenance = cameras.filter(c => c.status === 'maintenance').length;

    return {
        total,
        online,
        offline,
        maintenance,
        onlinePercentage: total > 0 ? (online / total * 100).toFixed(1) : 0
    };
};

module.exports = mongoose.model('Camera', cameraSchema);

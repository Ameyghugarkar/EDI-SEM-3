const mongoose = require('mongoose');

const blueprintSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    imageUrl: {
        type: String // Path to uploaded image file
    },
    imageData: {
        type: String // Base64 data for auto-generated layouts
    },
    dimensions: {
        width: {
            type: Number,
            required: true,
            default: 100
        },
        height: {
            type: Number,
            required: true,
            default: 100
        },
        unit: {
            type: String,
            enum: ['meters', 'feet'],
            default: 'meters'
        }
    },
    areas: [{
        name: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: [
                'Material Storage',
                'Cement Mixing Zone',
                'Electrical Zone',
                'Crane Area',
                'Worker Resting Area',
                'Lifting Zone',
                'Dangerous Zone',
                'Main Entrance',
                'Exit Gate',
                'Assembly Area',
                'Loading Dock',
                'Machinery Zone',
                'Quality Control',
                'Office Area',
                'Custom'
            ],
            default: 'Custom'
        },
        coordinates: [{
            x: Number,
            y: Number
        }],
        color: {
            type: String,
            default: '#667eea'
        },
        riskLevel: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
        }
    }],
    gridZones: {
        rows: {
            type: Number,
            default: 5
        },
        cols: {
            type: Number,
            default: 5
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
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
blueprintSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Virtual for camera count
blueprintSchema.virtual('cameraCount', {
    ref: 'Camera',
    localField: '_id',
    foreignField: 'blueprint',
    count: true
});

// Method to get zone label from coordinates
blueprintSchema.methods.getZoneFromCoordinates = function (x, y) {
    const colSize = this.dimensions.width / this.gridZones.cols;
    const rowSize = this.dimensions.height / this.gridZones.rows;

    const col = Math.floor(x / colSize);
    const row = Math.floor(y / rowSize);

    // Generate zone like A, B, C... for rows
    const zoneLetter = String.fromCharCode(65 + row);
    const zoneNumber = col + 1;

    return `${zoneLetter}${zoneNumber}`;
};

// Method to get area at coordinates
blueprintSchema.methods.getAreaAtPoint = function (x, y) {
    for (const area of this.areas) {
        if (this.isPointInPolygon(x, y, area.coordinates)) {
            return area;
        }
    }
    return null;
};

// Helper method to check if point is in polygon
blueprintSchema.methods.isPointInPolygon = function (x, y, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

module.exports = mongoose.model('Blueprint', blueprintSchema);

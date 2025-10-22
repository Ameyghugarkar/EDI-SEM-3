const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const violationSchema = new Schema({
    employee: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        required: true,
        trim: true,
        enum: ["safety", "ppe", "procedure", "security"], // matches your select options
    },
    location: {
        type: String,
        required: true,
        trim: true,
        enum: [
            "warehouse-a",
            "warehouse-b",
            "production-line-1",
            "production-line-2",
            "loading-dock",
            "office-area"
        ],
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    correctiveAction: {
        type: String,
        trim: true,
    },
    evidence: {
        filename: {
            type: String,
            default: "no-file",
        },
        url: {
            type: String,
            default: "https://via.placeholder.com/300x200?text=No+Evidence",
            set: (v) =>
                v === ""
                    ? "https://via.placeholder.com/300x200?text=No+Evidence"
                    : v,
        },
        fileType: {
            type: String, // 'image' or 'video'
            enum: ["image", "video", "unknown"],
            default: "unknown",
        },
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Violation = mongoose.model("Violation", violationSchema);
module.exports = Violation;
const mongoose = require("mongoose");
const Hospital = require("./hospitalModel");

const doctorSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        hospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: Hospital,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Doctor", doctorSchema);

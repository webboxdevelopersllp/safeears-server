const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
    {
        topImage: {
            type: String,
            required: true,
        },
        bottomImage: {
            type: String,
            required: true,
        },
        order: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Banner", bannerSchema);

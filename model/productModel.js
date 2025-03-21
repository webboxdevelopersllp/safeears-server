const mongoose = require("mongoose");
const { Schema } = mongoose;

const productsSchema = new Schema(
    {
        name: {
            type: String,
        },
        description: {
            type: String,
        },

        imageURL: {
            type: String,
        },
        mrpPrice: {
            type: Number,
        },
        salePrice: {
            type: Number,
        },
        ratings: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                rating: { type: Number, max: 5 },
                comment: { type: String } // New field added
            }
        ],
        
        status: {
            type: String,
            enum: [
                "draft",
                "in stock",
                "out of stock",
                "low quantity",
                "unin stock",
            ],
        },
        attributes: [
            {
                name: {
                    type: String,
                },
                value: {
                    type: String,
                },
                isHighlight: {
                    type: Boolean,
                },
            },
        ],
        moreImageURL: [
            {
                type: String,
            },
        ],
        isActive: {
            type: Boolean,
        }
    },
    { timestamps: true }
);

const Products = mongoose.model("Products", productsSchema);

module.exports = Products;

const Product = require("../../model/productModel");
const mongoose = require("mongoose");

const getProducts = async (req, res) => {
    try {


        const products = await Product.find(
            {
                status: { $in: ["in stock", "low quantity","out of stock"] },

            },
            {
                name: 1,
                imageURL: 1,
                salePrice: 1,
                mrpPrice: 1,
                status: 1,
                rating: 1,
                offer: 1,
                ratings:1
            }
        )


        const totalAvailableProducts = await Product.countDocuments({
            status: { $in: ["in stock", "low quantity", "out of stock"] },

        });
        console.log("loged products", products)
        res.status(200).json({ products, totalAvailableProducts });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw Error("Invalid ID!!!");
        }
        
        const product = await Product.findOne({ _id: id })
            .populate({
                path: 'ratings.userId',
                select: 'firstName lastName profileImgURL',
                model: 'User'
            });
            
        res.status(200).json({ product });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const deleteReview = async (req, res) => {
    try {
        const { productId, reviewId } = req.params;
        console.log(req.params)

        // Find the product by ID
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Filter out the review to be deleted
        product.ratings = product.ratings.filter(review => review._id.toString() !== reviewId);

        // Save the updated product
        await product.save();

        res.status(200).json({ message: "Review deleted successfully", product });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
};


module.exports = {
    getProducts,
    getProduct,
    deleteReview
};

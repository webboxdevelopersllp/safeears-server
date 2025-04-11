const Product = require("../../model/productModel");
const mongoose = require("mongoose");

const getProducts = async (req, res) => {

    try {





        const products = await Product.find().sort({
            "createdAt": -1
        })

        const totalAvailableProducts = await Product.countDocuments();

        res.status(200).json({ products, totalAvailableProducts });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get single Product
const getProduct = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw Error("Invalid ID!!!");
        }

        const product = await Product.findOne({ _id: id });

        if (!product) {
            throw Error("No Such Product");
        }

        res.status(200).json({ product });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Creating new Product
const addProduct = async (req, res) => {
    try {
        console.log("Add products", req.body);
        let formData = { ...req.body, isActive: true };
        const files = req?.files;

        // Handle attributes parsing
        if (formData.attributes) {
            try {
                // If it's a string (single attribute), parse it and make it an array
                if (typeof formData.attributes === 'string') {
                    formData.attributes = [JSON.parse(formData.attributes)];
                }
                // If it's an array of strings, parse each element
                else if (Array.isArray(formData.attributes)) {
                    formData.attributes = formData.attributes.map(attr => {
                        // If the element is already an object, use it directly
                        if (typeof attr === 'object') return attr;
                        // Otherwise parse the JSON string
                        return JSON.parse(attr);
                    });
                }
            } catch (err) {
                console.error("Error parsing attributes:", err);
                return res.status(400).json({
                    error: "Invalid attributes format. Must be a valid JSON string or array of JSON strings"
                });
            }
        }

        // Handle file uploads
        if (files && files.length > 0) {
            formData.moreImageURL = [];
            formData.imageURL = "";
            files.forEach((file) => {
                if (file.fieldname === "imageURL") {
                    formData.imageURL = file.filename;
                } else {
                    formData.moreImageURL.push(file.filename);
                }
            });
        }

        const product = await Product.create(formData);
        res.status(200).json({ product });
    } catch (error) {
        console.error("Error creating product:", error);
        res.status(400).json({ error: error.message });
    }
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        let formData = req.body;
        const files = req?.files;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw Error("Invalid ID!!!");
        }

        const existingProduct = await Product.findById(id);
        if (!existingProduct) {
            throw Error("No Such Product");
        }

        // Clean attributes - ensure proper data types
        if (formData.attributes) {
            formData.attributes = formData.attributes.map(attr => ({
                name: attr.name,
                value: attr.value,
                isHighlight: attr.isHighlight === 'true' || attr.isHighlight === true,
                ...(attr._id && mongoose.Types.ObjectId.isValid(attr._id) && { _id: attr._id })
            }));
        }

        if (!formData.moreImageURL) formData.moreImageURL = [];
        if (!formData.imageURL) formData.imageURL = null;


        // Handle image updates
        if (files && files.length > 0) {
            const newMoreImageURLs = formData.moreImageURL || [];
            let newImageURL = formData.imageURL || existingProduct.imageURL;

            files.forEach((file) => {
                if (file.fieldname === "imageURL") {
                    newImageURL = file.filename;
                } else {
                    newMoreImageURLs.push(file.filename);
                }
            });

            formData.imageURL = newImageURL || existingProduct.imageURL;
            formData.moreImageURL = newMoreImageURLs.length > 0 ? newMoreImageURLs : existingProduct.moreImageURL;
        }

        // Ensure proper empty values

        console.log(req.body, "Form Data");
        // Update the product
        const updatedProduct = await Product.findOneAndUpdate(
            { _id: id },
            { $set: formData },
            { new: true }
        );

        if (!updatedProduct) {
            throw Error("No Such Product");
        }

        res.status(200).json({ product: updatedProduct });

    } catch (error) {
        console.log(error);
        res.status(400).json({
            error: error.message,
            details: error.stack
        });
    }
};

// Deleting a Product
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw Error("Invalid ID!!!");
        }

        const product = await Product.findOneAndDelete({ _id: id });

        if (!product) {
            throw Error("No Such Product");
        }

        res.status(200).json({ product });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getProducts,
    getProduct,
    addProduct,
    deleteProduct,
    updateProduct,
};

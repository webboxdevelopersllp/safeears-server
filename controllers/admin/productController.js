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
        let formData = { ...req.body, isActive: true };
        const files = req?.files;
        console.log(formData);


        // return res.status(200).json(typeof formData.attributes)


        if (formData.attributes && typeof formData.attributes === 'string') {
            try {
                formData.attributes = JSON.parse(formData.attributes);
            } catch (err) {
                return res.status(400).json({
                    error: "Invalid attributes format. Must be a valid JSON string"
                });
            }
        }


        if (files && files.length > 0) {
            formData.moreImageURL = [];
            formData.imageURL = "";
            files.map((file) => {
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
        res.status(400).json({ error: error.message });
    }
};

// Update a Product
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const formData = req.body;
        console.log("Updation: ", formData);
        console.log("Files",req?.files)

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw Error("Invalid ID!!!");
        }

        const files = req?.files;

        // Get existing product data
        const existingProduct = await Product.findById(id);
        if (!existingProduct) {
            throw Error("No Such Product");
        }

        // Ensure moreImageURL is an array if present in formData
        if (typeof formData.moreImageURL === "string") {
            formData.moreImageURL = [formData.moreImageURL];
        }

        if (files && files.length > 0) {
            const newMoreImageURLs = formData.moreImageURL || []; // Preserve existing moreImageURL
            let newImageURL = formData.imageURL || existingProduct.imageURL; // Preserve imageURL

            files.forEach((file) => {
                if (file.fieldname === "imageURL") {
                    newImageURL = file.filename; // Replace imageURL with new file
                } else {
                    newMoreImageURLs.push(file.filename); // Add new images to moreImageURL
                }
            });

            // Assign updated values
            formData.imageURL = newImageURL || "";
            formData.moreImageURL = newMoreImageURLs.length > 0 ? newMoreImageURLs : [];
        }

        // If no moreImageURL in formData and no new files, remove it
        if ((!formData.moreImageURL || formData.moreImageURL.length === 0) && (!files || files.length === 0)) {
            formData.moreImageURL = []
            console.log("More image url deleted")
        }

        // If imageURL is empty, remove it
        if (!formData.imageURL) {
            delete formData.imageURL;
            formData.imageURL = []

        }

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
        res.status(400).json({ error: error.message });
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

const Banner = require("../../model/bannerModel");

// Add a new banner
const addBanner = async (req, res) => {
    try {
        // Assuming 'topImage' and 'bottomImage' are the field names in the form-data
        // accessing via req.files which Multer provides. 
        // req.files is array or object depending on upload config. 
        // Since we used upload.any() in routes, it's an array. 
        // We need to identify which is which regardless of order if possible, 
        // OR we expect specific field names if using upload.fields().
        // user instruction said "handle 2 image as on set... name it as top image and bottom image".

        // To be safe with upload.any(), let's iterate.
        let topImage = "";
        let bottomImage = "";

        if (req.files && req.files.length > 0) {
            req.files.forEach(file => {
                if (file.fieldname === "topImage") topImage = file.filename;
                if (file.fieldname === "bottomImage") bottomImage = file.filename;
            });
        }

        console.log(req.files)

        if (!topImage || !bottomImage) {
            throw Error("Both Top and Bottom images are required.");
        }

        // Assign order: max order + 1
        const maxOrderBanner = await Banner.findOne().sort({ order: -1 });
        const order = maxOrderBanner ? maxOrderBanner.order + 1 : 1;

        const banner = await Banner.create({ topImage, bottomImage, order });
        res.status(201).json({ banner });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get all banners (Admin - includes active/inactive, sorted by order)
const getBanners = async (req, res) => {
    try {
        const banners = await Banner.find({}).sort({ order: 1 });
        res.status(200).json({ banners });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get active banners (User - only active, sorted by order)
const getActiveBanners = async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true }).sort({ order: 1 });
        res.status(200).json({ banners });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


// Delete a banner
const deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await Banner.findByIdAndDelete(id);
        if (!banner) {
            throw Error("Banner not found");
        }
        res.status(200).json({ message: "Banner deleted successfully" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update Banner Order (Drag and Drop)
const updateBannerOrder = async (req, res) => {
    try {
        const { orderedIds } = req.body; // Array of IDs in the new desired order

        if (!orderedIds || !Array.isArray(orderedIds)) {
            throw Error("Invalid data format. 'orderedIds' must be an array.");
        }

        const updates = orderedIds.map((id, index) => {
            // Index + 1 because we usually start order at 1 or 0. Let's stick to 1-based or 0-based consistently.
            // previous implementation used maxOrder + 1, so 1-based seems fine.
            return Banner.findByIdAndUpdate(id, { order: index + 1 });
        });

        await Promise.all(updates);

        res.status(200).json({ message: "Banner order updated successfully" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
// Toggle Active Status (Optional helper)
const toggleBannerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const banner = await Banner.findByIdAndUpdate(id, { isActive }, { new: true });
        res.status(200).json({ banner });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}


module.exports = {
    addBanner,
    getBanners,
    getActiveBanners,
    deleteBanner,
    updateBannerOrder,
    toggleBannerStatus
};

const Hospital = require("../../model/hospitalModel");
const Order = require("../../model/orderModel");

// Add a new hospital
const addHospital = async (req, res) => {
    try {
        const { name } = req.body;


       
        const hospital = await Hospital.create({ name });
        res.status(201).json({ hospital });
    } catch (error) {
        console.log(error)
        res.status(400).json({ error: error.message });
    }
};

// Get all hospitals
const getHospitals = async (req, res) => {
    try {
        const filter = {};
        if (req.query.isActive) {
            filter.isActive = req.query.isActive === 'true';
        }
        const hospitals = await Hospital.find(filter).sort({ createdAt: -1 });
        res.status(200).json({ hospitals });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get a single hospital
const getHospital = async (req, res) => {
    try {
        const { id } = req.params;
        const hospital = await Hospital.findById(id);
        if (!hospital) {
            throw Error("Hospital not found");
        }
        res.status(200).json({ hospital });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update a hospital
const updateHospital = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, isActive } = req.body;

        let updateData = { name };
        if (isActive !== undefined) {
            updateData.isActive = isActive;
        }

        const hospital = await Hospital.findByIdAndUpdate(id, updateData, { new: true });
        if (!hospital) {
            throw Error("Hospital not found");
        }
        res.status(200).json({ hospital });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete a hospital
const deleteHospital = async (req, res) => {
    try {
        const { id } = req.params;
        const hospital = await Hospital.findByIdAndDelete(id);
        if (!hospital) {
            throw Error("Hospital not found");
        }
        res.status(200).json({ message: "Hospital deleted successfully" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


// Analytics: Get Hospitals and Doctors order counts
const getAnalytics = async (req, res) => {
    try {
        const hospitalAnalytics = await Order.aggregate([
            { $match: { hospital: { $exists: true } } },
            { $group: { _id: "$hospital", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $lookup: { from: "hospitals", localField: "_id", foreignField: "_id", as: "hospital" } },
            { $unwind: "$hospital" },
            { $project: { name: "$hospital.name", count: 1 } }
        ]);

        const doctorAnalytics = await Order.aggregate([
            { $match: { doctor: { $exists: true } } },
            { $group: { _id: "$doctor", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $lookup: { from: "doctors", localField: "_id", foreignField: "_id", as: "doctor" } },
            { $unwind: "$doctor" },
            { $project: { name: "$doctor.name", count: 1 } }
        ]);

        res.status(200).json({ hospitalAnalytics, doctorAnalytics });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


module.exports = {
    addHospital,
    getHospitals,
    getHospital,
    updateHospital,
    deleteHospital,
    getAnalytics
};

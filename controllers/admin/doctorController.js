const Doctor = require("../../model/doctorModel");

// Add a new doctor
const addDoctor = async (req, res) => {
    try {
        const { name, hospital, specialization } = req.body;

        // Check if the file is uploaded
        let image = "";
        if (req.files && req.files.length > 0) {
            image = req.files[0].location;
        }

        const doctor = await Doctor.create({ name, hospital, specialization, image });
        res.status(201).json({ doctor });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get all doctors
const getDoctors = async (req, res) => {
    try {
        const filter = {};
        if (req.query.isActive) {
            filter.isActive = req.query.isActive === 'true';
        }
        if (req.query.hospital) {
            filter.hospital = req.query.hospital;
        }
        const doctors = await Doctor.find(filter).populate("hospital").sort({ createdAt: -1 });
        res.status(200).json({ doctors });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Get a single doctor
const getDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const doctor = await Doctor.findById(id).populate("hospital");
        if (!doctor) {
            throw Error("Doctor not found");
        }
        res.status(200).json({ doctor });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Update a doctor
const updateDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, hospital, specialization, isActive } = req.body;

        let updateData = {};
        if (name) updateData.name = name;
        if (hospital) updateData.hospital = hospital;
        if (specialization) updateData.specialization = specialization;
        if (isActive !== undefined) updateData.isActive = isActive;

        if (req.files && req.files.length > 0) {
            updateData.image = req.files[0].location;
        }

        const doctor = await Doctor.findByIdAndUpdate(id, updateData, { new: true });
        if (!doctor) {
            throw Error("Doctor not found");
        }
        res.status(200).json({ doctor });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Delete a doctor
const deleteDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const doctor = await Doctor.findByIdAndDelete(id);
        if (!doctor) {
            throw Error("Doctor not found");
        }
        res.status(200).json({ message: "Doctor deleted successfully" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    addDoctor,
    getDoctors,
    getDoctor,
    updateDoctor,
    deleteDoctor,
};

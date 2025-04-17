const Address = require("../../model/addressModel");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const getAddresses = async (req, res) => {
  try {
    const token = req.cookies.user_token;

    const { _id } = jwt.verify(token, process.env.SECRET);

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw Error("Invalid user Id!!!");
    }

    const addresses = await Address.find({ user: _id }).sort({ createdAt: -1 }).exec();;

    if (!addresses) {
      throw Error("No address found");
    }

    res.status(200).json({ addresses });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAddress = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw Error("Invalid Address Id!!!");
    }

    const address = await Address.findOne({ _id: id });

    if (!address) {
      throw Error("Address not found");
    }

    res.status(200).json({ address });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw Error("Invalid Address Id!!!");
    }

    const address = await Address.findByIdAndDelete(id);

    res.status(200).json({ address });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createAddress = async (req, res) => {
  try {
    const token = req.cookies.user_token;

    const { _id } = jwt.verify(token, process.env.SECRET);

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw Error("Invalid user Id!!!");
    }
    const body = req.body;

    const address = await Address.create({ ...body, user: _id });

    res.status(200).json({ address });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateAddress = async (req, res) => {
  try {
    const body = req.body;
    console.log("body", body);
    
    const token = req.cookies.user_token;
    const { _id } = jwt.verify(token, process.env.SECRET);

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw Error("Invalid user Id!!!");
    }

    const exists = await Address.findOne({ user: _id });
    if (!exists) {
      throw Error("Address doesn't exists");
    }

    // Create a copy of body without the _id field
    const { _id: omitId, ...updateData } = body;

    const address = await Address.findOneAndUpdate(
      { _id: body._id, user: _id }, // Find by both address _id and user _id
      {
        $set: updateData, // Use the filtered data without _id
      },
      {
        new: true,
      }
    );

    if (!address) {
      throw Error("Address not found or not owned by user");
    }

    res.status(200).json({ address });
  } catch (error) {
    console.log("error", error);
    res.status(400).json({ error: error.message });
  }
};


module.exports = {
  getAddresses,
  getAddress,
  createAddress,
  deleteAddress,
  updateAddress,
};

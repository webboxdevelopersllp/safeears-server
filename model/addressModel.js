const mongoose = require("mongoose");
const User = require("./userModel");

const { Schema } = mongoose;

const AddressSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
  },
  pinCode: {
    type: Number,
  },
  locality: {
    type: String,
  },

  address: {
    type: String,
  },
  city: {
    type: String,
  },
  state: {
    type: String,
  },
  landMark: {
    type: String,
  },
  alternatePhoneNumber: {
    type: String,
  },

  addressType: {
    type: String,
    enum: [
      "home",
      "work"
    ],
  },

  user: {
    type: Schema.Types.ObjectId,
    ref: User,
    required: true,
  },
}, { timestamps: true }
);

const Address = mongoose.model("Address", AddressSchema);

module.exports = Address;

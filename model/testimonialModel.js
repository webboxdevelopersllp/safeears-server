// models/testimonialModel.js

const mongoose = require('mongoose');

// Define Testimonial schema
const testimonialSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      minlength: [10, 'Testimonial text must be at least 10 characters long'],
    },
    order: {
      type: Number,
      required: true,
    //   unique: true, // Make sure the order is unique
    },
  },
  { timestamps: true }
);

// Create and export the Testimonial model
const Testimonial = mongoose.model('Testimonial', testimonialSchema);

module.exports = Testimonial;

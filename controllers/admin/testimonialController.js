// controllers/testimonialController.js

const Testimonial = require('../../model/testimonialModel');

// Get all testimonials sorted by order
const getTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ order: 1, createdAt: -1 });
    return res.status(200).json({ testimonials });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error' });
  }
};

// Add a new testimonial
const addTestimonial = async (req, res) => {
  const { name, text } = req.body;

  if (!name || !text) {
    return res.status(400).json({ error: 'Name and text are required' });
  }

  try {
    // Get the highest order value and add 1 for the new testimonial
    const lastTestimonial = await Testimonial.findOne().sort({ order: -1 });
    const newOrder = lastTestimonial ? lastTestimonial.order + 1 : 1;

    const newTestimonial = new Testimonial({ name, text, order: newOrder });
    await newTestimonial.save();
    return res.status(201).json({ success: 'Testimonial added successfully', testimonial: newTestimonial });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error' });
  }
};

// Edit a testimonial
const editTestimonial = async (req, res) => {
  console.log("Edit")

  const { id } = req.params;
  const { name, text, order } = req.body;

  if (!name || !text || !order) {
    return res.status(400).json({ error: 'Name, text, and order are required' });
  }

  try {
    const testimonial = await Testimonial.findByIdAndUpdate(id, { name, text, order }, { new: true });
    if (!testimonial) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    return res.status(200).json({ success: 'Testimonial updated successfully', testimonial });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error' });
  }
};

// Delete a testimonial
const deleteTestimonial = async (req, res) => {
  const { id } = req.params;

  try {
    const testimonial = await Testimonial.findByIdAndDelete(id);
    if (!testimonial) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }

    // Re-adjust the order of the remaining testimonials
    await Testimonial.updateMany(
      { order: { $gt: testimonial.order } },
      { $inc: { order: -1 } }
    );

    return res.status(200).json({ success: 'Testimonial deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Server Error' });
  }
};

/// Function to update testimonial order (for drag-and-drop functionality)
const updateTestimonialOrder = async (req, res) => {
  const { testimonialIds } = req.body;

  if (!testimonialIds || !Array.isArray(testimonialIds)) {
    return res.status(400).json({ error: 'Invalid input: testimonialIds must be an array' });
  }

  try {
    // Step 1: First set all orders to negative values to avoid conflicts
    // Since these are temporary values, we'll use the index position but negative
    // This ensures no conflicts with the positive values we'll set later
    for (let i = 0; i < testimonialIds.length; i++) {
      await Testimonial.findByIdAndUpdate(
        testimonialIds[i],
        { order: -1000 - i }, // Using negative values far from our normal range
        { runValidators: false } // Bypass validators if they exist
      );
    }

    // Step 2: Now set them to their actual order values
    for (let i = 0; i < testimonialIds.length; i++) {
      await Testimonial.findByIdAndUpdate(
        testimonialIds[i],
        { order: i + 1 },
        { runValidators: false }
      );
    }

    return res.status(200).json({ success: 'Order updated successfully' });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: String(error) });
  }
};

module.exports = {
  getTestimonials,
  addTestimonial,
  editTestimonial,
  deleteTestimonial,
  updateTestimonialOrder, // Expose the order update function
};

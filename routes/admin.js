const express = require("express");
const { getProducts, getProduct, deleteProduct, updateProduct, addProduct } = require("../controllers/admin/productController");
const upload = require("../middleware/upload");
const { getOrders, updateOrderStatus, getOrder, generateOrderInvoice } = require("../controllers/admin/orderController");
const { getPayments, clearPayments } = require("../controllers/admin/paymentController");
const { getTestimonials, addTestimonial, editTestimonial, deleteTestimonial, updateTestimonialOrder } = require("../controllers/admin/testimonialController");
const router = express.Router();





// Products controller functions mounting them to corresponding route
router.get("/products", getProducts);
router.get("/product/:id", getProduct);
router.delete("/product/:id", deleteProduct);
router.patch("/product/:id", upload.any(), updateProduct);
router.post("/product", upload.any(), addProduct);

router.get("/payments", getPayments);
router.get("/clear-payments", clearPayments);


// Order controller functions mounting them to corresponding route
router.get("/orders", getOrders);
// router.delete("/clear-orders", clearOrder);
router.get("/order/:id", getOrder);
router.patch("/order-status/:id", updateOrderStatus);
// router.get("/order-generate-excel", generateOrderExcel); // Generating Excel
// router.get("/order-generate-pdf", generateOrderPDF); // Generating PDF
// router.get("/order-generate-csv", generateOrderCSV); // Generating PDF
router.get("/order-invoice/:id", generateOrderInvoice);



// Get all testimonials
router.get('/testimonials', getTestimonials);

// Add a new testimonial
router.post('/testimonial', addTestimonial);

// Edit a testimonial
router.put('/testimonial/:id', editTestimonial);

// Delete a testimonial
router.delete('/testimonial/:id', deleteTestimonial);

// Update the order of testimonials (for drag-and-drop)
router.post('/testimonial/order', updateTestimonialOrder); // New route for updating order

module.exports = router;

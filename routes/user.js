const express = require("express");
const upload = require("../middleware/upload");
const {requireAuth} = require("../middleware/requireAuth")
const { getUserDataFirst, logoutUser, editUser, changePassword, rateProduct } = require("../controllers/userController");
const { getProducts, getProduct, deleteReview } = require("../controllers/user/productController");
const { getAddresses, getAddress, createAddress, deleteAddress, updateAddress } = require("../controllers/user/addressController");
const { getCart, addToCart, deleteCart, deleteOneProduct, incrementQuantity, decrementQuantity } = require("../controllers/user/cartController");
const { createOrder, buyNow, getOrders, orderCount, getOrder, generateOrderInvoice } = require("../controllers/user/orderController");
const { createRazerPayOrder, verifyPayment, getKey } = require("../controllers/user/paymentController");

const { getTestimonials } = require("../controllers/admin/testimonialController");

const router = express.Router();


// To get user data on initial page load.
router.get("/", getUserDataFirst);

// Logout
router.get("/logout", logoutUser);

// Edit User profile
router.post("/edit-profile", upload.single("profileImgURL"), editUser);

// Change User Password
router.post("/change-password", changePassword);

// Products
router.get("/products", getProducts);
router.get("/product/:id", getProduct);
router.delete('/product/:productId/delete-review/:reviewId',deleteReview)

// Order
router.post("/order", createOrder);
router.get("/orders", getOrders);
router.get("/order/:id", getOrder);
// router.post("/cancel-order/:id", cancelOrder);
// router.post("/request-return/:id", requestReturn);
router.get("/order-invoice/:id", generateOrderInvoice);
router.get("/order-count/", orderCount);
router.post("/buy-now/:id", buyNow);

// Cart
router.get("/cart", getCart);
router.post("/cart", addToCart);
router.delete("/cart/:id", deleteCart);
router.delete("/cart/:cartId/item/:productId", deleteOneProduct);
router.patch(
  "/cart-increment-quantity/:cartId/item/:productId",
  incrementQuantity
);
router.patch(
  "/cart-decrement-quantity/:cartId/item/:productId",
  decrementQuantity
);

// Address
router.get("/address", getAddresses);
router.get("/address/:id", getAddress);
router.post("/address", createAddress);
router.delete("/address/:id", deleteAddress);
router.patch("/address/:id", updateAddress);

// RazerPay Payment
router.post("/razor-order", createRazerPayOrder);
router.post("/razor-verify", verifyPayment);
router.get("/razor-key", getKey);


router.get('/testimonials', getTestimonials);

// Rating by user 
router.post('/rate/:productId',requireAuth,rateProduct)


module.exports = router;

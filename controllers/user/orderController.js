const jwt = require("jsonwebtoken");
const Cart = require("../../model/cartModel");
const mongoose = require("mongoose");
const Address = require("../../model/addressModel");
const Order = require("../../model/orderModel");
const Products = require("../../model/productModel");
const Payment = require("../../model/paymentModel");
// const uuid = require("uuid");
const Wallet = require("../../model/walletModel");
// const { generateInvoicePDF } = require("../Common/invoicePDFGenFunctions");
const Counter = require("../../model/counterModel");
const { generateInvoicePDF } = require("../Common/invoicePDFGenFunctions");
const { sendOrderDetailsMail } = require("../../util/mailFunction");

const twilio = require('twilio');

const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);


// Just the function increment or decrement product count
const updateProductList = async (id, count) => {
  const product = await Products.findOne({ _id: id });


  if (product.status !== ('in stock' || 'low quantity')) {
    throw new Error("Insufficient stock Quantity");
  }

  const updateProduct = await Products.findByIdAndUpdate(
    id,
    {
      $inc: { stockQuantity: count },
    },
    { new: true }
  );

  if (
    parseInt(updateProduct.stockQuantity) < 5 &&
    parseInt(updateProduct.stockQuantity) > 0
  ) {
    await Products.findByIdAndUpdate(id, {
      $set: { status: "low quantity" },
    });
  }

  if (parseInt(updateProduct.stockQuantity) === 0) {
    await Products.findByIdAndUpdate(id, {
      $set: { status: "out of stock" },
    });
  }

  if (parseInt(updateProduct.stockQuantity) > 5) {
    await Products.findByIdAndUpdate(id, {
      $set: { status: "in stock" },
    });
  }
};


const sendWhatsAppMessage = async (to, message) => {
  try {
    const response = await client.messages.create({
      from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER,
      to: 'whatsapp:' + to, // User's WhatsApp number
      body: message,
      // mediaUrl: 'https://example.com/path/to/your/pdf.pdf', // URL to the PDF file
    });
    console.log("Message sent:", response);
    return response;
  } catch (error) {
    console.error("Error sending message:", error);
  }
};


// Creating an order
const createOrder = async (req, res) => {
  try {
    const token = req.cookies.user_token;
    const { _id } = jwt.verify(token, process.env.SECRET);

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw Error("Invalid ID!!!");
    }

    const { address, paymentMode } = req.body;

    const addressData = await Address.findOne({ _id: address });

    const cart = await Cart.findOne({ user: _id }).populate("items.product", {
      name: 1,
      salePrice: 1,
    });

    let sum = 0;
    let totalQuantity = 0;

    cart.items.forEach((item) => {
      sum += item.product.salePrice * item.quantity;
      totalQuantity += item.quantity;
    });

    const products = cart.items.map((item) => ({
      productId: item.product._id,
      size: item.size,
      quantity: item.quantity,
      totalPrice: item.product.salePrice,
      salePrice: item.product.salePrice,
    }));

    const orderData = {
      user: _id,
      address: addressData,
      products: products,
      subTotal: sum,
      tax: 0,
      totalPrice: sum,
      paymentMode,
      totalQuantity,
      statusHistory: [{ status: "pending" }],
    };

    const order = await Order.create(orderData);

    if (order) {
      try {
        const order2 = await Order.findById(order._id).populate("products.productId user");

        const pdfBuffer = await generateInvoicePDF(order2);

        // WhatsApp Template Message
        if (order2?.user?.phoneNumber) {
          const productDetails = order2.products.map(
            (item) => `🔹 ${item.productId.name} - ₹${item.salePrice} x ${item.quantity}`
          ).join("\n");

          console.log("Product details for user", order2.products);

          await client.messages.create({
            contentSid: "HX247eebf50e2181bb3291ecfc0cb187d3", // Your approved template SID
            from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER, // Twilio sandbox number or your registered WhatsApp number
            to: `whatsapp:${order2.user.phoneNumber}`,
            contentVariables: JSON.stringify({
              "1": order2.user.firstName,
              "2": productDetails,
              "3": order2.subTotal.toString(),
              "4": order2.totalQuantity.toString(),
              "5": order2.address.name,
              "6": order2.address.phoneNumber,
              "7": order2.address.pinCode.toString(),
              "8": order2.address.locality,
              "9": `${order2.address.address}, ${order2.address.city}`,
              "10": order2.paymentMode,
              "11": "Pending",

            }),
          });

        }

        

        const productDetailsForAdmin = order2.products.map(
          (item) => `🔹 ${item.productId.name}  ₹${item.salePrice} x ${item.quantity}`
        ).join("\n");

        console.log("Product details for admin", productDetailsForAdmin);

        await client.messages.create({
          contentSid: "HXde21fcd52f9aeb338f117f2ccefe470b", // Your approved template SID
          from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER, // Twilio sandbox number or your registered WhatsApp number
          to: 'whatsapp:' + process.env.ADMIN_WHATSAPP_NUMBER, // Admin's WhatsApp number
          contentVariables: JSON.stringify({
            "1": order2.user.firstName,
            "2": productDetailsForAdmin,
            "3": order2.subTotal.toString(),
            "4": order2.totalQuantity.toString(),
            "5": order2.address.name,
            "6": order2.address.phoneNumber,
            "7": order2.address.pinCode.toString(),
            "8": order2.address.locality,
            "9": `${order2.address.address}, ${order2.address.city}`,
            "10": order2.paymentMode,
            "11": "Pending",

          }),
        });



        // Email with invoice PDF
        sendOrderDetailsMail(order2.user.email, order2, pdfBuffer);

      } catch (err) {
        console.log("Error while sending invoice", err);
      }

      await Cart.findByIdAndDelete(cart._id); // Clear cart after order
    }

    res.status(200).json({ order });

  } catch (error) {
    console.log(error);
    res.status(400).json({ error: error.message });
  }
};

// Get all order details
const getOrders = async (req, res) => {
  try {
    const token = req.cookies.user_token;

    const { _id } = jwt.verify(token, process.env.SECRET);

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw Error("Invalid ID!!!");
    }

    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const orders = await Order.find(
      { user: _id },
      {
        address: 0,
        paymentMode: 0,
        deliveryDate: 0,
        user: 0,
        statusHistory: 0,
        products: { $slice: 1 },
      }
    )
      .skip(skip)
      .limit(limit)
      .populate("products.productId", { name: 1 })
      .sort({ createdAt: -1 });

    const totalAvailableOrders = await Order.countDocuments({ user: _id });
    console.log(totalAvailableOrders);


    res.status(200).json({ orders, totalAvailableOrders });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get a single order details
const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    let find = {};

    if (mongoose.Types.ObjectId.isValid(id)) {
      find._id = id;
    } else {
      find.orderId = id;
    }

    const order = await Order.findOne(find).populate("products.productId", {
      imageURL: 1,
      name: 1,
      description: 1,
    });

    if (!order) {
      throw Error("No Such Order");
    }

    res.status(200).json({ order });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};



// Generating pdf invoices
const generateOrderInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    let find = {};

    if (mongoose.Types.ObjectId.isValid(id)) {
      find._id = id;
    } else {
      find.orderId = id;
    }

    const order = await Order.findOne(find).populate("products.productId");


    const pdfBuffer = await generateInvoicePDF(order);

    // Set headers for the response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=invoice.pdf");

    res.status(200).end(pdfBuffer);
  } catch (error) {
    console.log(error);

    res.status(400).json({ error: error.message });
  }
};

const orderCount = async (req, res) => {
  try {
    const token = req.cookies.user_token;

    const { _id } = jwt.verify(token, process.env.SECRET);

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw Error("Invalid ID!!!");
    }

    const totalOrders = await Order.countDocuments({ user: _id });
    const pendingOrders = await Order.countDocuments({
      user: _id,
      status: "pending",
    });
    const completedOrders = await Order.countDocuments({
      user: _id,
      status: "delivered",
    });

    res.status(200).json({ totalOrders, pendingOrders, completedOrders });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Buy Now function

const buyNow = async (req, res) => {
  try {
    const { address, paymentMode, notes, quantity } = req.body;

    // User Id
    const token = req.cookies.user_token;

    const { _id } = jwt.verify(token, process.env.SECRET);

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw Error("Invalid ID!!!");
    }
    // Product ID
    const { id } = req.params;

    const product = await Products.findOne({ _id: id });
    if (!product) {
      throw Error("No product were found with this id");
    }

    // if (quantity > product.stockQuantity) {
    //   throw Error("Insufficient Quantity");
    // }

    const sum = product.salePrice;
    const sumWithTax = parseInt(sum + sum * 0.08);

    // Request Body

    const addressData = await Address.findOne({ _id: address });
    if (!addressData) {
      throw Error("Address cannot be found");
    }

    let products = [];

    products.push({
      productId: product._id,
      quantity: quantity,
      totalPrice: product.salePrice,
      price: product.salePrice,
    });

    let orderData = {
      user: _id,
      address: addressData,
      products: products,
      subTotal: sum,
      tax: parseInt(sum * 0.08),
      totalPrice: sumWithTax,
      paymentMode,
      totalQuantity: quantity,
      statusHistory: [
        {
          status: "pending",
        },
      ],
      ...(notes ? notes : {}),
      // ...(cart.coupon ? { coupon: cart.coupon } : {}),
      // ...(cart.couponCode ? { couponCode: cart.couponCode } : {}),
      // ...(cart.discount ? { discount: cart.discount } : {}),
      // ...(cart.type ? { couponType: cart.type } : {}),
    };

    await updateProductList(id, -quantity);

    const order = await Order.create(orderData);

    // When payment is done using wallet reducing the wallet and creating payment
    if (paymentMode === "myWallet") {
      const exists = await Wallet.findOne({ user: _id });
      if (!exists) {
        throw Error("No Wallet where found");
      }

      await Payment.create({
        order: order._id,
        payment_id: `wallet_${uuid.v4()}`,
        user: _id,
        status: "success",
        paymentMode: "myWallet",
      });

      let counter = await Counter.findOne({
        model: "Wallet",
        field: "transaction_id",
      });

      // Checking if order counter already exist
      if (counter) {
        counter.count += 1;
        await counter.save();
      } else {
        counter = await Counter.create({
          model: "Wallet",
          field: "transaction_id",
        });
      }

      let wallet = {};
      if (exists) {
        wallet = await Wallet.findByIdAndUpdate(exists._id, {
          $inc: {
            balance: -sumWithTax,
          },
          $push: {
            transactions: {
              transaction_id: counter.count + 1,
              amount: sumWithTax,
              type: "debit",
              description: "Product Ordered",
              order: order._id,
            },
          },
        });
      }
    }

    res.status(200).json({ order });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  // cancelOrder,
  // requestReturn,
  generateOrderInvoice,
  orderCount,
  buyNow,
};

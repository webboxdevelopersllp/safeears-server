const Order = require("../../model/orderModel");
const mongoose = require("mongoose");
const Payment = require("../../model/paymentModel");
// const uuid = require("uuid");
const { generateInvoicePDF } = require("../Common/invoicePDFGenFunctions");
const twilio = require("twilio");

// Function checking if the passed status is valid or not. Ensuring redundant searches are avoided
function isValidStatus(status) {
  const validStatusValues = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "returned",
  ];

  return validStatusValues.includes(status);
}

const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);


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

    // console.log(find);

    const order = await Order.findOne(find).populate("products.productId", {
      imageURL: 1,
      name: 1,
    });

    // console.log(order);

    if (!order) {
      throw Error("No Such Order");
    }

    res.status(200).json({ order });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get Orders List
const getOrders = async (req, res) => {
  try {
    const {
      status,
      search,
      page = 1,
      limit = 10,
      startingDate,
      endingDate,
      hospital,
      doctor,
    } = req.query;

    let filter = {};

    // Date
    if (startingDate) {
      const date = new Date(startingDate);
      filter.createdAt = { $gte: date };
    }
    if (endingDate) {
      const date = new Date(endingDate);
      filter.createdAt = { ...filter.createdAt, $lte: date };
    }

    if (status) {
      if (!isValidStatus(status)) {
        throw Error("Not a valid status");
      }
      filter.status = status;
    } else {
      filter.status = {
        $in: [
          "pending",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
          "returned",
        ],
      };
    }

    if (search) {
      if (mongoose.Types.ObjectId.isValid(search)) {
        filter._id = search;
      } else {
        const searchAsNumber = Number(search);
        if (!isNaN(searchAsNumber)) {
          filter.orderId = searchAsNumber;
        } else {
          // filter.orderId = searchAsNumber;
          throw new Error("Please search using order Id");
        }


      }
    }

    if (hospital && mongoose.Types.ObjectId.isValid(hospital)) {
      filter.hospital = hospital;
    }
    if (doctor && mongoose.Types.ObjectId.isValid(doctor)) {
      filter.doctor = doctor;
    }

    const skip = (page - 1) * limit;

    const orders = await Order.find(filter, {
      address: 0,
      statusHistory: 0,
      products: { $slice: 1 },
    })
      .skip(skip)
      .limit(limit)
      .populate("user", { firstName: 1, lastName: 1 })
      .populate("products.productId", { imageURL: 1, name: 1 })
      .sort({ createdAt: -1 });

    const totalAvailableOrders = await Order.countDocuments(filter);

    res.status(200).json({ orders, totalAvailableOrders });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Updating the status of orders.
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;

    let find = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
      find._id = id;
    } else {
      find.orderId = id;
    }
    const { status, description, date, paymentStatus, trackingId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw Error("Invalid ID!!!");
    }

    const statusExists = await Order.findOne({
      ...find,
      "statusHistory.status": status,
    }).populate("user");

    let updateOptions = {
      $set: {
        status,
      },
    };



    if (trackingId) {

      updateOptions.$set.trackingId = trackingId; // Set trackingId in update
    }
    if (!statusExists) {
      updateOptions.$push = {
        statusHistory: {
          status,
          description,
          date: new Date(date),
        },
      };
    }

    const updated = await Order.findOneAndUpdate(find, updateOptions, {
      new: true,
    });

    // 4. FETCH THE FULL ORDER
    const order2 = await Order.findOne(find, {
      address: 0,
      products: { $slice: 1 },
    })
      .populate("user", { firstName: 1, lastName: 1, phoneNumber: 1 });

    // console.log(order2);

    if (order2 && order2.user && order2.user.phoneNumber) {

      // --- FIX STARTS HERE ---
      // 1. Remove all spaces, dashes, and parentheses
      let cleanNumber = order2.user.phoneNumber.toString().replace(/\D/g, '');

      // 2. Ensure it has the country code (assuming India +91)
      if (!cleanNumber.startsWith('91')) {
        cleanNumber = '91' + cleanNumber;
      }

      // 3. Create the final format
      const finalTo = `whatsapp:+${cleanNumber}`;
      // --- FIX ENDS HERE ---

      try {
        const message = await client.messages.create({
          contentSid: "HX81ccfc52a320d2ff8d8fd900c3317a00",

          messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,

          to: finalTo, // Use the cleaned number

          contentVariables: JSON.stringify({
            "1": order2.user.firstName || "Customer",
            "2": order2.orderId ? order2.orderId.toString() : "Order",
            "3": status,
            "4": "https://safe-ears.com"
          }),
        });
      } catch (msgError) {
        console.error("Twilio Error:", msgError.message);
      }
    }


    // if (updated) {
    //   const message = await client.messages.create({
    //     contentSid: "HX81ccfc52a320d2ff8d8fd900c3317a00",
    //     // CHANGE THIS: Use Messaging Service instead of 'from'
    //     // messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    //     from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER, // Twilio sandbox number or your registered WhatsApp number
    //     to: `whatsapp:${statusExists.user.phoneNumber}`,
    //     contentVariables: JSON.stringify({
    //       "1": statusExists.user.firstName + " " + statusExists.user?.lastName,
    //       "2": updated.orderId.toString(),
    //       "3": status,
    //       "4": "https://safe-ears.com" // Your website link
    //     }),
    //   });
    //   console.log("Message sent successfully", message);
    // }



    //  await client.messages.create({
    //         contentSid: "HX247eebf50e2181bb3291ecfc0cb187d3", // Your approved template SID
    //         from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER, // Twilio sandbox number or your registered WhatsApp number
    //         to: `whatsapp:${order2.user.phoneNumber}`,
    //         contentVariables: JSON.stringify({
    //           "1": order2.user.firstName,
    //           "2": productDetails,
    //           "3": order2.subTotal.toString(),
    //           "4": order2.totalQuantity.toString(),
    //           "5": order2.address.name,
    //           "6": order2.address.phoneNumber,
    //           "7": order2.address.pinCode.toString(),
    //           "8": order2.address.locality,
    //           "9": `${order2.address.address}, ${order2.address.city}`,
    //           "10": order2.paymentMode,
    //           "11": "Pending",
    //         }),
    //       });


    if (!updated) {
      throw Error("Something went wrong");
    }


    // Add trackingId if it's provided in the request body



    const order = await Order.findOne(find, {
      address: 0,
      products: { $slice: 1 },
    })
      .populate("user", { firstName: 1, lastName: 1, })
      .populate("products.productId", { imageURL: 1, name: 1 });

    res.status(200).json({ order });
  } catch (error) {
    console.log(error);

    res.status(400).json({ error: error.message });
  }
};

// // Generating pdf invoices
const generateOrderInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(id);
    const order = await Order.findById(id).populate("products.productId");

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

// Clearing all orders only for testing
const clearOrder = async (req, res) => {
  try {
    const data = await Order.deleteMany({});

    res.status(200).json({ status: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getOrders,
  clearOrder,
  updateOrderStatus,
  getOrder,
  generateOrderInvoice,
};

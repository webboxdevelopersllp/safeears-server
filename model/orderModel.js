const mongoose = require("mongoose");
const User = require("./userModel");
const Product = require("./productModel");
const Counter = require("./counterModel");

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
  regionState: {
    type: String,
  },
  landMark: {
    type: String,
  },
  alternatePhoneNumber: {
    type: String,
  },
  adressType: {
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
});

const ProductSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: Product,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  salePrice: {
    type: Number,
    required: true,
  },

});

const StatusHistorySchema = new Schema({
  status: {
    type: String,
    enum: [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "canceled",
      "return request",
      "return approved",
      "return rejected",
      "pickup completed",
      "returned",
    ],
    default: "pending",
  },
  date: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
  },
  reason: {
    type: String,
  },
});

const OrderSchema = new Schema(
  {
    orderId: {
      type: Number,
      unique: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: User,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "canceled",
        "return request",
        "return approved",
        "return rejected",
        "pickup completed",
        "returned",
      ],
      default: "pending",
    },
    statusHistory: [StatusHistorySchema],
    address: AddressSchema,
    deliveryDate: {
      type: Date,
      default: () => {
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() + 7); // For a week
        return currentDate;
      },
    },
    trackingId: {
      type: String,
    },
    subTotal: {
      type: Number,
    },
    shipping: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    products: [ProductSchema],
    paymentMode: {
      type: String,
      required: true,
      enum: ["cashOnDelivery", "razorPay", "myWallet"],
    },
    totalQuantity: {
      type: Number,
      min: 0,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// Order ID generation
OrderSchema.pre("save", async function (next) {
  if (!this.isNew) {
    return next();
  }

  try {
    const counter = await Counter.findOne({ model: "Order", field: "orderId" });

    // Checking if order counter already exist
    if (counter) {
      this.orderId = counter.count + 1;
      counter.count += 1;
      await counter.save();
    } else {
      await Counter.create({ model: "Order", field: "orderId" });
      this.orderId = 1000;
    }

    return next();
  } catch (error) {
    return next(error);
  }
});

module.exports = mongoose.model("Order", OrderSchema);

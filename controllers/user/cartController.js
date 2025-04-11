const jwt = require("jsonwebtoken");
const Cart = require("../../model/cartModel");
const mongoose = require("mongoose");
const Products = require("../../model/productModel");

const getCart = async (req, res) => {
  try {
    const token = req.cookies.user_token;

    const { _id } = jwt.verify(token, process.env.SECRET);

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw Error("Invalid ID!!!");
    }

    const cart = await Cart.findOne({ user: _id })
      .populate("items.product", {
        name: 1,
        imageURL: 1,
        salePrice: 1,
        mrpPrice: 1,
      })
      .sort({ createdAt: -1 });

    const cartCount = await Cart.countDocuments({ user: _id });


    res.status(200).json({ cart, cartCount });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const addToCart = async (req, res) => {
  try {
    const token = req.cookies.user_token;
    const { _id } = jwt.verify(token, process.env.SECRET);
    const { product, quantity, size } = req.body; // Destructure size from request body
    console.log("items from addToCart", req.body);

    const productDoc = await Products.findById(product);
    if (!productDoc) {
      throw new Error("Product not found");
    }

    let cart = {};
    const exists = await Cart.findOne({ user: _id });

    if (exists) {
      // Check for existing product with the same size
      const existingItemIndex = exists.items.findIndex(
        (item) => 
          item.product.equals(product) && 
          item.size === size // Compare sizes
      );

      if (existingItemIndex !== -1) {
        // Update quantity if same product and size exists
        cart = await Cart.findOneAndUpdate(
          { 
            user: _id,
            "items.product": product,
            "items.size": size
          },
          {
            $inc: {
              "items.$.quantity": quantity,
            },
          },
          { new: true }
        );
      } else {
        // Add as new item if different size
        cart = await Cart.findOneAndUpdate(
          { user: _id },
          {
            $push: {
              items: {
                product,
                quantity,
                size // Include size in new item
              },
            },
          },
          { new: true }
        );
      }
    } else {
      // Create new cart with item including size
      cart = await Cart.create({
        user: _id,
        items: [{ product, quantity, size }],
      });
    }

    res.status(200).json({ cart });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteCart = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw Error("Invalid ID!!!");
    }

    const cartItem = await Cart.findOneAndDelete({ _id: id });
    if (!cartItem) {
      throw Error("No Such Cart");
    }

    res.status(200).json({ cartItem });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteOneProduct = async (req, res) => {
  try {
    const { cartId, productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw Error("Invalid Product !!!");
    }
    if (!mongoose.Types.ObjectId.isValid(cartId)) {
      throw Error("Invalid Cart !!!");
    }

    const updatedCart = await Cart.findByIdAndUpdate(cartId, {
      $pull: {
        items: { _id: productId },
      },

    }, { new: true });

c

    if (!updatedCart) {
      throw Error("Invalid Product");
    }


    res.status(200).json({ productId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const incrementQuantity = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { cartId, productId } = req.params;
    const { size } = req.body;

    const cart = await Cart.findById(cartId).session(session).lean();
    if (!cart) throw new Error("Cart not found");

    const itemIndex = cart.items.findIndex(item => 
      item.product.toString() === productId && 
      (item.size === size || (!item.size && !size))
    );

    if (itemIndex === -1) throw new Error("Item not found in cart");

    const updatedItems = cart.items.map((item, idx) => {
      if (idx === itemIndex) {
        return {
          ...item,
          quantity: item.quantity + 1
        };
      }
      return item;
    });

    const updatedCart = await Cart.findByIdAndUpdate(
      cartId,
      { $set: { items: updatedItems } },
      { new: true, session }
    ).lean();

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      updatedItem: updatedCart.items[itemIndex]
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  } finally {
    session.endSession();
  }
};


const decrementQuantity = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { cartId, productId } = req.params;
    const { size } = req.body;

    const cart = await Cart.findById(cartId).session(session).lean();
    if (!cart) throw new Error("Cart not found");

    const itemIndex = cart.items.findIndex(item => 
      item.product.toString() === productId && 
      (item.size === size || (!item.size && !size))
    );

    if (itemIndex === -1) throw new Error("Item not found in cart");
    if (cart.items[itemIndex].quantity <= 1) {
      throw new Error("Minimum quantity reached");
    }

    const updatedItems = cart.items.map((item, idx) => {
      if (idx === itemIndex) {
        return {
          ...item,
          quantity: item.quantity - 1
        };
      }
      return item;
    });

    const updatedCart = await Cart.findByIdAndUpdate(
      cartId,
      { $set: { items: updatedItems } },
      { new: true, session }
    ).lean();

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      updatedItem: updatedCart.items[itemIndex]
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({
      success: false,
      error: error.message
    });
  } finally {
    session.endSession();
  }
};


module.exports = {
  getCart,
  addToCart,
  deleteCart,
  deleteOneProduct,
  incrementQuantity,
  decrementQuantity,
};

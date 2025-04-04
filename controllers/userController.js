const User = require("../model/userModel");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Products = require("../model/productModel");

const createToken = (_id) => {
  return jwt.sign({ _id }, process.env.SECRET, { expiresIn: "1d" });
};

const cookieConfig = {
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  maxAge: 1000 * 60 * 60 * 24, // 1 day
};




// To get user data on initial page load.
const getUserDataFirst = async (req, res) => {
  try {
    const token = req.cookies.user_token;
    if (!token) {
      throw Error("No token found");
    }

    const { _id } = jwt.verify(token, process.env.SECRET);

    const user = await User.findOne({ _id }, { password: 0 });

    if (!user) {
      throw Error("Cannot find user");
    }

    res.status(200).json(user);
  } catch (error) {
    console.log("Error")
    res.status(400).json({ error: error.message });
  }
};

const signUpUser = async (req, res) => {
  try {
    let userCredentials = req.body;

    const profileImgURL = req?.file?.filename;

    if (profileImgURL) {
      userCredentials = { ...userCredentials, profileImgURL: profileImgURL };
    }

    const user = await User.signup(userCredentials, "user", true);

    const token = createToken(user._id);

    res.cookie("user_token", token, cookieConfig);

    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);

    const token = createToken(user._id);

    res.cookie("user_token", token, cookieConfig);

    res.status(200).json(user);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

const ValidatePhone = async (req, res) => {
  const { phoneNumber } = req.body;

  try {

    if (!phoneNumber || phoneNumber.length < 10) {
      return res.status(400).json({ message: 'Invalid phone number' });
    }

    const user = await User.findOne({ phoneNumber });

    if (user) {
      // If the phone number exists, send a response with the user's data
      return res.json({ status: 'exists', user });
    }

    // If phone number doesn't exist, return status for asking the name
    return res.json({ status: 'not_exists' });


  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};


const loginWithPhone = async (req, res) => {
  const { phoneNumber, firstName, lastName } = req.body;

  try {
    // Check if the phone number already exists
    const existingUser = await User.findOne({ phoneNumber });

    if (existingUser) {
      const token = createToken(existingUser._id);

      res.cookie("user_token", token, cookieConfig);
      return res.status(200).json(existingUser);
      // return res.status(400).json({ message: 'Phone number already in use' });
    }

    // Create new user with name and phone number
    const newUser = new User({
      phoneNumber,
      firstName,
      lastName,
      isEmailVerified: true,
      role: "user",
      isActive: true
    });

    await newUser.save();

    // Generate a token (if needed for further actions)
    const token = createToken(newUser._id);

    res.cookie("user_token", token, cookieConfig);

    return res.status(200).json(newUser);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};


const logoutUser = async (req, res) => {
  res.clearCookie("user_token", {
    sameSite: "none",
    secure: true,
    httpOnly: true,
  });

  res.status(200).json({ msg: "Logged out Successfully" });
};

const editUser = async (req, res) => {
  try {
    const token = req.cookies.user_token;
    
    const { _id } = jwt.verify(token, process.env.SECRET);
    
    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw Error("Invalid ID!!!");
    }
    
    let formData = req.body;
    console.log(formData, "formData");

    const profileImgURL = req?.file?.filename;

    if (profileImgURL) {
      formData = { ...formData, profileImgURL: profileImgURL };
    }
    

    const updatedUser = await User.findOneAndUpdate(
      { _id },
      { $set: { ...formData } },
      { new: true }
    );

    if (!updatedUser) {
      throw Error("No such User");
    }

    const user = await User.findOne({ _id }, { password: 0 });

    res.status(200).json(user);
  } catch (error) {
    // console.log(error, "error.message")
    res.status(400).json({ error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const token = req.cookies.user_token;

    const { _id } = jwt.verify(token, process.env.SECRET);

    if (!mongoose.Types.ObjectId.isValid(_id)) {
      throw Error("Invalid ID!!!");
    }

    const { currentPassword, password, passwordAgain } = req.body;

    const user = await User.changePassword(
      _id,
      currentPassword,
      password,
      passwordAgain
    );

    return res.status(200).json({ user, success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const rateProduct = async (req, res) => {
  try {
    const { rating, comment } = req.body; // Include comment in request body
    const userId = req.user._id
    const product = await Products.findById(req.params.productId);

    if (!product) return res.status(404).json({ message: "Product not found" });

    // Check if the user has already rated
    const existingRating = product.ratings.find(r => r.userId.toString() === userId);

    if (existingRating) {
      // Update existing rating and comment
      existingRating.rating = rating;
      existingRating.comment = comment;
    } else {
      // Add new rating with comment
      product.ratings.push({ userId, rating, comment });
    }

    await product.save();
    res.status(200).json({ message: "Rating submitted successfully", product });

  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};




module.exports = {
  getUserDataFirst,
  signUpUser,
  loginUser,
  ValidatePhone,
  loginWithPhone,
  logoutUser,
  rateProduct,
  editUser,
  changePassword,
};

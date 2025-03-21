const User = require("../model/userModel");
const OTP = require("../model/otpModel");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const bcrypt = require("bcrypt");
const { sendOTPMail, passwordChangedMail } = require("../util/mailFunction");
const { Twilio } = require("twilio");

const twilioClient = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.e);


// Sending OTP to email for validation
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw Error("Provide an Email");
    }

    if (!validator.isEmail(email)) {
      throw Error("Invalid Email");
    }

    const user = await User.findOne({ email });

    if (user) {
      throw Error("Email is already registered");
    }

    let otp = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
    const exists = await OTP.findOne({ email });

    if (exists) {
      throw Error("OTP already send");
    }

    await OTP.create({ email, otp });

    res.status(200).json({ success: true, message: "OTP sent Successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Validating above OTP
const validateOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const data = await OTP.findOne({ email });
    console.log("OTP from db", data)
    console.log("Number", email)
    if (!data) {
      throw Error("OTP expired");
    }

    if (otp != data.otp) {
      throw Error("OTP is not matched");
    }

    res.status(200).json({
      success: true,
      message: "OTP validation Success",
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Incase the user forget the password can reset after verifying otp
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw Error("Provide an Email");
    }

    if (!validator.isEmail(email)) {
      throw Error("Invalid Email");
    }

    const user = await User.findOne({ email });

    if (!user) {
      throw Error("Email is not Registered");
    }

    const otpExists = await OTP.findOne({ email });

    if (otpExists) {
      await OTP.findOneAndDelete({ _id: otpExists._id });
    }

    let otp = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

    await OTP.create({ email, otp });

    res
      .status(200)
      .json({ msg: "OTP is send to your email Address", success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const forgotPasswordMobile = async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ error: "Phone number is required" });

  const user = await User.findOne({ phoneNumber });

  if (!user) {
    throw Error("Phone number is not Registered");
  }

  let otp = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

  // return console.log(phoneNumber)
  try {
    // Send OTP via Twilio
    await twilioClient.messages.create({
      body: `Your OTP code is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    // Store OTP in MongoDB
    await OTP.findOneAndUpdate({ email: phoneNumber }, { otp, createdAt: new Date() }, { upsert: true });
    console.log("OTP", otp)

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error sending OTP", details: error.message });
  }
};

// Validating forgot OTP
const validateForgotOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log(req.body);


    if (!email || !otp) {
      throw Error("All fields are required");
    }

    if (!validator.isEmail(email)) {
      throw Error("Invalid Email");
    }

    const user = await User.findOne({ email });

    if (!user) {
      throw Error("Email is not Registered");
    }

    const validOTP = await OTP.findOne({ email });

    if (otp !== validOTP.otp) {
      throw Error("Wrong OTP. Please Check again");
    }

    res.status(200).json({ success: true, message: "OTP validation Success" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Setting up new password
const newPassword = async (req, res) => {
  try {
    const { email, phoneNumber, password, passwordAgain } = req.body;
    console.log(req.body);


    if (!(email || phoneNumber) || !password || !passwordAgain) {
      throw Error("All fields are required");
    }

    if (email && !validator.isEmail(email)) {
      throw Error("Invalid Email");
    }

    if (phoneNumber && !validator.isMobilePhone(phoneNumber, "any")) {
      throw Error("Invalid Phone Number");
    }

    if (!validator.isStrongPassword(password)) {
      throw Error("Password is not strong enough");
    }

    if (password !== passwordAgain) {
      throw Error("Passwords do not match");
    }

    // Find user by phone if provided, otherwise use email
    const oldUserData = await User.findOne(phoneNumber ? { phoneNumber } : { email });

    if (!oldUserData) {
      throw Error("User not found");
    }
    if (oldUserData.password) {

      const match = await bcrypt.compare(password, oldUserData.password);
      if (match) {
        throw Error("Provide a new password");
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    console.log("salt", salt)
    console.log("hash", hash)



    const user = await User.findOneAndUpdate(
      phoneNumber ? { phoneNumber } : { email },
      { $set: { password: hash } }
    );

    if (user) {
      try {
        passwordChangedMail(user.email);
      } catch (error) {
        console.log("Error occurred while sending email: ", error);
        throw error;
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


// Resending OTP incase the user doesn't receive the OTP
const resentOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw Error("Email is required");
    }

    if (!validator.isEmail(email)) {
      throw Error("Invalid Email");
    }

    const otpData = await OTP.findOne({ email });

    if (!otpData) {
      throw Error("No OTP found in this email. Try again...");
    }

    if (otpData.otp) {
      sendOTPMail(email, otpData.otp);
    } else {
      throw Error("Cannot find OTP");
    }

    res.status(200).json({ message: "OTP resend successfully", success: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

module.exports = {
  sendOTP,
  validateOTP,
  forgotPassword,
  validateForgotOTP,
  newPassword,
  resentOTP,
  forgotPasswordMobile
};

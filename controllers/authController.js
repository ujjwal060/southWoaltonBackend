const User = require("../models/userModel");
const Role = require("../models/roleModel");
const UserToken = require("../models/userTokenModel");
const createError = require("../middleware/error");
const createSuccess = require("../middleware/success");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const otpGenerator = require('otp-generator');
const bcrypt = require('bcrypt');
const axios = require('axios');
const freshbooksService = require("../middleware/freshbooksService");
const FreshBooksToken = require('../models/freshbooksModel');
const { getConfig } = require('../config');


const signUp = async (req, res, next) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const newUser = new User({
      fullName: req.body.fullName,
      email: req.body.email,
      password: req.body.password,
      phoneNumber: req.body.phoneNumber,
      confirmPassword: req.body.confirmPassword,
      state: req.body.state,
    });

    await newUser.save();

    return next(createSuccess(200, "User Registered Successfully"));
  } catch (error) {
    return next(createError(500, error.message));
  }
};

const login = async (req, res, next) => {
  try {
    const JWT_SECRET = await getConfig('JWT_SECRET');
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return next(createError(404, "User Not Found"));
    }

    const isPasswordMatch = user.password === req.body.password;

    if (!isPasswordMatch) {
      return next(createError(404, "Password is Incorrect"));
    }

    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      JWT_SECRET
    );

    res.cookie("access_token", token, { httpOnly: true }).status(200).json({
      status: 200,
      message: "Login Success",
      data: {
        token,
        userId: user._id
      },
    });
  } catch (error) {
    return next(createError(500, "Something went wrong"));
  }
};

const registerAdmin = async (req, res, next) => {
  try {
    const role = await Role.find({});
    const newUser = new User({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      mobileNumber: req.body.mobileNumber,
      jobTitle: req.body.jobTitle,
      isAdmin: true,
      roles: role,
    });
    await newUser.save();
    return next(createSuccess(200, "Admin Registered Successfully"));
  } catch (error) {
    return next(createError(500, "Something went wrong"));
  }
};

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

const sendEmail = async (req, res, next) => {
  try {
    const email = req.body.email;
    const user = await User.findOne({ email: { $regex: "^" + email + "$", $options: "i" } });

    if (!user) {
      return next(createError(404, "User Not found"));
    }

    const otp = generateOTP();
    const expiryTime = Date.now() + 25 * 60 * 1000;

    const newToken = new UserToken({
      userId: user._id,
      token: otp,
      expiry: expiryTime,
    });

    const mailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "development.aayaninfotech@gmail.com",
        pass: "defe qhhm kgmu ztkf",
      },

      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailDetails = {
      from: "development.aayaninfotech@gmail.com",
      subject: "Reset Password Request",
      to: email,
      text: `Your OTP for password reset is: ${otp}`,
      html: `
        <html>
        <head><title>Password Reset Request</title></head>
        <body>
          <h1>Password Reset Request</h1>
          <p>Dear ${user.username},</p>
          <p>We have received a request to reset your password. Use the OTP below to complete the process:</p>
          <p><b>Your OTP:</b> ${otp}</p>
          <p>This OTP is valid for 15 minutes. If you did not request this, please ignore this email.</p>
          <p>Thank you,</p>
          <p>Your Application Team</p>
        </body>
        </html>
      `,
    };

    await mailTransporter.sendMail(mailDetails);
    await newToken.save();

    res.status(200).json({ message: "Email Sent Successfully" });
  } catch (err) {
    console.log(err);
    return next(createError(500, "Something went wrong"));
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    const userToken = await UserToken.findOne({ userId: user._id, token: otp });


    if (!userToken) {
      return res.status(400).json({ message: 'Invalid verification code' });

    }


    userToken.token = undefined;

    await userToken.save();

    res.status(200).json({ message: 'Verification success. You can now create a password.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    user.password = password;

    await user.save();

    res.status(200).json({ message: 'Password set successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error while setting password', error: error.message });
  }
}

const redirectToFreshBooks = async (req, res) => {
  const FRESHBOOKS_CLIENT_ID = await getConfig('FRESHBOOKS_CLIENT_ID');
  const FRESHBOOKS_REDIRECT_URI = await getConfig('FRESHBOOKS_REDIRECT_URI');
  const authUrl = `https://auth.freshbooks.com/oauth/authorize?client_id=${FRESHBOOKS_CLIENT_ID}&response_type=code&redirect_uri=${FRESHBOOKS_REDIRECT_URI}`;
  res.redirect(authUrl);
};

const connectFreshBooks = async (req, res) => {
  const { code, email } = req.query;

  try {
    const tokenData = await freshbooksService.exchangeAuthorizationCodeForToken(code);

    const token = new FreshBooksToken({
      email,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    });
    await token.save();

    res.status(200).json({ message: 'FreshBooks connected successfully!' });
  } catch (error) {
    console.error('Error connecting to FreshBooks:', error);
    res.status(500).json({ error: 'Failed to connect to FreshBooks' });
  }
};

const refreshAccessToken = async (refreshToken) => {
  const FRESHBOOKS_CLIENT_ID = await getConfig('FRESHBOOKS_CLIENT_ID');
  const FRESHBOOKS_CLIENT_SECRET=await getConfig('FRESHBOOKS_CLIENT_SECRET');
  const response = await axios.post('https://auth.freshbooks.com/oauth/token', {
    grant_type: 'refresh_token',
    client_id:FRESHBOOKS_CLIENT_ID,
    client_secret: FRESHBOOKS_CLIENT_SECRET,
    refresh_token: refreshToken,
  });
  return response.data;
};

const ensureFreshBooksToken = async () => {
  const adminEmail =await getConfig('FRESHBOOKS_ADMIN_EMAIL');

  if (!adminEmail) {
    throw new Error("Admin email is not configured in environment variables.");
  }

  const token = await FreshBooksToken.findOne({ email: adminEmail });

  if (!token) {
    throw new Error(`No FreshBooks token found for admin email: ${adminEmail}`);
  }

  if (new Date() >= token.expiresAt) {
    console.log("Refreshing FreshBooks token...");
    const refreshedToken = await refreshAccessToken(token.refreshToken);

    token.accessToken = refreshedToken.access_token;
    token.refreshToken = refreshedToken.refresh_token;
    token.expiresAt = new Date(Date.now() + refreshedToken.expires_in * 1000);
    await token.save();

    console.log("FreshBooks token refreshed successfully.");
  }

  return token.accessToken;
};



module.exports = {
  signUp,
  login,
  registerAdmin,
  sendEmail,
  resetPassword,
  verifyOTP,
  redirectToFreshBooks,
  connectFreshBooks,
  ensureFreshBooksToken,
  refreshAccessToken
};

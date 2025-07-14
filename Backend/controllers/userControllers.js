const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const asyncHandler = require('express-async-handler');

exports.createUser = async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(201).json({ user, token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


// READ ALL
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ONE
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// UPDATE
exports.updateUser = async (req, res) => {
  try {
    const userIdToUpdate = req.params.id;
    const currentUserId = req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    // Allow only admin or the user themselves
    if (!isAdmin && userIdToUpdate !== currentUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await User.findById(userIdToUpdate);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent normal users from updating protected fields
    if (!isAdmin) {
      delete req.body.role;
      delete req.body.isVerified;
    }

    // If admin is promoting someone to admin, auto-verify
    if (req.body.role === 'admin' && user.role !== 'admin') {
      req.body.isVerified = true;
    }

    // Update fields safely
    Object.assign(user, req.body);
    await user.save();

    const updatedUser = await User.findById(userIdToUpdate).select('-password');

    res.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



// DELETE
exports.deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get current user (for authenticated routes)
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendVerificationOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.isVerified) return res.status(400).json({ message: 'User already verified' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = Date.now() + 10 * 60 * 1000;

  user.otpCode = otp;
  user.otpExpires = otpExpires;
  user.otpAttempts = 0;
  user.otpLockedUntil = undefined;
  await user.save();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,  // ✅ match your .env
      pass: process.env.GMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"SK Insight" <${process.env.GMAIL_USER}>`,
    to: user.email,
    subject: 'Your OTP Code',
    html: `<h2>Your OTP Code is: ${otp}</h2><p>This code expires in 10 minutes.</p>`,
  });

  res.json({ message: 'OTP sent to your email.' });
});


exports.verifyEmailOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.isVerified) {
    return res.status(400).json({ message: 'User already verified' });
  }

  if (user.otpLockedUntil && user.otpLockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((user.otpLockedUntil - Date.now()) / 60000);
    return res.status(429).json({
      message: `Too many failed attempts. Try again in ${minutesLeft} minutes.`,
    });
  }

  if (
    user.otpCode === otp &&
    user.otpExpires &&
    user.otpExpires > Date.now()
  ) {
    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.otpAttempts = 0;
    user.otpLockedUntil = undefined;
    await user.save();
    return res.json({ message: 'Email successfully verified.' });
  } else {
    user.otpAttempts = (user.otpAttempts || 0) + 1;

    if (user.otpAttempts >= 5) {
      user.otpLockedUntil = Date.now() + 30 * 60 * 1000; // 30 minutes
      user.otpAttempts = 0;
    }

    await user.save();
    return res.status(400).json({
      message: 'Invalid or expired OTP.',
      attemptsLeft: Math.max(0, 5 - user.otpAttempts),
    });
  }
});

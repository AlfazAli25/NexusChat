import express from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import { protect, generateToken } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { sendEmail, getPasswordResetEmail } from '../config/email.js';

const router = express.Router();

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      throw new AppError('Please provide name, email and password', 400);
    }

    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('Email already registered', 400);
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
    });

    // Generate token
    const token = generateToken(user._id);

    // Update status to online
    user.status = 'online';
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        bio: user.bio,
      },
    });
  })
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new AppError('Please provide email and password', 400);
    }

    // Find user and include password
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+password'
    );

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate token
    const token = generateToken(user._id);

    // Update status to online and last seen
    user.status = 'online';
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        bio: user.bio,
      },
    });
  })
);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post(
  '/logout',
  protect,
  asyncHandler(async (req, res) => {
    // Update user status to offline
    await User.findByIdAndUpdate(req.user._id, {
      status: 'offline',
      lastSeen: new Date(),
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  })
);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get(
  '/me',
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate(
      'friends',
      'name avatar status lastSeen'
    );

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        bio: user.bio,
        friends: user.friends,
        friendRequests: user.friendRequests,
        createdAt: user.createdAt,
      },
    });
  })
);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      throw new AppError('Please provide your email', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link',
      });
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    try {
      // Send email
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request - NexusChat',
        html: getPasswordResetEmail(user.name, resetUrl),
      });

      res.json({
        success: true,
        message: 'Password reset email sent',
      });
    } catch (error) {
      // Clear reset token if email fails
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      throw new AppError('Error sending email. Please try again later.', 500);
    }
  })
);

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password with token
// @access  Public
router.post(
  '/reset-password/:token',
  asyncHandler(async (req, res) => {
    const { password } = req.body;

    if (!password || password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    // Hash the token from URL
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Generate new token and log in
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Password reset successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
      },
    });
  })
);

export default router;

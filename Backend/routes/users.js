import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { uploadAvatar } from '../config/cloudinary.js';

const router = express.Router();

// @route   GET /api/users/search
// @desc    Search users by name or email
// @access  Private
router.get(
  '/search',
  protect,
  asyncHandler(async (req, res) => {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        users: [],
      });
    }

    const users = await User.find({
      _id: { $ne: req.user._id }, // Exclude current user
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
      ],
    })
      .select('name email avatar status')
      .limit(20);

    res.json({
      success: true,
      users,
    });
  })
);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select(
      'name avatar status bio lastSeen createdAt'
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if they are friends
    const isFriend = req.user.friends.includes(user._id);

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        isFriend,
      },
    });
  })
);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/profile',
  protect,
  asyncHandler(async (req, res) => {
    const { name, bio } = req.body;

    const updates = {};

    if (name) {
      if (name.length < 2 || name.length > 50) {
        throw new AppError('Name must be between 2 and 50 characters', 400);
      }
      updates.name = name;
    }

    if (bio !== undefined) {
      if (bio.length > 200) {
        throw new AppError('Bio cannot exceed 200 characters', 400);
      }
      updates.bio = bio;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: 'Profile updated',
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

// @route   PUT /api/users/avatar
// @desc    Update user avatar
// @access  Private
router.put(
  '/avatar',
  protect,
  uploadAvatar.single('avatar'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('Please upload an image', 400);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: req.file.path },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Avatar updated',
      avatar: user.avatar,
    });
  })
);

// @route   PUT /api/users/status
// @desc    Update user status
// @access  Private
router.put(
  '/status',
  protect,
  asyncHandler(async (req, res) => {
    const { status } = req.body;

    const validStatuses = ['online', 'offline', 'away', 'busy'];
    if (!validStatuses.includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        status,
        lastSeen: status === 'offline' ? new Date() : undefined,
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Status updated',
      status: user.status,
    });
  })
);

// @route   PUT /api/users/password
// @desc    Change password
// @access  Private
router.put(
  '/password',
  protect,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Please provide current and new password', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('New password must be at least 6 characters', 400);
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 401);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  })
);

export default router;

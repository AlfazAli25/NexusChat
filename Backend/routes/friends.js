import express from 'express';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// @route   GET /api/friends
// @desc    Get all friends
// @access  Private
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate(
      'friends',
      'name avatar status lastSeen bio'
    );

    res.json({
      success: true,
      friends: user.friends,
    });
  })
);

// @route   GET /api/friends/requests
// @desc    Get friend requests (incoming and outgoing)
// @access  Private
router.get(
  '/requests',
  protect,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
      .populate('friendRequests.incoming', 'name avatar status')
      .populate('friendRequests.outgoing', 'name avatar status');

    res.json({
      success: true,
      incoming: user.friendRequests.incoming,
      outgoing: user.friendRequests.outgoing,
    });
  })
);

// @route   POST /api/friends/request/:userId
// @desc    Send friend request
// @access  Private
router.post(
  '/request/:userId',
  protect,
  asyncHandler(async (req, res) => {
    const targetUserId = req.params.userId;

    // Can't send request to yourself
    if (targetUserId === req.user._id.toString()) {
      throw new AppError("You can't send friend request to yourself", 400);
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    const currentUser = await User.findById(req.user._id);

    // Check if already friends
    if (currentUser.friends.includes(targetUserId)) {
      throw new AppError('Already friends with this user', 400);
    }

    // Check if request already sent
    if (currentUser.friendRequests.outgoing.includes(targetUserId)) {
      throw new AppError('Friend request already sent', 400);
    }

    // Check if there's an incoming request from target user
    if (currentUser.friendRequests.incoming.includes(targetUserId)) {
      // Auto accept if they already sent us a request
      return acceptFriendRequest(currentUser, targetUser, res);
    }

    // Add to outgoing requests
    currentUser.friendRequests.outgoing.push(targetUserId);
    await currentUser.save();

    // Add to target's incoming requests
    targetUser.friendRequests.incoming.push(req.user._id);
    await targetUser.save();

    // Socket: Notify target user
    const io = req.app.get('io');
    const socketHelpers = req.app.get('socketHelpers');
    if (socketHelpers && io) {
      socketHelpers.emitToUser(targetUserId, 'new-friend-request', {
        from: {
          id: req.user._id,
          name: req.user.name,
          avatar: req.user.avatar
        }
      });
    }

    res.json({
      success: true,
      message: 'Friend request sent',
    });
  })
);

// @route   POST /api/friends/accept/:userId
// @desc    Accept friend request
// @access  Private
router.post(
  '/accept/:userId',
  protect,
  asyncHandler(async (req, res) => {
    const targetUserId = req.params.userId;

    const currentUser = await User.findById(req.user._id);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    // Check if there's actually a request
    if (!currentUser.friendRequests.incoming.includes(targetUserId)) {
      throw new AppError('No friend request from this user', 400);
    }

    await acceptFriendRequest(currentUser, targetUser, res);
  })
);

// Helper function to accept friend request
async function acceptFriendRequest(currentUser, targetUser, res) {
  // Add each other as friends
  currentUser.friends.push(targetUser._id);
  targetUser.friends.push(currentUser._id);

  // Remove from requests
  currentUser.friendRequests.incoming = currentUser.friendRequests.incoming.filter(
    (id) => id.toString() !== targetUser._id.toString()
  );
  targetUser.friendRequests.outgoing = targetUser.friendRequests.outgoing.filter(
    (id) => id.toString() !== currentUser._id.toString()
  );

  await currentUser.save();
  await targetUser.save();

  // Create private chat between them
  await Chat.findOrCreatePrivateChat(currentUser._id, targetUser._id);

  // Socket: Notify both users
  // We need to access io here, so we'll pass req or get it from global if needed, 
  // but simpler to pass `res.req` if available or just use `res.app.get('io')`
  const io = res.app.get('io');
  const socketHelpers = res.app.get('socketHelpers');
  
  if (socketHelpers && io) {
    // Notify sender (current user) - handled by response usually but good for sync
    // Notify target user (who sent the request originally)
    socketHelpers.emitToUser(targetUser._id.toString(), 'friend-request-accepted', {
      by: {
        id: currentUser._id,
        name: currentUser.name,
        avatar: currentUser.avatar
      }
    });

    // Also verify we notify the acceptor if they are on multiple devices? 
    // Usually the frontend handler handles the current user update via state, 
    // but emitting to 'currentUser' room is also good practice.
    socketHelpers.emitToUser(currentUser._id.toString(), 'friend-request-accepted', {
        by: {
             id: targetUser._id,
             name: targetUser.name,
             avatar: targetUser.avatar
        }
    });
  }

  res.json({
    success: true,
    message: 'Friend request accepted',
    friend: {
      id: targetUser._id,
      name: targetUser.name,
      avatar: targetUser.avatar,
      status: targetUser.status,
    },
  });
}

// @route   POST /api/friends/decline/:userId
// @desc    Decline friend request
// @access  Private
router.post(
  '/decline/:userId',
  protect,
  asyncHandler(async (req, res) => {
    const targetUserId = req.params.userId;

    const currentUser = await User.findById(req.user._id);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    // Remove from incoming requests
    currentUser.friendRequests.incoming = currentUser.friendRequests.incoming.filter(
      (id) => id.toString() !== targetUserId
    );
    await currentUser.save();

    // Remove from target's outgoing requests
    targetUser.friendRequests.outgoing = targetUser.friendRequests.outgoing.filter(
      (id) => id.toString() !== req.user._id.toString()
    );
    await targetUser.save();

    res.json({
      success: true,
      message: 'Friend request declined',
    });
  })
);

// @route   POST /api/friends/cancel/:userId
// @desc    Cancel sent friend request
// @access  Private
router.post(
  '/cancel/:userId',
  protect,
  asyncHandler(async (req, res) => {
    const targetUserId = req.params.userId;

    const currentUser = await User.findById(req.user._id);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    // Remove from outgoing requests
    currentUser.friendRequests.outgoing = currentUser.friendRequests.outgoing.filter(
      (id) => id.toString() !== targetUserId
    );
    await currentUser.save();

    // Remove from target's incoming requests
    targetUser.friendRequests.incoming = targetUser.friendRequests.incoming.filter(
      (id) => id.toString() !== req.user._id.toString()
    );
    await targetUser.save();

    res.json({
      success: true,
      message: 'Friend request cancelled',
    });
  })
);

// @route   DELETE /api/friends/:userId
// @desc    Remove friend
// @access  Private
router.delete(
  '/:userId',
  protect,
  asyncHandler(async (req, res) => {
    const targetUserId = req.params.userId;

    const currentUser = await User.findById(req.user._id);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    // Check if they are friends
    if (!currentUser.friends.includes(targetUserId)) {
      throw new AppError('Not friends with this user', 400);
    }

    // Remove from each other's friends list
    currentUser.friends = currentUser.friends.filter(
      (id) => id.toString() !== targetUserId
    );
    targetUser.friends = targetUser.friends.filter(
      (id) => id.toString() !== req.user._id.toString()
    );

    await currentUser.save();
    await targetUser.save();

    res.json({
      success: true,
      message: 'Friend removed',
    });
  })
);

export default router;

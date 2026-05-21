import express from 'express';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// @route   GET /api/groups
// @desc    Get all groups for current user
// @access  Private
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const groups = await Chat.find({
      type: 'group',
      participants: req.user._id,
    })
      .populate('participants', 'name avatar status')
      .populate('admins', 'name avatar')
      .sort({ updatedAt: -1 });

    const formattedGroups = groups.map((group) => ({
      id: group._id,
      name: group.name,
      avatar: group.avatar,
      description: group.description,
      memberCount: group.participants.length,
      isPrivate: group.isPrivate,
      isAdmin: group.isAdmin(req.user._id),
      participants: group.participants,
      admins: group.admins,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));

    res.json({
      success: true,
      groups: formattedGroups,
    });
  })
);

// @route   POST /api/groups
// @desc    Create a new group
// @access  Private
router.post(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const { name, description, avatar, participants = [], isPrivate = false } = req.body;

    if (!name || name.trim().length < 2) {
      throw new AppError('Group name must be at least 2 characters', 400);
    }

    // Validate participants exist
    if (participants.length > 0) {
      const validParticipants = await User.find({
        _id: { $in: participants },
      }).select('_id');

      if (validParticipants.length !== participants.length) {
        throw new AppError('Some participants are invalid', 400);
      }
    }

    const allParticipants = [req.user._id, ...participants];

    const group = await Chat.create({
      type: 'group',
      name: name.trim(),
      description,
      avatar: avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`,
      participants: allParticipants,
      admins: [req.user._id],
      isPrivate,
    });

    // Create system message
    await Message.create({
      chat: group._id,
      sender: req.user._id,
      content: `${req.user.name} created the group "${name}"`,
      type: 'system',
    });

    await group.populate('participants', 'name avatar status');
    await group.populate('admins', 'name avatar');

    await group.populate('participants', 'name avatar status');
    await group.populate('admins', 'name avatar');

    // Socket: Notify all participants
    const io = req.app.get('io');
    const socketHelpers = req.app.get('socketHelpers');
    if (socketHelpers && io) {
        participants.forEach(participantId => {
            socketHelpers.emitToUser(participantId, 'group-created', {
                group: group // Send full group or just minimal
            });
            // Also notify ourselves? The frontend usually handles the optimistically or via response, 
            // but consistency is good.
        });
        // Also emit to ourselves just in case
         socketHelpers.emitToUser(req.user._id, 'group-created', { group });
    }

    res.status(201).json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        avatar: group.avatar,
        description: group.description,
        memberCount: group.participants.length,
        isPrivate: group.isPrivate,
        isAdmin: true,
        participants: group.participants,
        admins: group.admins,
      },
    });
  })
);

// @route   GET /api/groups/:id
// @desc    Get group details
// @access  Private
router.get(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const group = await Chat.findById(req.params.id)
      .populate('participants', 'name avatar status lastSeen bio')
      .populate('admins', 'name avatar');

    if (!group || group.type !== 'group') {
      throw new AppError('Group not found', 404);
    }

    if (!group.isParticipant(req.user._id)) {
      throw new AppError('Not a member of this group', 403);
    }

    res.json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        avatar: group.avatar,
        description: group.description,
        memberCount: group.participants.length,
        isPrivate: group.isPrivate,
        isAdmin: group.isAdmin(req.user._id),
        participants: group.participants,
        admins: group.admins,
        createdAt: group.createdAt,
      },
    });
  })
);

// @route   PUT /api/groups/:id
// @desc    Update group details
// @access  Private (Admin only)
router.put(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const { name, description, avatar, isPrivate } = req.body;

    const group = await Chat.findById(req.params.id);

    if (!group || group.type !== 'group') {
      throw new AppError('Group not found', 404);
    }

    if (!group.isAdmin(req.user._id)) {
      throw new AppError('Only admins can update group settings', 403);
    }

    if (name) {
      if (name.trim().length < 2) {
        throw new AppError('Group name must be at least 2 characters', 400);
      }
      group.name = name.trim();
    }
    if (description !== undefined) group.description = description;
    if (avatar) group.avatar = avatar;
    if (isPrivate !== undefined) group.isPrivate = isPrivate;

    await group.save();
    await group.populate('participants', 'name avatar status');
    await group.populate('admins', 'name avatar');

    res.json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        avatar: group.avatar,
        description: group.description,
        memberCount: group.participants.length,
        isPrivate: group.isPrivate,
        isAdmin: true,
        participants: group.participants,
        admins: group.admins,
      },
    });
  })
);

// @route   POST /api/groups/:id/members
// @desc    Add members to group
// @access  Private (Admin only)
router.post(
  '/:id/members',
  protect,
  asyncHandler(async (req, res) => {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new AppError('Please provide user IDs to add', 400);
    }

    const group = await Chat.findById(req.params.id);

    if (!group || group.type !== 'group') {
      throw new AppError('Group not found', 404);
    }

    if (!group.isAdmin(req.user._id)) {
      throw new AppError('Only admins can add members', 403);
    }

    // Validate users exist
    const validUsers = await User.find({
      _id: { $in: userIds },
    }).select('_id name');

    if (validUsers.length === 0) {
      throw new AppError('No valid users found', 400);
    }

    // Add new members
    const addedUsers = [];
    for (const user of validUsers) {
      if (!group.participants.includes(user._id)) {
        group.participants.push(user._id);
        addedUsers.push(user);
      }
    }

    if (addedUsers.length === 0) {
      throw new AppError('All users are already members', 400);
    }

    await group.save();

    // Create system message
    const userNames = addedUsers.map((u) => u.name).join(', ');
    await Message.create({
      chat: group._id,
      sender: req.user._id,
      content: `${req.user.name} added ${userNames} to the group`,
      type: 'system',
      createdAt: new Date()
    });

    await group.populate('participants', 'name avatar status');

    // Socket: Notify all participants of update AND new members specifically
    const io = req.app.get('io');
    const socketHelpers = req.app.get('socketHelpers');
    if (socketHelpers && io) {
        // Notify existing members + new members
        group.participants.forEach(p => {
             socketHelpers.emitToUser(p._id.toString(), 'group-updated', { groupId: group._id });
        });
        
        // Notify added users specifically they were added? 'group-updated' might be enough if it triggers a fetch
        // But let's send 'added-to-group' for explicit notification if needed
        addedUsers.forEach(u => {
            socketHelpers.emitToUser(u._id.toString(), 'added-to-group', { groupId: group._id });
        });
    }

    res.json({
      success: true,
      message: `Added ${addedUsers.length} member(s)`,
      participants: group.participants,
    });
  })
);

// @route   DELETE /api/groups/:id/members/:userId
// @desc    Remove member from group
// @access  Private (Admin only)
router.delete(
  '/:id/members/:userId',
  protect,
  asyncHandler(async (req, res) => {
    const group = await Chat.findById(req.params.id);

    if (!group || group.type !== 'group') {
      throw new AppError('Group not found', 404);
    }

    if (!group.isAdmin(req.user._id)) {
      throw new AppError('Only admins can remove members', 403);
    }

    const userToRemove = req.params.userId;

    // Can't remove yourself using this endpoint
    if (userToRemove === req.user._id.toString()) {
      throw new AppError('Use leave endpoint to leave the group', 400);
    }

    if (!group.participants.some((p) => p.toString() === userToRemove)) {
      throw new AppError('User is not a member', 400);
    }

    // Remove from participants
    group.participants = group.participants.filter(
      (p) => p.toString() !== userToRemove
    );

    // Remove from admins if applicable
    group.admins = group.admins.filter((a) => a.toString() !== userToRemove);

    await group.save();

    // Create system message
    const removedUser = await User.findById(userToRemove).select('name');
    await Message.create({
      chat: group._id,
      sender: req.user._id,
      content: `${req.user.name} removed ${removedUser?.name || 'a user'} from the group`,
      type: 'system',
    });

    await group.populate('participants', 'name avatar status');

    res.json({
      success: true,
      message: 'Member removed',
      participants: group.participants,
    });
  })
);

// @route   POST /api/groups/:id/admins/:userId
// @desc    Make user an admin
// @access  Private (Admin only)
router.post(
  '/:id/admins/:userId',
  protect,
  asyncHandler(async (req, res) => {
    const group = await Chat.findById(req.params.id);

    if (!group || group.type !== 'group') {
      throw new AppError('Group not found', 404);
    }

    if (!group.isAdmin(req.user._id)) {
      throw new AppError('Only admins can promote members', 403);
    }

    const userId = req.params.userId;

    if (!group.participants.some((p) => p.toString() === userId)) {
      throw new AppError('User is not a member', 400);
    }

    if (group.admins.some((a) => a.toString() === userId)) {
      throw new AppError('User is already an admin', 400);
    }

    group.admins.push(userId);
    await group.save();

    const promotedUser = await User.findById(userId).select('name');
    await Message.create({
      chat: group._id,
      sender: req.user._id,
      content: `${req.user.name} made ${promotedUser?.name || 'a user'} an admin`,
      type: 'system',
    });

    res.json({
      success: true,
      message: 'User promoted to admin',
    });
  })
);

// @route   DELETE /api/groups/:id/admins/:userId
// @desc    Remove admin status
// @access  Private (Admin only)
router.delete(
  '/:id/admins/:userId',
  protect,
  asyncHandler(async (req, res) => {
    const group = await Chat.findById(req.params.id);

    if (!group || group.type !== 'group') {
      throw new AppError('Group not found', 404);
    }

    if (!group.isAdmin(req.user._id)) {
      throw new AppError('Only admins can demote members', 403);
    }

    const userId = req.params.userId;

    if (!group.admins.some((a) => a.toString() === userId)) {
      throw new AppError('User is not an admin', 400);
    }

    if (group.admins.length === 1) {
      throw new AppError('Cannot remove the last admin', 400);
    }

    group.admins = group.admins.filter((a) => a.toString() !== userId);
    await group.save();

    res.json({
      success: true,
      message: 'Admin status removed',
    });
  })
);

// @route   POST /api/groups/:id/leave
// @desc    Leave a group
// @access  Private
router.post(
  '/:id/leave',
  protect,
  asyncHandler(async (req, res) => {
    const group = await Chat.findById(req.params.id);

    if (!group || group.type !== 'group') {
      throw new AppError('Group not found', 404);
    }

    if (!group.isParticipant(req.user._id)) {
      throw new AppError('Not a member of this group', 400);
    }

    // Remove from participants
    group.participants = group.participants.filter(
      (p) => p.toString() !== req.user._id.toString()
    );

    // Remove from admins
    group.admins = group.admins.filter(
      (a) => a.toString() !== req.user._id.toString()
    );

    // If no participants left, delete the group
    if (group.participants.length === 0) {
      await Chat.findByIdAndDelete(req.params.id);
      return res.json({
        success: true,
        message: 'Left group. Group was deleted as it had no members.',
      });
    }

    // If no admins left, assign the first participant as admin
    if (group.admins.length === 0) {
      group.admins.push(group.participants[0]);
    }

    await group.save();

    // Create system message
    await Message.create({
      chat: group._id,
      sender: req.user._id,
      content: `${req.user.name} left the group`,
      type: 'system',
    });

    res.json({
      success: true,
      message: 'Left group successfully',
    });
  })
);

// @route   DELETE /api/groups/:id
// @desc    Delete a group
// @access  Private (Admin only)
router.delete(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const group = await Chat.findById(req.params.id);

    if (!group || group.type !== 'group') {
      throw new AppError('Group not found', 404);
    }

    if (!group.isAdmin(req.user._id)) {
      throw new AppError('Only admins can delete the group', 403);
    }

    // Delete all messages in the group
    await Message.deleteMany({ chat: group._id });

    // Store participants before deleting to notify them
    const participants = group.participants;

    // Delete the group
    await Chat.findByIdAndDelete(req.params.id);

    // Socket: Notify
    const io = req.app.get('io');
    const socketHelpers = req.app.get('socketHelpers');
    if (socketHelpers && io) {
        participants.forEach(p => {
             socketHelpers.emitToUser(p.toString(), 'group-deleted', { groupId: req.params.id });
        });
    }

    res.json({
      success: true,
      message: 'Group deleted successfully',
    });
  })
);

export default router;

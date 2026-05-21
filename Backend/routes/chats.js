import express from 'express';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// @route   GET /api/chats
// @desc    Get all chats for current user
// @access  Private
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const chats = await Chat.find({
      participants: req.user._id,
    })
      .populate('participants', 'name avatar status lastSeen')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'name avatar',
        },
      })
      .sort({ updatedAt: -1 });

    // Format chats for client
    const formattedChats = chats.map((chat) => {
      const chatObj = chat.toObject();

      // For private chats, get the other participant's info
      if (chat.type === 'private') {
        const otherParticipant = chat.participants.find(
          (p) => p._id.toString() !== req.user._id.toString()
        );
        chatObj.name = otherParticipant?.name || 'Unknown User';
        chatObj.avatar = otherParticipant?.avatar;
      }

      // Get user's settings for this chat
      const userSettings = chat.settings.get(req.user._id.toString()) || {
        isMuted: false,
        notifications: true,
      };
      chatObj.isMuted = userSettings.isMuted;
      chatObj.notifications = userSettings.notifications;

      // Calculate unread count (messages after last read)
      chatObj.unreadCount = 0; // Will be calculated separately

      return chatObj;
    });

    res.json({
      success: true,
      chats: formattedChats,
    });
  })
);

// @route   POST /api/chats
// @desc    Create a new chat
// @access  Private
router.post(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const { type, participants, name, avatar, isPrivate } = req.body;

    // Validate type
    if (!['private', 'group'].includes(type)) {
      throw new AppError('Invalid chat type', 400);
    }

    // For private chats
    if (type === 'private') {
      if (!participants || participants.length !== 1) {
        throw new AppError('Private chat requires exactly one other participant', 400);
      }

      const otherUserId = participants[0];

      // Use the static method to find or create
      const chat = await Chat.findOrCreatePrivateChat(req.user._id, otherUserId);

      return res.status(201).json({
        success: true,
        chat,
      });
    }

    // For group chats
    if (type === 'group') {
      if (!name) {
        throw new AppError('Group name is required', 400);
      }

      if (!participants || participants.length < 1) {
        throw new AppError('Group must have at least one other participant', 400);
      }

      const allParticipants = [req.user._id, ...participants];

      const chat = await Chat.create({
        type: 'group',
        name,
        avatar: avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`,
        participants: allParticipants,
        admins: [req.user._id],
        isPrivate: isPrivate || false,
      });

      // Create system message
      await Message.create({
        chat: chat._id,
        sender: req.user._id,
        content: `${req.user.name} created the group "${name}"`,
        type: 'system',
      });

      await chat.populate('participants', 'name avatar status');

      return res.status(201).json({
        success: true,
        chat,
      });
    }
  })
);

// @route   GET /api/chats/:id
// @desc    Get chat by ID
// @access  Private
router.get(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const chat = await Chat.findById(req.params.id)
      .populate('participants', 'name avatar status lastSeen bio')
      .populate('admins', 'name avatar')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'name avatar',
        },
      });

    if (!chat) {
      throw new AppError('Chat not found', 404);
    }

    // Check if user is participant
    if (!chat.isParticipant(req.user._id)) {
      throw new AppError('Not authorized to view this chat', 403);
    }

    res.json({
      success: true,
      chat,
    });
  })
);

// @route   GET /api/chats/:id/messages
// @desc    Get messages for a chat
// @access  Private
router.get(
  '/:id/messages',
  protect,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, before } = req.query;

    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      throw new AppError('Chat not found', 404);
    }

    if (!chat.isParticipant(req.user._id)) {
      throw new AppError('Not authorized to view this chat', 403);
    }

    const messages = await Message.getMessages(req.params.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      before,
    });

    res.json({
      success: true,
      messages,
      page: parseInt(page),
      hasMore: messages.length === parseInt(limit),
    });
  })
);

// @route   PUT /api/chats/:id/mute
// @desc    Toggle mute for a chat
// @access  Private
router.put(
  '/:id/mute',
  protect,
  asyncHandler(async (req, res) => {
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      throw new AppError('Chat not found', 404);
    }

    if (!chat.isParticipant(req.user._id)) {
      throw new AppError('Not authorized', 403);
    }

    const userSettings = chat.settings.get(req.user._id.toString()) || {};
    userSettings.isMuted = !userSettings.isMuted;
    chat.settings.set(req.user._id.toString(), userSettings);
    await chat.save();

    res.json({
      success: true,
      isMuted: userSettings.isMuted,
    });
  })
);

// @route   PUT /api/chats/:id
// @desc    Update chat (group only)
// @access  Private (admin only for groups)
router.put(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const { name, avatar, description, isPrivate } = req.body;

    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      throw new AppError('Chat not found', 404);
    }

    if (chat.type !== 'group') {
      throw new AppError('Cannot update private chats', 400);
    }

    if (!chat.isAdmin(req.user._id)) {
      throw new AppError('Only admins can update group settings', 403);
    }

    if (name) chat.name = name;
    if (avatar) chat.avatar = avatar;
    if (description !== undefined) chat.description = description;
    if (isPrivate !== undefined) chat.isPrivate = isPrivate;

    await chat.save();
    await chat.populate('participants', 'name avatar status');

    res.json({
      success: true,
      chat,
    });
  })
);

// @route   POST /api/chats/:id/leave
// @desc    Leave a group chat
// @access  Private
router.post(
  '/:id/leave',
  protect,
  asyncHandler(async (req, res) => {
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      throw new AppError('Chat not found', 404);
    }

    if (chat.type !== 'group') {
      throw new AppError('Cannot leave private chats', 400);
    }

    if (!chat.isParticipant(req.user._id)) {
      throw new AppError('Not a member of this group', 400);
    }

    // Remove user from participants
    chat.participants = chat.participants.filter(
      (p) => p.toString() !== req.user._id.toString()
    );

    // Remove from admins if applicable
    chat.admins = chat.admins.filter(
      (a) => a.toString() !== req.user._id.toString()
    );

    // If no participants left, delete the chat
    if (chat.participants.length === 0) {
      await Chat.findByIdAndDelete(req.params.id);
      return res.json({
        success: true,
        message: 'Left group. Group was deleted as it had no members.',
      });
    }

    // If no admins left, assign the first participant as admin
    if (chat.admins.length === 0 && chat.participants.length > 0) {
      chat.admins.push(chat.participants[0]);
    }

    await chat.save();

    // Create system message
    await Message.create({
      chat: chat._id,
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

export default router;

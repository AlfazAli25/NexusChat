import express from 'express';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import { protect } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { upload, cloudinary } from '../config/cloudinary.js';

const router = express.Router();

// @route   POST /api/messages
// @desc    Send a new message
// @access  Private
router.post(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const { chatId, content, type = 'text', replyTo } = req.body;

    if (!chatId) {
      throw new AppError('Chat ID is required', 400);
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw new AppError('Chat not found', 404);
    }

    if (!chat.isParticipant(req.user._id)) {
      throw new AppError('Not a participant of this chat', 403);
    }

    const message = await Message.create({
      chat: chatId,
      sender: req.user._id,
      content,
      type,
      replyTo,
    });

    // Update chat's last message
    chat.lastMessage = message._id;
    chat.updatedAt = new Date();
    await chat.save();

    // Populate sender info
    await message.populate('sender', 'name avatar status');
    if (replyTo) {
      await message.populate('replyTo', 'content sender type');
    }

    res.status(201).json({
      success: true,
      message,
    });
  })
);

// @route   POST /api/messages/upload
// @desc    Upload attachments and send message
// @access  Private
router.post(
  '/upload',
  protect,
  upload.array('files', 10), // Max 10 files
  asyncHandler(async (req, res) => {
    const { chatId, content = '', replyTo } = req.body;

    if (!chatId) {
      throw new AppError('Chat ID is required', 400);
    }

    if (!req.files || req.files.length === 0) {
      throw new AppError('No files uploaded', 400);
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      throw new AppError('Chat not found', 404);
    }

    if (!chat.isParticipant(req.user._id)) {
      throw new AppError('Not a participant of this chat', 403);
    }

    // Process uploaded files
    const attachments = req.files.map((file) => ({
      url: file.path,
      publicId: file.filename,
      name: file.originalname,
      type: file.mimetype,
      size: file.size,
    }));

    // Determine message type based on first file
    let type = 'document';
    const firstFile = req.files[0];
    if (firstFile.mimetype.startsWith('image/')) {
      type = 'image';
    } else if (firstFile.mimetype.startsWith('video/')) {
      type = 'video';
    } else if (firstFile.mimetype.startsWith('audio/')) {
      type = 'voice';
    }

    const message = await Message.create({
      chat: chatId,
      sender: req.user._id,
      content,
      type,
      attachments,
      replyTo,
    });

    // Update chat's last message
    chat.lastMessage = message._id;
    chat.updatedAt = new Date();
    await chat.save();

    await message.populate('sender', 'name avatar status');

    res.status(201).json({
      success: true,
      message,
    });
  })
);

// @route   PUT /api/messages/:id
// @desc    Edit a message
// @access  Private
router.put(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content) {
      throw new AppError('Content is required', 400);
    }

    const message = await Message.findById(req.params.id);

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to edit this message', 403);
    }

    // Can only edit text messages
    if (message.type !== 'text') {
      throw new AppError('Can only edit text messages', 400);
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    await message.populate('sender', 'name avatar status');

    res.json({
      success: true,
      message,
    });
  })
);

// @route   DELETE /api/messages/:id
// @desc    Delete a message
// @access  Private
router.delete(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const message = await Message.findById(req.params.id);

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    // Check if sender or chat admin
    const chat = await Chat.findById(message.chat);
    const isSender = message.sender.toString() === req.user._id.toString();
    const isAdmin = chat?.isAdmin(req.user._id);

    if (!isSender && !isAdmin) {
      throw new AppError('Not authorized to delete this message', 403);
    }

    // Delete attachments from Cloudinary
    if (message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        if (attachment.publicId) {
          try {
            await cloudinary.uploader.destroy(attachment.publicId);
          } catch (err) {
            console.error('Error deleting from Cloudinary:', err);
          }
        }
      }
    }

    // Soft delete - mark as deleted
    message.isDeleted = true;
    message.content = 'This message was deleted';
    message.attachments = [];
    await message.save();

    res.json({
      success: true,
      message: 'Message deleted',
    });
  })
);

// @route   POST /api/messages/:id/reaction
// @desc    Add/remove reaction to message
// @access  Private
router.post(
  '/:id/reaction',
  protect,
  asyncHandler(async (req, res) => {
    const { emoji } = req.body;

    if (!emoji) {
      throw new AppError('Emoji is required', 400);
    }

    const message = await Message.findById(req.params.id);

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    // Check if user is in the chat
    const chat = await Chat.findById(message.chat);
    if (!chat || !chat.isParticipant(req.user._id)) {
      throw new AppError('Not authorized', 403);
    }

    // Check if user already has this reaction
    const existingReactionIndex = message.reactions.findIndex(
      (r) =>
        r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existingReactionIndex > -1) {
      // Remove reaction
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Add reaction
      message.reactions.push({
        emoji,
        user: req.user._id,
      });
    }

    await message.save();
    await message.populate('reactions.user', 'name avatar');

    res.json({
      success: true,
      reactions: message.reactions,
    });
  })
);

// @route   POST /api/messages/:id/read
// @desc    Mark message as read
// @access  Private
router.post(
  '/:id/read',
  protect,
  asyncHandler(async (req, res) => {
    const message = await Message.findById(req.params.id);

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    // Check if already read by this user
    const alreadyRead = message.readBy.some(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (!alreadyRead) {
      message.readBy.push({
        user: req.user._id,
        readAt: new Date(),
      });

      // Update status if sender sees it
      if (message.sender.toString() !== req.user._id.toString()) {
        message.status = 'seen';
      }

      await message.save();
    }

    res.json({
      success: true,
    });
  })
);

// @route   POST /api/messages/read-all/:chatId
// @desc    Mark all messages in chat as read
// @access  Private
router.post(
  '/read-all/:chatId',
  protect,
  asyncHandler(async (req, res) => {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      throw new AppError('Chat not found', 404);
    }

    if (!chat.isParticipant(req.user._id)) {
      throw new AppError('Not authorized', 403);
    }

    // Update all unread messages
    await Message.updateMany(
      {
        chat: req.params.chatId,
        sender: { $ne: req.user._id },
        'readBy.user': { $ne: req.user._id },
      },
      {
        $push: {
          readBy: {
            user: req.user._id,
            readAt: new Date(),
          },
        },
        $set: { status: 'seen' },
      }
    );

    res.json({
      success: true,
      message: 'All messages marked as read',
    });
  })
);

export default router;

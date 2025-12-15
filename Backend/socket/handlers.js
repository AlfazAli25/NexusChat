import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';

// Store online users with their socket IDs
const onlineUsers = new Map(); // userId -> Set of socketIds

export const initializeSocket = (io) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`✅ User connected: ${socket.user.name} (${userId})`);

    // Track online status
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Update user status to online
    await User.findByIdAndUpdate(userId, { status: 'online' });

    // Join user's personal room (for direct notifications)
    socket.join(`user:${userId}`);

    // Join all user's chat rooms
    const userChats = await Chat.find({ participants: userId }).select('_id');
    userChats.forEach((chat) => {
      socket.join(`chat:${chat._id}`);
    });

    // Broadcast online status to friends
    const user = await User.findById(userId).populate('friends', '_id');
    user.friends.forEach((friend) => {
      io.to(`user:${friend._id}`).emit('user-status-change', {
        userId,
        status: 'online',
      });
    });

    // ==================== Event Handlers ====================

    // Join a specific chat room
    socket.on('join-chat', async (chatId) => {
      try {
        const chat = await Chat.findById(chatId);
        if (chat && chat.isParticipant(userId)) {
          socket.join(`chat:${chatId}`);
          console.log(`User ${userId} joined chat ${chatId}`);
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Leave a chat room
    socket.on('leave-chat', (chatId) => {
      socket.leave(`chat:${chatId}`);
      console.log(`User ${userId} left chat ${chatId}`);
    });

    // Send a message
    socket.on('send-message', async (data) => {
      try {
        const { chatId, content, type = 'text', replyTo } = data;

        const chat = await Chat.findById(chatId);

        if (!chat || !chat.isParticipant(userId)) {
          return socket.emit('error', { message: 'Not authorized' });
        }

        // Create message
        const message = await Message.create({
          chat: chatId,
          sender: userId,
          content,
          type,
          replyTo,
        });

        // Update chat's last message
        chat.lastMessage = message._id;
        chat.updatedAt = new Date();
        await chat.save();

        // Populate message details
        await message.populate('sender', 'name avatar status');
        if (replyTo) {
          await message.populate('replyTo', 'content sender type');
        }

        // Broadcast to all participants in the chat
        io.to(`chat:${chatId}`).emit('new-message', {
          chatId,
          message: message.toObject(),
        });

        // Update last message for chat list
        io.to(`chat:${chatId}`).emit('chat-updated', {
          chatId,
          lastMessage: message.toObject(),
          updatedAt: chat.updatedAt,
        });

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Edit a message
    socket.on('edit-message', async (data) => {
      try {
        const { messageId, content } = data;

        const message = await Message.findById(messageId);

        if (!message || message.sender.toString() !== userId) {
          return socket.emit('error', { message: 'Not authorized' });
        }

        message.content = content;
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        await message.populate('sender', 'name avatar status');

        io.to(`chat:${message.chat}`).emit('message-edited', {
          chatId: message.chat,
          message: message.toObject(),
        });

      } catch (error) {
        console.error('Edit message error:', error);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // Delete a message
    socket.on('delete-message', async (data) => {
      try {
        const { messageId } = data;

        const message = await Message.findById(messageId);

        if (!message) {
          return socket.emit('error', { message: 'Message not found' });
        }

        const chat = await Chat.findById(message.chat);
        const isSender = message.sender.toString() === userId;
        const isAdmin = chat?.isAdmin(userId);

        if (!isSender && !isAdmin) {
          return socket.emit('error', { message: 'Not authorized' });
        }

        message.isDeleted = true;
        message.content = 'This message was deleted';
        message.attachments = [];
        await message.save();

        io.to(`chat:${message.chat}`).emit('message-deleted', {
          chatId: message.chat,
          messageId,
        });

      } catch (error) {
        console.error('Delete message error:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Add reaction
    socket.on('add-reaction', async (data) => {
      try {
        const { messageId, emoji } = data;

        const message = await Message.findById(messageId);

        if (!message) {
          return socket.emit('error', { message: 'Message not found' });
        }

        const chat = await Chat.findById(message.chat);
        if (!chat || !chat.isParticipant(userId)) {
          return socket.emit('error', { message: 'Not authorized' });
        }

        // Toggle reaction
        const existingIndex = message.reactions.findIndex(
          (r) => r.user.toString() === userId && r.emoji === emoji
        );

        if (existingIndex > -1) {
          message.reactions.splice(existingIndex, 1);
        } else {
          message.reactions.push({ emoji, user: userId });
        }

        await message.save();
        await message.populate('reactions.user', 'name avatar');

        io.to(`chat:${message.chat}`).emit('reaction-updated', {
          chatId: message.chat,
          messageId,
          reactions: message.reactions,
        });

      } catch (error) {
        console.error('Add reaction error:', error);
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });

    // Typing indicator
    socket.on('typing', async (data) => {
      const { chatId } = data;

      socket.to(`chat:${chatId}`).emit('user-typing', {
        chatId,
        userId,
        userName: socket.user.name,
      });
    });

    // Stop typing
    socket.on('stop-typing', async (data) => {
      const { chatId } = data;

      socket.to(`chat:${chatId}`).emit('user-stop-typing', {
        chatId,
        userId,
      });
    });

    // Mark messages as read
    socket.on('mark-read', async (data) => {
      try {
        const { chatId, messageIds } = data;

        if (messageIds && messageIds.length > 0) {
          await Message.updateMany(
            {
              _id: { $in: messageIds },
              sender: { $ne: userId },
            },
            {
              $addToSet: {
                readBy: { user: userId, readAt: new Date() },
              },
              status: 'seen',
            }
          );
        }

        socket.to(`chat:${chatId}`).emit('messages-read', {
          chatId,
          readBy: userId,
          messageIds,
        });

      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // Update user status
    socket.on('update-status', async (data) => {
      try {
        const { status } = data;

        if (!['online', 'away', 'busy'].includes(status)) {
          return;
        }

        await User.findByIdAndUpdate(userId, { status });

        // Broadcast to friends
        const currentUser = await User.findById(userId).populate('friends', '_id');
        currentUser.friends.forEach((friend) => {
          io.to(`user:${friend._id}`).emit('user-status-change', {
            userId,
            status,
          });
        });

      } catch (error) {
        console.error('Update status error:', error);
      }
    });

    // Friend request notification
    socket.on('friend-request', async (data) => {
      const { targetUserId } = data;

      io.to(`user:${targetUserId}`).emit('new-friend-request', {
        from: {
          id: userId,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
      });
    });

    // Friend request accepted
    socket.on('friend-accepted', async (data) => {
      const { targetUserId } = data;

      io.to(`user:${targetUserId}`).emit('friend-request-accepted', {
        by: {
          id: userId,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
      });
    });

    // ==================== Disconnect Handler ====================

    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.user.name} (${userId})`);

      // Remove this socket from user's sockets
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);

        // If no more sockets, user is offline
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);

          // Update status to offline
          await User.findByIdAndUpdate(userId, {
            status: 'offline',
            lastSeen: new Date(),
          });

          // Broadcast offline status to friends
          const user = await User.findById(userId).populate('friends', '_id');
          if (user) {
            user.friends.forEach((friend) => {
              io.to(`user:${friend._id}`).emit('user-status-change', {
                userId,
                status: 'offline',
                lastSeen: new Date(),
              });
            });
          }
        }
      }
    });
  });

  // Return helper functions
  return {
    getOnlineUsers: () => Array.from(onlineUsers.keys()),
    isUserOnline: (userId) => onlineUsers.has(userId),
    emitToUser: (userId, event, data) => {
      io.to(`user:${userId}`).emit(event, data);
    },
    emitToChat: (chatId, event, data) => {
      io.to(`chat:${chatId}`).emit(event, data);
    },
  };
};

export default initializeSocket;

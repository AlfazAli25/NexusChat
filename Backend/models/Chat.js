import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['private', 'group'],
      required: true,
    },
    name: {
      type: String,
      trim: true,
      // Required only for group chats
      required: function () {
        return this.type === 'group';
      },
    },
    avatar: {
      type: String,
      default: function () {
        if (this.type === 'group') {
          return `https://api.dicebear.com/7.x/identicon/svg?seed=${this.name}`;
        }
        return null;
      },
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    settings: {
      type: Map,
      of: new mongoose.Schema(
        {
          isMuted: { type: Boolean, default: false },
          customBackground: { type: String, default: null },
          notifications: { type: Boolean, default: true },
        },
        { _id: false }
      ),
      default: new Map(),
    },
    isPrivate: {
      type: Boolean,
      default: false, // For groups - whether it's invite only
    },
    pinnedMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for faster queries
chatSchema.index({ participants: 1 });
chatSchema.index({ updatedAt: -1 });

// Virtual for unread count (will be calculated per user)
chatSchema.virtual('unreadCount').get(function () {
  return 0; // This is calculated dynamically based on user
});

// Get or create private chat between two users
chatSchema.statics.findOrCreatePrivateChat = async function (userId1, userId2) {
  let chat = await this.findOne({
    type: 'private',
    participants: { $all: [userId1, userId2], $size: 2 },
  }).populate('participants', 'name avatar status');

  if (!chat) {
    chat = await this.create({
      type: 'private',
      participants: [userId1, userId2],
    });
    chat = await chat.populate('participants', 'name avatar status');
  }

  return chat;
};

// Method to check if user is participant
chatSchema.methods.isParticipant = function (userId) {
  return this.participants.some(
    (p) => p._id?.toString() === userId.toString() || p.toString() === userId.toString()
  );
};

// Method to check if user is admin
chatSchema.methods.isAdmin = function (userId) {
  return this.admins.some(
    (a) => a._id?.toString() === userId.toString() || a.toString() === userId.toString()
  );
};

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;

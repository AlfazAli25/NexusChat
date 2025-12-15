import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Socket instance
let socket: Socket | null = null;

// Get auth token
const getToken = (): string | null => {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      return parsed.state?.token || null;
    } catch {
      return null;
    }
  }
  return null;
};

// Connect to socket server
export const connectSocket = (): Socket | null => {
  const token = getToken();

  if (!token) {
    console.warn('No token found, cannot connect to socket');
    return null;
  }

  if (socket) {
    if (!socket.connected) {
      socket.auth = { token };
      socket.connect();
    }
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  // Connection events
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
};

// Disconnect socket
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Get socket instance
export const getSocket = (): Socket | null => {
  if (!socket && getToken()) {
    return connectSocket();
  }
  return socket;
};

// ==================== Socket Event Emitters ====================

export const socketEmit = {
  // Join a chat room
  joinChat: (chatId: string) => {
    socket?.emit('join-chat', chatId);
  },

  // Leave a chat room
  leaveChat: (chatId: string) => {
    socket?.emit('leave-chat', chatId);
  },

  // Send a message
  sendMessage: (data: {
    chatId: string;
    content: string;
    type?: string;
    replyTo?: string;
  }) => {
    socket?.emit('send-message', data);
  },

  // Edit a message
  editMessage: (data: { messageId: string; content: string }) => {
    socket?.emit('edit-message', data);
  },

  // Delete a message
  deleteMessage: (data: { messageId: string }) => {
    socket?.emit('delete-message', data);
  },

  // Add reaction to message
  addReaction: (data: { messageId: string; emoji: string }) => {
    socket?.emit('add-reaction', data);
  },

  // Start typing
  typing: (chatId: string) => {
    socket?.emit('typing', { chatId });
  },

  // Stop typing
  stopTyping: (chatId: string) => {
    socket?.emit('stop-typing', { chatId });
  },

  // Mark messages as read
  markRead: (data: { chatId: string; messageIds: string[] }) => {
    socket?.emit('mark-read', data);
  },

  // Update user status
  updateStatus: (status: 'online' | 'away' | 'busy') => {
    socket?.emit('update-status', { status });
  },

  // Notify about friend request
  friendRequest: (targetUserId: string) => {
    socket?.emit('friend-request', { targetUserId });
  },

  // Notify about accepted friend request
  friendAccepted: (targetUserId: string) => {
    socket?.emit('friend-accepted', { targetUserId });
  },
};

// ==================== Socket Event Listeners ====================

export type MessageHandler = (data: {
  chatId: string;
  message: Message;
}) => void;

export type ChatUpdatedHandler = (data: {
  chatId: string;
  lastMessage: Message;
  updatedAt: Date;
}) => void;

export type MessageEditedHandler = (data: {
  chatId: string;
  message: Message;
}) => void;

export type MessageDeletedHandler = (data: {
  chatId: string;
  messageId: string;
}) => void;

export type ReactionHandler = (data: {
  chatId: string;
  messageId: string;
  reactions: Reaction[];
}) => void;

export type TypingHandler = (data: {
  chatId: string;
  userId: string;
  userName: string;
}) => void;

export type StopTypingHandler = (data: {
  chatId: string;
  userId: string;
}) => void;

export type MessagesReadHandler = (data: {
  chatId: string;
  readBy: string;
  messageIds: string[];
}) => void;

export type StatusChangeHandler = (data: {
  userId: string;
  status: string;
  lastSeen?: Date;
}) => void;

export type FriendRequestHandler = (data: {
  from: {
    id: string;
    name: string;
    avatar: string;
  };
}) => void;

export type FriendAcceptedHandler = (data: {
  by: {
    id: string;
    name: string;
    avatar: string;
  };
}) => void;

// Event subscription helpers
export const socketOn = {
  // New message received
  onNewMessage: (handler: MessageHandler) => {
    socket?.on('new-message', handler);
    return () => socket?.off('new-message', handler);
  },

  // Chat updated (new last message)
  onChatUpdated: (handler: ChatUpdatedHandler) => {
    socket?.on('chat-updated', handler);
    return () => socket?.off('chat-updated', handler);
  },

  // Message edited
  onMessageEdited: (handler: MessageEditedHandler) => {
    socket?.on('message-edited', handler);
    return () => socket?.off('message-edited', handler);
  },

  // Message deleted
  onMessageDeleted: (handler: MessageDeletedHandler) => {
    socket?.on('message-deleted', handler);
    return () => socket?.off('message-deleted', handler);
  },

  // Reaction updated
  onReactionUpdated: (handler: ReactionHandler) => {
    socket?.on('reaction-updated', handler);
    return () => socket?.off('reaction-updated', handler);
  },

  // User typing
  onUserTyping: (handler: TypingHandler) => {
    socket?.on('user-typing', handler);
    return () => socket?.off('user-typing', handler);
  },

  // User stopped typing
  onUserStopTyping: (handler: StopTypingHandler) => {
    socket?.on('user-stop-typing', handler);
    return () => socket?.off('user-stop-typing', handler);
  },

  // Messages read
  onMessagesRead: (handler: MessagesReadHandler) => {
    socket?.on('messages-read', handler);
    return () => socket?.off('messages-read', handler);
  },

  // User status change
  onUserStatusChange: (handler: StatusChangeHandler) => {
    socket?.on('user-status-change', handler);
    return () => socket?.off('user-status-change', handler);
  },

  // New friend request
  onNewFriendRequest: (handler: FriendRequestHandler) => {
    socket?.on('new-friend-request', handler);
    return () => socket?.off('new-friend-request', handler);
  },

  // Friend request accepted
  onFriendRequestAccepted: (handler: FriendAcceptedHandler) => {
    socket?.on('friend-request-accepted', handler);
    return () => socket?.off('friend-request-accepted', handler);
  },
};

// ==================== Types ====================

interface Message {
  id: string;
  _id?: string;
  chat: string;
  sender: {
    _id: string;
    name: string;
    avatar: string;
    status: string;
  };
  content: string;
  type: string;
  status: string;
  reactions: Reaction[];
  replyTo?: Message;
  isEdited: boolean;
  attachments?: {
    url: string;
    name: string;
    type: string;
    size: number;
  }[];
  createdAt: Date;
}

interface Reaction {
  emoji: string;
  user: {
    _id: string;
    name: string;
    avatar: string;
  };
}

export default {
  connect: connectSocket,
  disconnect: disconnectSocket,
  getSocket,
  emit: socketEmit,
  on: socketOn,
};

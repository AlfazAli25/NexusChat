import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Socket instance
let socket: Socket | null = null;

type SocketStatusListener = (connected: boolean) => void;
const socketStatusListeners = new Set<SocketStatusListener>();

const notifySocketStatus = (connected: boolean) => {
  socketStatusListeners.forEach((listener) => listener(connected));
};

export const onSocketStatusChange = (listener: SocketStatusListener) => {
  socketStatusListeners.add(listener);
  return () => socketStatusListeners.delete(listener);
};

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
export const connectSocket = (token?: string | null): Socket | null => {
  const authToken = token || getToken();

  if (!authToken) {
    console.warn('No token found, cannot connect to socket');
    return null;
  }

  if (socket) {
    if (!socket.connected) {
      socket.auth = { token: authToken };
      socket.connect();
    }
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token: authToken },
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
    notifySocketStatus(true);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
    notifySocketStatus(false);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    notifySocketStatus(false);
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
    notifySocketStatus(false);
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
    const activeSocket = getSocket();
    activeSocket?.emit('join-chat', chatId);
  },

  // Leave a chat room
  leaveChat: (chatId: string) => {
    const activeSocket = getSocket();
    activeSocket?.emit('leave-chat', chatId);
  },

  // Send a message
  sendMessage: (data: {
    chatId: string;
    content: string;
    type?: string;
    replyTo?: string;
  }) => {
    const activeSocket = getSocket();
    activeSocket?.emit('send-message', data);
  },

  // Edit a message
  editMessage: (data: { messageId: string; content: string }) => {
    const activeSocket = getSocket();
    activeSocket?.emit('edit-message', data);
  },

  // Delete a message
  deleteMessage: (data: { messageId: string }) => {
    const activeSocket = getSocket();
    activeSocket?.emit('delete-message', data);
  },

  // Add reaction to message
  addReaction: (data: { messageId: string; emoji: string }) => {
    const activeSocket = getSocket();
    activeSocket?.emit('add-reaction', data);
  },

  // Start typing
  typing: (chatId: string) => {
    const activeSocket = getSocket();
    activeSocket?.emit('typing', { chatId });
  },

  // Stop typing
  stopTyping: (chatId: string) => {
    const activeSocket = getSocket();
    activeSocket?.emit('stop-typing', { chatId });
  },

  // Mark messages as read
  markRead: (data: { chatId: string; messageIds: string[] }) => {
    const activeSocket = getSocket();
    activeSocket?.emit('mark-read', data);
  },

  // Update user status
  updateStatus: (status: 'online' | 'away' | 'busy') => {
    const activeSocket = getSocket();
    activeSocket?.emit('update-status', { status });
  },

  // Notify about friend request
  friendRequest: (targetUserId: string) => {
    const activeSocket = getSocket();
    activeSocket?.emit('friend-request', { targetUserId });
  },

  // Notify about accepted friend request
  friendAccepted: (targetUserId: string) => {
    const activeSocket = getSocket();
    activeSocket?.emit('friend-accepted', { targetUserId });
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
    const activeSocket = getSocket();
    activeSocket?.on('new-message', handler);
    return () => activeSocket?.off('new-message', handler);
  },

  // Chat updated (new last message)
  onChatUpdated: (handler: ChatUpdatedHandler) => {
    const activeSocket = getSocket();
    activeSocket?.on('chat-updated', handler);
    return () => activeSocket?.off('chat-updated', handler);
  },

  // Message edited
  onMessageEdited: (handler: MessageEditedHandler) => {
    const activeSocket = getSocket();
    activeSocket?.on('message-edited', handler);
    return () => activeSocket?.off('message-edited', handler);
  },

  // Message deleted
  onMessageDeleted: (handler: MessageDeletedHandler) => {
    const activeSocket = getSocket();
    activeSocket?.on('message-deleted', handler);
    return () => activeSocket?.off('message-deleted', handler);
  },

  // Reaction updated
  onReactionUpdated: (handler: ReactionHandler) => {
    const activeSocket = getSocket();
    activeSocket?.on('reaction-updated', handler);
    return () => activeSocket?.off('reaction-updated', handler);
  },

  // User typing
  onUserTyping: (handler: TypingHandler) => {
    const activeSocket = getSocket();
    activeSocket?.on('user-typing', handler);
    return () => activeSocket?.off('user-typing', handler);
  },

  // User stopped typing
  onUserStopTyping: (handler: StopTypingHandler) => {
    const activeSocket = getSocket();
    activeSocket?.on('user-stop-typing', handler);
    return () => activeSocket?.off('user-stop-typing', handler);
  },

  // Messages read
  onMessagesRead: (handler: MessagesReadHandler) => {
    const activeSocket = getSocket();
    activeSocket?.on('messages-read', handler);
    return () => activeSocket?.off('messages-read', handler);
  },

  // User status change
  onUserStatusChange: (handler: StatusChangeHandler) => {
    const activeSocket = getSocket();
    activeSocket?.on('user-status-change', handler);
    return () => activeSocket?.off('user-status-change', handler);
  },

  // New friend request
  onNewFriendRequest: (handler: FriendRequestHandler) => {
    const activeSocket = getSocket();
    activeSocket?.on('new-friend-request', handler);
    return () => activeSocket?.off('new-friend-request', handler);
  },

  // Friend request accepted
  onFriendRequestAccepted: (handler: FriendAcceptedHandler) => {
    const activeSocket = getSocket();
    activeSocket?.on('friend-request-accepted', handler);
    return () => activeSocket?.off('friend-request-accepted', handler);
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

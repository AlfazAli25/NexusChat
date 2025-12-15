import { create } from 'zustand';
import { chatsApi, messagesApi, friendsApi, Chat, Message, User, Friend as ApiFriend } from '@/lib/api';
import { socketEmit, socketOn, getSocket } from '@/lib/socket';

// Re-export Friend type from API with additional fields if needed
export interface Friend {
  id: string;
  _id?: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen?: Date;
  bio?: string;
}

interface ChatState {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Record<string, Message[]>;
  friends: Friend[];
  typingUsers: Record<string, string[]>; // chatId -> userNames
  isLoading: boolean;
  error: string | null;

  // Chat actions
  fetchChats: () => Promise<void>;
  setActiveChat: (chat: Chat | null) => void;
  fetchMessages: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, content: string, currentUser: User, type?: Message['type'], replyToId?: string) => Promise<void>;
  sendAttachment: (chatId: string, files: File[]) => Promise<void>;
  editMessage: (chatId: string, messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  addReaction: (chatId: string, messageId: string, emoji: string, userId: string) => Promise<void>;
  toggleMute: (chatId: string) => Promise<void>;
  markAsRead: (chatId: string) => Promise<void>;

  startDirectChat: (friendId: string) => Promise<Chat>;

  // Friends actions
  fetchFriends: () => Promise<void>;

  // Socket handlers
  handleNewMessage: (data: { chatId: string; message: Message }) => void;
  handleMessageEdited: (data: { chatId: string; message: Message }) => void;
  handleMessageDeleted: (data: { chatId: string; messageId: string }) => void;
  handleTyping: (chatId: string, userName: string) => void;
  handleStopTyping: (chatId: string, userId: string) => void;
  handleUserStatusChange: (userId: string, status: string) => void;
  handleNewFriendRequest: (data: any) => void;
  handleFriendRequestAccepted: (data: any) => void;
  handleGroupEvent: () => void;

  // Typing
  setTyping: (chatId: string, isTyping: boolean) => void;

  // Initialize socket listeners
  initSocketListeners: () => () => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChat: null,
  messages: {},
  friends: [],
  typingUsers: {},
  isLoading: false,
  error: null,

  fetchChats: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await chatsApi.getChats();
      set({ chats: response.chats, isLoading: false });

      // Join socket rooms for all chats
      response.chats.forEach((chat) => {
        socketEmit.joinChat(chat.id || chat._id!);
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch chats',
        isLoading: false,
      });
    }
  },

  setActiveChat: (chat) => {
    set({ activeChat: chat });

    if (chat) {
      // Mark messages as read
      get().markAsRead(chat.id || chat._id!);

      // Fetch messages if not already loaded
      const chatId = chat.id || chat._id!;
      if (!get().messages[chatId]) {
        get().fetchMessages(chatId);
      }
    }
  },

  fetchMessages: async (chatId: string) => {
    try {
      const response = await chatsApi.getMessages(chatId);
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: response.messages,
        },
      }));
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  },

  sendMessage: async (chatId, content, currentUser, type = 'text', replyToId) => {
    try {
      // Optimistic update
      const user = currentUser;
      if (!user) throw new Error('User not authenticated');

      let replyToMessage;
      if (replyToId) {
        replyToMessage = get().messages[chatId]?.find(m => (m.id || m._id) === replyToId);
      }

      const tempId = `temp-${Date.now()}`;
      const tempMessage: Message = {
        id: tempId,
        _id: tempId,
        chat: chatId,
        content,
        type,
        sender: {
          id: user.id || user._id!,
          _id: user._id,
          name: user.name,
          avatar: user.avatar,
          email: user.email,
          status: user.status,
        },
        reactions: [],
        replyTo: replyToMessage,
        createdAt: new Date(),
        isEdited: false,
        status: 'sent',
      };

      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: [...(state.messages[chatId] || []), tempMessage],
        },
        chats: state.chats.map((chat) =>
          (chat.id || chat._id) === chatId
            ? {
              ...chat,
              lastMessage: tempMessage,
            }
            : chat
        ),
      }));

      // Use socket for real-time sending
      socketEmit.sendMessage({ chatId, content, type, replyTo: replyToId });

      // Stop typing indicator
      socketEmit.stopTyping(chatId);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Ideally remove the temp message here if it fails
      throw error;
    }
  },

  sendAttachment: async (chatId, files) => {
    try {
      await messagesApi.sendWithAttachments(chatId, files);
    } catch (error) {
      console.error('Failed to send attachment:', error);
      throw error;
    }
  },

  editMessage: async (chatId, messageId, newContent) => {
    try {
      await messagesApi.editMessage(messageId, newContent);

      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: state.messages[chatId]?.map((msg) =>
            (msg.id || msg._id) === messageId
              ? { ...msg, content: newContent, isEdited: true }
              : msg
          ),
        },
      }));
    } catch (error) {
      console.error('Failed to edit message:', error);
      throw error;
    }
  },

  deleteMessage: async (chatId, messageId) => {
    try {
      const currentMessages = get().messages[chatId];
      const targetMessage = currentMessages?.find(m => (m.id || m._id) === messageId);

      // If already deleted, remove it from view ("hard delete" for local user)
      if (targetMessage && targetMessage.isDeleted) {
        set((state) => ({
          messages: {
            ...state.messages,
            [chatId]: state.messages[chatId]?.filter(
              (msg) => (msg.id || msg._id) !== messageId
            ),
          },
        }));
        return;
      }

      // Common update logic for both temp and real messages
      const updateState = (state: ChatState) => ({
        messages: {
          ...state.messages,
          [chatId]: state.messages[chatId]?.map((msg) =>
            (msg.id || msg._id) === messageId
              ? { ...msg, content: 'This message was deleted', isDeleted: true }
              : msg
          ),
        },
      });

      // If it's a temp message, just update locally
      if (messageId.startsWith('temp-')) {
        set(updateState);
        return;
      }

      await messagesApi.deleteMessage(messageId);

      set(updateState);
    } catch (error) {
      console.error('Failed to delete message:', error);
      throw error;
    }
  },

  addReaction: async (chatId, messageId, emoji, userId) => {
    try {
      socketEmit.addReaction({ messageId, emoji });
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  },

  toggleMute: async (chatId) => {
    try {
      const response = await chatsApi.toggleMute(chatId);

      set((state) => ({
        chats: state.chats.map((chat) =>
          (chat.id || chat._id) === chatId
            ? { ...chat, isMuted: response.isMuted }
            : chat
        ),
        activeChat:
          state.activeChat && (state.activeChat.id || state.activeChat._id) === chatId
            ? { ...state.activeChat, isMuted: response.isMuted }
            : state.activeChat,
      }));
    } catch (error) {
      console.error('Failed to toggle mute:', error);
    }
  },

  markAsRead: async (chatId) => {
    try {
      await messagesApi.markAllAsRead(chatId);

      set((state) => ({
        chats: state.chats.map((chat) =>
          (chat.id || chat._id) === chatId ? { ...chat, unreadCount: 0 } : chat
        ),
      }));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  },



  startDirectChat: async (friendId: string) => {
    try {
      console.log('Starting direct chat with:', friendId);
      // 1. Check if we already have a private chat with this friend
      const existingChat = get().chats.find(
        (c) =>
          c.type === 'private' &&
          c.participants.some((p) => (p.id || p._id) === friendId)
      );

      if (existingChat) {
        console.log('Found existing chat:', existingChat.id);
        get().setActiveChat(existingChat);
        return existingChat;
      }

      console.log('Creating new private chat...');
      // 2. If not, create a new one (backend handles findOrCreate)
      const response = await chatsApi.createPrivateChat(friendId);
      const newChat = response.chat;
      console.log('New chat created:', newChat.id);

      set((state) => {
        // Avoid duplicates if socket event came in parallel
        if (state.chats.some(c => (c.id || c._id) === (newChat.id || newChat._id))) {
          return {};
        }
        return {
          chats: [newChat, ...state.chats]
        };
      });

      // 3. Set as active
      get().setActiveChat(newChat);

      // 4. Join socket room
      socketEmit.joinChat(newChat.id || newChat._id!);

      return newChat;

    } catch (error) {
      console.error('Failed to start direct chat:', error);
      throw error; // Let caller handle/show toast
    }
  },

  fetchFriends: async () => {
    try {
      const response = await friendsApi.getFriends();
      set({
        friends: response.friends.map((f) => ({
          id: f.id || f._id!,
          _id: f._id,
          name: f.name,
          avatar: f.avatar,
          status: f.status,
          lastSeen: f.lastSeen,
          bio: f.bio,
        })),
      });
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    }
  },

  // Socket event handlers
  handleNewMessage: (data) => {
    const { chatId, message } = data;

    set((state) => {
      const currentMessages = state.messages[chatId] || [];

      // Check if we have a temporary message that matches this one (optimistic update)
      // We look for a temp message with the same content and sender from the current user
      const filteredMessages = currentMessages.filter(msg => {
        const isTemp = (msg.id || msg._id || '').startsWith('temp-');
        const isSameContent = msg.content === message.content;
        // Basic deduplication - if it looks like the same message but temp, remove it
        if (isTemp && isSameContent && msg.sender.id === message.sender.id) {
          return false;
        }
        // Also avoid strict duplicates by ID if socket sends it twice
        if ((msg.id || msg._id) === (message.id || message._id)) {
          return false;
        }
        return true;
      });

      return {
        messages: {
          ...state.messages,
          [chatId]: [...filteredMessages, message],
        },
        chats: state.chats.map((chat) =>
          (chat.id || chat._id) === chatId
            ? {
              ...chat,
              lastMessage: message,
              unreadCount:
                state.activeChat && (state.activeChat.id || state.activeChat._id) === chatId
                  ? 0
                  : chat.unreadCount + 1,
            }
            : chat
        ),
      };
    });
  },

  handleMessageEdited: (data) => {
    const { chatId, message } = data;

    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: state.messages[chatId]?.map((msg) =>
          (msg.id || msg._id) === (message.id || message._id) ? message : msg
        ),
      },
    }));
  },

  handleMessageDeleted: (data) => {
    const { chatId, messageId } = data;

    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: state.messages[chatId]?.map((msg) =>
          (msg.id || msg._id) === messageId
            ? { ...msg, content: 'This message was deleted', isDeleted: true }
            : msg
        ),
      },
    }));
  },

  handleTyping: (chatId, userName) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [chatId]: [...new Set([...(state.typingUsers[chatId] || []), userName])],
      },
    }));

    // Auto-remove after 3 seconds
    setTimeout(() => {
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [chatId]: (state.typingUsers[chatId] || []).filter((n) => n !== userName),
        },
      }));
    }, 3000);
  },

  handleStopTyping: (chatId, userId) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [chatId]: (state.typingUsers[chatId] || []).filter((_, i) => i !== 0), // Just remove first occurrence
      },
    }));
  },

  handleUserStatusChange: (userId, status) => {
    set((state) => ({
      friends: state.friends.map((friend) =>
        (friend.id || friend._id) === userId
          ? { ...friend, status: status as Friend['status'] }
          : friend
      ),
      chats: state.chats.map((chat) => ({
        ...chat,
        participants: chat.participants?.map((p) =>
          (p.id || p._id) === userId ? { ...p, status: status as User['status'] } : p
        ),
      })),
    }));
  },

  handleNewFriendRequest: (data) => {
    // Optional: Toast handled by NotificationListener or separate component
    // We could trigger a fetch here if we had a requests list in store
  },

  handleFriendRequestAccepted: (data) => {
    get().fetchFriends();
    get().fetchChats(); // Also fetch chats as a new DM might have been created
  },

  handleGroupEvent: () => {
    get().fetchChats();
  },

  setTyping: (chatId, isTyping) => {
    if (isTyping) {
      socketEmit.typing(chatId);
    } else {
      socketEmit.stopTyping(chatId);
    }
  },

  initSocketListeners: () => {
    const unsubscribers: (() => void)[] = [];

    // New message
    unsubscribers.push(
      socketOn.onNewMessage((data) => {
        get().handleNewMessage(data as any);
      })
    );

    // Message edited
    unsubscribers.push(
      socketOn.onMessageEdited((data) => {
        get().handleMessageEdited(data as any);
      })
    );

    // Message deleted
    unsubscribers.push(
      socketOn.onMessageDeleted((data) => {
        get().handleMessageDeleted(data);
      })
    );

    // User typing
    unsubscribers.push(
      socketOn.onUserTyping((data) => {
        get().handleTyping(data.chatId, data.userName);
      })
    );

    // User stop typing
    unsubscribers.push(
      socketOn.onUserStopTyping((data) => {
        get().handleStopTyping(data.chatId, data.userId);
      })
    );

    // User status change
    unsubscribers.push(
      socketOn.onUserStatusChange((data) => {
        get().handleUserStatusChange(data.userId, data.status);
      })
    );

    // Friend Request
    unsubscribers.push(
      socketOn.onNewFriendRequest((data) => {
        get().handleNewFriendRequest(data);
      })
    );

    // Friend Accepted
    unsubscribers.push(
      socketOn.onFriendRequestAccepted((data) => {
        get().handleFriendRequestAccepted(data);
      })
    );

    // Group Events - we can listen to specific events or just generic updates if backend emits them
    // Assuming we'll add 'chat-created', 'chat-updated' etc. or reuse specific names
    // For now, let's assume we use a generic 'chat-list-update' or specific group events if we define them

    // Note: We need to add these to socket.ts to be type safe, or just use raw socket
    // For now, let's use the pattern:
    const socket = getSocket();
    if (socket) {
      const handleGroupUpdate = () => get().handleGroupEvent();

      socket.on('group-created', handleGroupUpdate);
      socket.on('group-updated', handleGroupUpdate);
      socket.on('group-deleted', handleGroupUpdate);
      socket.on('added-to-group', handleGroupUpdate);

      unsubscribers.push(() => {
        socket.off('group-created', handleGroupUpdate);
        socket.off('group-updated', handleGroupUpdate);
        socket.off('group-deleted', handleGroupUpdate);
        socket.off('added-to-group', handleGroupUpdate);
      });
    }

    // Return cleanup function
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  },

  reset: () => {
    set({
      chats: [],
      activeChat: null,
      messages: {},
      friends: [],
      typingUsers: {},
      error: null,
      isLoading: false,
    });
  },
}));

// Re-export types
export type { Chat, Message };


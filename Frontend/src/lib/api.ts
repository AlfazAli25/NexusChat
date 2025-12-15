// API Configuration and Helper Functions

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Get auth token from localStorage
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

// Create headers with authentication
const getHeaders = (includeAuth = true): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const config: RequestInit = {
    ...options,
    headers: {
      ...getHeaders(!options.headers),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error');
  }
}

// ==================== Auth API ====================

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{
      success: boolean;
      token: string;
      user: User;
      message: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  signup: (name: string, email: string, password: string) =>
    apiRequest<{
      success: boolean;
      token: string;
      user: User;
      message: string;
    }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  logout: () =>
    apiRequest<{ success: boolean; message: string }>('/auth/logout', {
      method: 'POST',
    }),

  getMe: () =>
    apiRequest<{
      success: boolean;
      user: User;
    }>('/auth/me'),

  forgotPassword: (email: string) =>
    apiRequest<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    apiRequest<{
      success: boolean;
      token: string;
      user: User;
      message: string;
    }>(`/auth/reset-password/${token}`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
};

// ==================== Users API ====================

export const usersApi = {
  getUser: (userId: string) =>
    apiRequest<{ success: boolean; user: User }>(`/users/${userId}`),

  searchUsers: (query: string) =>
    apiRequest<{ success: boolean; users: User[] }>(
      `/users/search?q=${encodeURIComponent(query)}`
    ),

  updateProfile: (data: { name?: string; bio?: string }) =>
    apiRequest<{ success: boolean; user: User; message: string }>(
      '/users/profile',
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    ),

  updateStatus: (status: 'online' | 'offline' | 'away' | 'busy') =>
    apiRequest<{ success: boolean; status: string }>('/users/status', {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  updateAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);

    const token = getToken();
    const response = await fetch(`${API_URL}/users/avatar`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    return response.json();
  },

  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ success: boolean; message: string }>('/users/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// ==================== Friends API ====================

export const friendsApi = {
  getFriends: () =>
    apiRequest<{ success: boolean; friends: Friend[] }>('/friends'),

  getRequests: () =>
    apiRequest<{
      success: boolean;
      incoming: User[];
      outgoing: User[];
    }>('/friends/requests'),

  sendRequest: (userId: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `/friends/request/${userId}`,
      { method: 'POST' }
    ),

  acceptRequest: (userId: string) =>
    apiRequest<{ success: boolean; friend: Friend; message: string }>(
      `/friends/accept/${userId}`,
      { method: 'POST' }
    ),

  declineRequest: (userId: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `/friends/decline/${userId}`,
      { method: 'POST' }
    ),

  cancelRequest: (userId: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `/friends/cancel/${userId}`,
      { method: 'POST' }
    ),

  removeFriend: (userId: string) =>
    apiRequest<{ success: boolean; message: string }>(`/friends/${userId}`, {
      method: 'DELETE',
    }),
};

// ==================== Chats API ====================

export const chatsApi = {
  getChats: () =>
    apiRequest<{ success: boolean; chats: Chat[] }>('/chats'),

  getChat: (chatId: string) =>
    apiRequest<{ success: boolean; chat: Chat }>(`/chats/${chatId}`),

  createPrivateChat: (participantId: string) =>
    apiRequest<{ success: boolean; chat: Chat }>('/chats', {
      method: 'POST',
      body: JSON.stringify({
        type: 'private',
        participants: [participantId],
      }),
    }),

  createGroupChat: (
    name: string,
    participants: string[],
    isPrivate = false
  ) =>
    apiRequest<{ success: boolean; chat: Chat }>('/chats', {
      method: 'POST',
      body: JSON.stringify({
        type: 'group',
        name,
        participants,
        isPrivate,
      }),
    }),

  getMessages: (chatId: string, page = 1, limit = 50) =>
    apiRequest<{
      success: boolean;
      messages: Message[];
      page: number;
      hasMore: boolean;
    }>(`/chats/${chatId}/messages?page=${page}&limit=${limit}`),

  toggleMute: (chatId: string) =>
    apiRequest<{ success: boolean; isMuted: boolean }>(`/chats/${chatId}/mute`, {
      method: 'PUT',
    }),

  leaveChat: (chatId: string) =>
    apiRequest<{ success: boolean; message: string }>(`/chats/${chatId}/leave`, {
      method: 'POST',
    }),
};

// ==================== Messages API ====================

export const messagesApi = {
  sendMessage: (chatId: string, content: string, replyTo?: string) =>
    apiRequest<{ success: boolean; message: Message }>('/messages', {
      method: 'POST',
      body: JSON.stringify({ chatId, content, replyTo }),
    }),

  sendWithAttachments: async (
    chatId: string,
    files: File[],
    content = ''
  ) => {
    const formData = new FormData();
    formData.append('chatId', chatId);
    formData.append('content', content);
    files.forEach((file) => formData.append('files', file));

    const token = getToken();
    const response = await fetch(`${API_URL}/messages/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    return response.json();
  },

  editMessage: (messageId: string, content: string) =>
    apiRequest<{ success: boolean; message: Message }>(
      `/messages/${messageId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ content }),
      }
    ),

  deleteMessage: (messageId: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `/messages/${messageId}`,
      { method: 'DELETE' }
    ),

  addReaction: (messageId: string, emoji: string) =>
    apiRequest<{ success: boolean; reactions: Reaction[] }>(
      `/messages/${messageId}/reaction`,
      {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      }
    ),

  markAsRead: (messageId: string) =>
    apiRequest<{ success: boolean }>(`/messages/${messageId}/read`, {
      method: 'POST',
    }),

  markAllAsRead: (chatId: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `/messages/read-all/${chatId}`,
      { method: 'POST' }
    ),
};

// ==================== Groups API ====================

export const groupsApi = {
  getGroups: () =>
    apiRequest<{ success: boolean; groups: Group[] }>('/groups'),

  getGroup: (groupId: string) =>
    apiRequest<{ success: boolean; group: Group }>(`/groups/${groupId}`),

  createGroup: (
    name: string,
    participants: string[],
    description?: string,
    isPrivate = false
  ) =>
    apiRequest<{ success: boolean; group: Group }>('/groups', {
      method: 'POST',
      body: JSON.stringify({ name, participants, description, isPrivate }),
    }),

  updateGroup: (
    groupId: string,
    data: { name?: string; description?: string; isPrivate?: boolean }
  ) =>
    apiRequest<{ success: boolean; group: Group }>(`/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  addMembers: (groupId: string, userIds: string[]) =>
    apiRequest<{ success: boolean; participants: User[]; message: string }>(
      `/groups/${groupId}/members`,
      {
        method: 'POST',
        body: JSON.stringify({ userIds }),
      }
    ),

  removeMember: (groupId: string, userId: string) =>
    apiRequest<{ success: boolean; participants: User[]; message: string }>(
      `/groups/${groupId}/members/${userId}`,
      { method: 'DELETE' }
    ),

  makeAdmin: (groupId: string, userId: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `/groups/${groupId}/admins/${userId}`,
      { method: 'POST' }
    ),

  removeAdmin: (groupId: string, userId: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `/groups/${groupId}/admins/${userId}`,
      { method: 'DELETE' }
    ),

  leaveGroup: (groupId: string) =>
    apiRequest<{ success: boolean; message: string }>(
      `/groups/${groupId}/leave`,
      { method: 'POST' }
    ),

  deleteGroup: (groupId: string) =>
    apiRequest<{ success: boolean; message: string }>(`/groups/${groupId}`, {
      method: 'DELETE',
    }),
};

// ==================== Types ====================

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  avatar: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  bio?: string;
  lastSeen?: Date;
  isFriend?: boolean;
}

export interface Friend extends User {
  lastSeen?: Date;
}

export interface Chat {
  id: string;
  _id?: string;
  type: 'private' | 'group';
  name: string;
  avatar: string;
  participants: User[];
  admins?: User[];
  lastMessage?: Message;
  unreadCount: number;
  isMuted: boolean;
  isPrivate?: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  _id?: string;
  chat: string;
  sender: User;
  content: string;
  type: 'text' | 'image' | 'video' | 'document' | 'voice' | 'system';
  status: 'sent' | 'delivered' | 'seen';
  reactions: Reaction[];
  replyTo?: Message;
  isEdited: boolean;
  isDeleted?: boolean;
  attachments?: Attachment[];
  createdAt: Date;
}

export interface Reaction {
  emoji: string;
  user: User;
}

export interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface Group {
  id: string;
  _id?: string;
  name: string;
  avatar: string;
  description?: string;
  memberCount: number;
  isPrivate: boolean;
  isAdmin: boolean;
  participants: User[];
  admins: User[];
  createdAt: Date;
  updatedAt: Date;
}

export default {
  auth: authApi,
  users: usersApi,
  friends: friendsApi,
  chats: chatsApi,
  messages: messagesApi,
  groups: groupsApi,
};

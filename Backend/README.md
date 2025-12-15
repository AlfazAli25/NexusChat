# NexusChat Backend

A real-time chat application backend built with Node.js, Express, Socket.IO, and MongoDB.

## Features

- 🔐 **Authentication**: JWT-based authentication with signup, login, and password reset
- 💬 **Real-time Messaging**: Socket.IO for instant message delivery
- 👥 **Friends System**: Send, accept, and manage friend requests
- 🏠 **Groups**: Create and manage group chats with admin controls
- 📎 **File Uploads**: Image, video, and document attachments via Cloudinary
- ✉️ **Email**: Password reset emails via Nodemailer

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account (for file uploads)
- Email account for SMTP (Gmail, etc.)

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   
   Edit `.env` file with your credentials:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/nexuschat
   JWT_SECRET=your_secure_secret_key
   CLIENT_URL=http://localhost:5173
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   # Email (Gmail example)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   EMAIL_FROM=NexusChat <noreply@nexuschat.com>
   ```

3. **Start MongoDB** (if local):
   ```bash
   mongod
   ```

4. **Run the server**:
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password/:token` | Reset password |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/search?q=` | Search users |
| GET | `/api/users/:id` | Get user profile |
| PUT | `/api/users/profile` | Update profile |
| PUT | `/api/users/avatar` | Update avatar |
| PUT | `/api/users/status` | Update status |

### Friends
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/friends` | List friends |
| GET | `/api/friends/requests` | Get friend requests |
| POST | `/api/friends/request/:userId` | Send request |
| POST | `/api/friends/accept/:userId` | Accept request |
| POST | `/api/friends/decline/:userId` | Decline request |
| DELETE | `/api/friends/:userId` | Remove friend |

### Chats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chats` | List chats |
| POST | `/api/chats` | Create chat |
| GET | `/api/chats/:id` | Get chat details |
| GET | `/api/chats/:id/messages` | Get messages |
| PUT | `/api/chats/:id/mute` | Toggle mute |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/messages` | Send message |
| POST | `/api/messages/upload` | Send with attachments |
| PUT | `/api/messages/:id` | Edit message |
| DELETE | `/api/messages/:id` | Delete message |
| POST | `/api/messages/:id/reaction` | Add reaction |

### Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups` | List groups |
| POST | `/api/groups` | Create group |
| PUT | `/api/groups/:id` | Update group |
| POST | `/api/groups/:id/members` | Add members |
| DELETE | `/api/groups/:id/members/:userId` | Remove member |
| POST | `/api/groups/:id/leave` | Leave group |

## Socket.IO Events

### Client → Server
- `join-chat` - Join a chat room
- `leave-chat` - Leave a chat room
- `send-message` - Send a message
- `edit-message` - Edit a message
- `delete-message` - Delete a message
- `add-reaction` - Add reaction
- `typing` - Start typing indicator
- `stop-typing` - Stop typing indicator
- `mark-read` - Mark messages as read
- `update-status` - Update user status

### Server → Client
- `new-message` - New message received
- `message-edited` - Message was edited
- `message-deleted` - Message was deleted
- `reaction-updated` - Reaction changed
- `user-typing` - User started typing
- `user-stop-typing` - User stopped typing
- `messages-read` - Messages marked as read
- `user-status-change` - User status changed
- `new-friend-request` - Friend request received
- `friend-request-accepted` - Friend request accepted

## Project Structure

```
Backend/
├── config/
│   ├── db.js           # MongoDB connection
│   ├── cloudinary.js   # Cloudinary & Multer setup
│   └── email.js        # Nodemailer configuration
├── middleware/
│   ├── auth.js         # JWT authentication
│   └── errorHandler.js # Global error handler
├── models/
│   ├── User.js         # User model
│   ├── Chat.js         # Chat model
│   └── Message.js      # Message model
├── routes/
│   ├── auth.js         # Auth routes
│   ├── users.js        # User routes
│   ├── friends.js      # Friends routes
│   ├── chats.js        # Chat routes
│   ├── messages.js     # Message routes
│   └── groups.js       # Group routes
├── socket/
│   └── handlers.js     # Socket.IO handlers
├── .env                # Environment variables
├── package.json
└── server.js           # Entry point
```

## License

MIT

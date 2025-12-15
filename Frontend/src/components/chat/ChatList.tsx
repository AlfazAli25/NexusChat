import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageCircle, Users, Bell, BellOff } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { Chat, useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ChatListProps {
  onChatSelect?: (chat: Chat) => void;
}

export function ChatList({ onChatSelect }: ChatListProps) {
  const { chats, activeChat, setActiveChat, markAsRead, typingUsers } = useChatStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const getChatName = (chat: Chat) => {
    if (chat.type === 'group') return chat.name;
    const otherParticipant = chat.participants?.find(
      (p) => (p.id || p._id) !== (user?.id || user?._id)
    );
    return otherParticipant?.name || chat.name || 'User';
  };

  const filteredChats = chats.filter((chat) =>
    getChatName(chat).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChatClick = (chat: Chat) => {
    setActiveChat(chat);
    markAsRead(chat.id);
    onChatSelect?.(chat);
    navigate(`/chat/${chat.id}`);
  };

  const formatMessageTime = (date: Date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    return format(date, 'dd/MM');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-4">
        <Input
          icon={<Search className="h-4 w-4" />}
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-muted/30"
        />
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto space-y-1 px-2">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
            <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No conversations found</p>
          </div>
        ) : (
          filteredChats.map((chat, index) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              name={getChatName(chat)}
              isActive={activeChat?.id === chat.id}
              onClick={() => handleChatClick(chat)}
              style={{ animationDelay: `${index * 50}ms` }}
              typingUsers={typingUsers}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ChatListItemProps {
  chat: Chat;
  name: string;
  isActive: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
  typingUsers: Record<string, string[]>;
}

function ChatListItem({ chat, name, isActive, onClick, style, typingUsers }: ChatListItemProps) {
  const formatMessageTime = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return '';
    }
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Yesterday';
    }
    return format(date, 'dd/MM');
  };

  return (
    <button
      onClick={onClick}
      style={style}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 animate-slide-up',
        'hover:bg-muted/50',
        isActive && 'bg-primary/10 border border-primary/20'
      )}
    >
      <div className="relative">
        <Avatar size="lg">
          <AvatarImage src={chat.avatar} alt={name} />
          <AvatarFallback>{(name || 'U').slice(0, 2)}</AvatarFallback>
        </Avatar>
        {chat.type === 'group' && (
          <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-secondary">
            <Users className="h-2.5 w-2.5 text-secondary-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate">{name}</span>
          {chat.lastMessage && (
            <span className="text-[10px] text-muted-foreground shrink-0">
              {formatMessageTime(new Date(chat.lastMessage.createdAt))}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex items-center gap-1 min-w-0">
            {typingUsers[chat.id || chat._id!]?.length > 0 ? (
              <span className="text-xs text-primary animate-pulse">
                {typingUsers[chat.id || chat._id!]?.[0]} is typing...
              </span>
            ) : (
              <p className="text-xs text-muted-foreground truncate">
                {chat.lastMessage?.content || 'No messages yet'}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {chat.isMuted && (
              <BellOff className="h-3 w-3 text-muted-foreground" />
            )}
            {chat.unreadCount > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

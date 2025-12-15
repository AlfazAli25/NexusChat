import { useRef, useEffect, useState } from 'react';
import { Search, ArrowLeft, X } from 'lucide-react';
import { Chat, useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { useScrollToBottom } from '@/hooks/useScrollToBottom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatBubble, TypingIndicator } from './ChatBubble';
import { ChatInput } from './ChatInput';

interface ChatWindowProps {
  chat: Chat;
  onBack?: () => void;
}

export function ChatWindow({ chat, onBack }: ChatWindowProps) {
  const { user } = useAuthStore();
  const {
    messages,
    sendMessage,
    deleteMessage,
    addReaction,
    typingUsers,
    sendAttachment,
  } = useChatStore();

  const [replyingTo, setReplyingTo] = useState<Chat['lastMessage'] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const chatMessages = messages[chat.id] || [];
  const isTyping = typingUsers[chat.id]?.length > 0;

  const filteredMessages = chatMessages.filter(msg =>
    msg.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const chatName = chat.type === 'group'
    ? chat.name
    : chat.participants?.find((p) => (p.id || p._id) !== (user?.id || user?._id))?.name || chat.name || 'User';

  const { containerRef, scrollToBottom } = useScrollToBottom<HTMLDivElement>([
    chatMessages.length,
    isTyping,
    searchQuery, // Scroll effect might change with search, but usually we just show list
  ]);

  const handleSendMessage = (content: string) => {
    if (!user) return;
    sendMessage(chat.id, content, user, 'text', replyingTo?.id || replyingTo?._id);
    setReplyingTo(null);
    scrollToBottom();
  };

  const handleSendAttachment = async (files: File[]) => {
    await sendAttachment(chat.id, files);
    scrollToBottom();
  };

  const handleDeleteMessage = (messageId: string) => {
    deleteMessage(chat.id, messageId);
  };

  const handleReaction = (messageId: string, emoji: string) => {
    if (!user) return;
    addReaction(chat.id, messageId, emoji, user.id || user._id!);
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-l-3xl overflow-hidden shadow-2xl">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 glass-strong shrink-0 z-20 min-h-[80px]">
        {isSearching ? (
          <div className="flex-1 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              autoFocus
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none focus-visible:ring-0 text-base"
            />
            <Button variant="ghost" size="icon" onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="shrink-0 hover:bg-muted/50 rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              {onBack && (
                <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}

              <div className="flex items-center gap-3 cursor-pointer group">
                <Avatar className="h-10 w-10 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all duration-300">
                  <AvatarImage src={chat.avatar} alt={chatName} />
                  <AvatarFallback className="bg-primary/10 text-primary">{chatName?.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col justify-center">
                  <h2 className="text-base font-bold leading-tight">{chatName}</h2>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                    {isTyping ? (
                      <span className="text-primary font-medium animate-pulse">typing...</span>
                    ) : (
                      "click for info"
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-muted-foreground">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSearching(true)}
                className="hover:text-foreground hover:bg-muted rounded-full transition-colors"
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Messages Area - Mesh Background */}
      <div className="flex-1 relative overflow-hidden bg-background/50">
        {/* Mesh Gradient Background Layer */}
        <div className="absolute inset-0 mesh-bg opacity-30 pointer-events-none"></div>

        <div
          ref={containerRef}
          className="absolute inset-0 overflow-y-auto p-6 space-y-4 scroll-smooth"
        >
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
              {searchQuery ? (
                <p className="text-sm bg-muted/50 backdrop-blur-sm px-4 py-2 rounded-full border border-border/50">
                  No messages found for "{searchQuery}"
                </p>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
                  </div>
                  <p className="text-sm bg-muted/50 backdrop-blur-sm px-4 py-2 rounded-full border border-border/50 text-center max-w-sm">
                    This is the start of your encrypted conversation.
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredMessages.map((message, index) => {
              const userId = message.sender.id || message.sender._id;
              const currentUserId = user?.id || user?._id;
              const isOwnMessage = userId === currentUserId;
              const showAvatar = index === 0 || (filteredMessages[index - 1].sender.id || filteredMessages[index - 1].sender._id) !== userId;

              return (
                <ChatBubble
                  key={message.id}
                  message={message}
                  isOwnMessage={isOwnMessage}
                  showAvatar={showAvatar}
                  onReaction={handleReaction}
                  onDelete={handleDeleteMessage}
                  onReply={(msg) => setReplyingTo(msg)}
                />
              );
            })
          )}

          {isTyping && !searchQuery && <TypingIndicator />}
        </div>
      </div>

      {/* Input Area */}
      <ChatInput
        onSendMessage={handleSendMessage}
        onSendAttachment={handleSendAttachment}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />
    </div>
  );
}

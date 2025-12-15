import { useRef, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck, MoreHorizontal, Reply, Copy, Trash2 } from 'lucide-react';
import gsap from 'gsap';
import { Message } from '@/stores/chatStore';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface ChatBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  showAvatar?: boolean;
  onReply?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
}

export function ChatBubble({
  message,
  isOwnMessage,
  showAvatar = true,
  onReply,
  onDelete,
  onReaction,
}: ChatBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (bubbleRef.current) {
      // Subtle entry animation
      gsap.fromTo(
        bubbleRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, []);

  const StatusIcon = () => {
    if (!isOwnMessage) return null;

    if (message.status === 'seen') {
      return <CheckCheck className="h-3.5 w-3.5 text-primary" />;
    }
    if (message.status === 'delivered') {
      return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />;
    }
    return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <div
      ref={bubbleRef}
      className={cn(
        'group flex mb-2 relative max-w-[85%] md:max-w-[70%]',
        isOwnMessage ? 'ml-auto justify-end' : 'mr-auto justify-start'
      )}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* Container for bubble */}
      <div className={cn("relative flex flex-col",
        isOwnMessage ? "items-end" : "items-start"
      )}>

        {/* The Bubble */}
        <div
          className={cn(
            'px-4 py-3 rounded-2xl text-sm relative z-10 shadow-sm backdrop-blur-sm transition-all duration-300',
            isOwnMessage
              ? 'bg-primary/20 hover:bg-primary/25 border border-primary/20 text-foreground rounded-tr-sm'
              : 'bg-card/80 hover:bg-card border border-border/50 text-foreground rounded-tl-sm'
          )}
        >
          {/* Sender Name in Group */}
          {!isOwnMessage && showAvatar && (
            <p className="text-xs font-bold text-primary mb-1 cursor-pointer hover:underline">
              {message.sender.name}
            </p>
          )}

          {/* Reply Context */}
          {message.replyTo && (
            <div className="mb-2 p-2 bg-black/10 dark:bg-black/20 rounded border-l-4 border-primary/70 text-xs">
              <p className="font-semibold text-primary/90 opacity-90 mb-0.5">{message.replyTo.sender.name}</p>
              <p className="line-clamp-2 opacity-80">{message.replyTo.content}</p>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-x-2">
            <span className="whitespace-pre-wrap leading-relaxed break-words">{message.content}</span>

            {/* Timestamp & Status float right/bottom */}
            <div className="flex items-center gap-1 select-none h-4 self-end ml-auto mt-1 shrink-0 opacity-70">
              <span className="text-[10px] uppercase font-medium">
                {format(new Date(message.createdAt), 'HH:mm')}
              </span>
              <StatusIcon />
            </div>
          </div>
        </div>

        {/* Menu (Hover) */}
        {showMenu && (
          <div
            className={cn(
              'absolute top-0 -translate-y-full mb-1 flex items-center gap-1 p-1 rounded-md bg-popover border border-border shadow-lg z-20 animate-fade-in',
              isOwnMessage ? 'right-0' : 'left-0'
            )}
          >
            <button onClick={() => onReply?.(message)} className="p-1.5 hover:bg-muted rounded transition-colors" title="Reply"><Reply className="w-3.5 h-3.5 text-muted-foreground" /></button>
            <button onClick={() => navigator.clipboard.writeText(message.content)} className="p-1.5 hover:bg-muted rounded transition-colors" title="Copy"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>
            {isOwnMessage && <button onClick={() => onDelete?.(message.id)} className="p-1.5 hover:bg-destructive/20 rounded transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>}
          </div>
        )}

      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-muted/50 border border-border/50 rounded-2xl rounded-tl-sm w-fit ml-2 mb-2 backdrop-blur-sm">
      <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
      <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
      <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
    </div>
  )
}

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Mic, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Message } from '@/lib/api';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface ChatInputProps {
  onSendMessage: (content: string, type?: 'text' | 'image' | 'document') => void;
  onSendAttachment?: (files: File[]) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

export function ChatInput({
  onSendMessage,
  onSendAttachment,
  onTyping,
  disabled,
  placeholder = 'Type a message',
  replyingTo,
  onCancelReply,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Focus input when replying
  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
      onTyping?.(false);
      onCancelReply?.(); // Clear reply after sending
      if (inputRef.current) inputRef.current.style.height = 'auto'; // Reset height
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onTyping?.(true);

    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onSendAttachment?.(Array.from(e.target.files));
      // Reset input
      e.target.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleEmojiSelect = (emoji: any) => {
    setMessage((prev) => prev + emoji.native);
  };

  return (
    <div className="flex flex-col w-full bg-background/50 backdrop-blur-md border-t border-border/10 shrink-0 z-20">

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={handleFileSelect}
      />

      {/* Reply Preview */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-l-4 border-l-primary mx-4 mt-2 rounded-r-lg">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary font-medium mb-0.5">Replying to {replyingTo.sender.name}</p>
            <p className="text-sm text-foreground/80 truncate">{replyingTo.content}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-background/50" onClick={onCancelReply}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="px-2 py-3 pb-4 flex items-end gap-2">
        {/* Plus / Attach */}
        <Button
          variant="ghost"
          size="icon"
          onClick={triggerFileSelect}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 -mb-1 rounded-full shrink-0"
        >
          <Plus className="h-6 w-6" />
        </Button>

        {/* Input container */}
        <div className="flex-1 bg-muted/30 hover:bg-muted/50 transition-colors rounded-2xl flex items-center min-h-[42px] px-3 py-1.5 gap-2 border border-border/50 focus-within:ring-1 focus-within:ring-primary/30">

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-transparent h-8 w-8 shrink-0 p-0 rounded-full">
                <Smile className="h-6 w-6" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 border-none bg-transparent shadow-none z-50" side="top" align="start">
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme="dark"
                previewPosition="none"
              />
            </PopoverContent>
          </Popover>

          <textarea
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent border-none focus:ring-0 text-foreground focus:outline-none placeholder:text-muted-foreground/70 resize-none text-[15px] leading-6 max-h-[120px] py-1"
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={triggerFileSelect}
            className="text-muted-foreground hover:text-primary hover:bg-transparent h-8 w-8 shrink-0 p-0 rounded-full"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        </div>

        {/* Send Button Only */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "text-primary hover:bg-primary/10 -mb-1 rounded-full shrink-0 transition-all",
            !message.trim() && "opacity-50 cursor-not-allowed text-muted-foreground hover:bg-transparent hover:text-muted-foreground"
          )}
          onClick={handleSend}
          disabled={!message.trim()}
        >
          <Send className="h-6 w-6 fill-current" />
        </Button>
      </div>
    </div>
  );
}

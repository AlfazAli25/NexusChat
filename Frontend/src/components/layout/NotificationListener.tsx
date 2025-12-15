import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/themeStore';
import { socketOn } from '@/lib/socket';
import { useToast } from '@/hooks/use-toast';
import notificationSound from '@/assets/notification.mp3'; // We'll need to check if this exists or use a URL

export function NotificationListener() {
  const { activeChat } = useChatStore();
  const { notifications, sounds } = useSettingsStore();
  const { isAuthenticated } = useAuthStore(); // Destructured isAuthenticated
  const { toast } = useToast();
  const location = useLocation();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Fallback URL or local asset
  }, []);

  // Initialize store socket listeners
  useEffect(() => {
    if (!isAuthenticated) return; // Added isAuthenticated check

    const { initSocketListeners } = useChatStore.getState();
    const cleanup = initSocketListeners();
    return cleanup;
  }, [isAuthenticated]); // Added isAuthenticated to dependency array

  useEffect(() => {
    if (!notifications) return;

    const handleNewMessage = (data: { chatId: string; message: any }) => {
      // Don't notify if we're in the chat that received the message
      if (activeChat && (activeChat.id || activeChat._id) === data.chatId) {
        return;
      }

      // Play sound
      if (sounds && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error('Error playing sound:', e));
      }

      // Show toast
      toast({
        title: `New message from ${data.message.sender.name}`,
        description: data.message.content.length > 50
          ? data.message.content.substring(0, 50) + '...'
          : data.message.content,
        duration: 5000,
      });
    };

    const unsubscribe = socketOn.onNewMessage(handleNewMessage);

    return () => {
      unsubscribe();
    };
  }, [notifications, sounds, activeChat, toast]);

  return null; // Headless component
}

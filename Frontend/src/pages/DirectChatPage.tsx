import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { MainLayout } from '@/components/layout/MainLayout';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { ChatList } from '@/components/chat/ChatList';
import { usePageTransition } from '@/hooks/useGSAP';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function DirectChatPage() {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const { isAuthenticated } = useAuthStore();
  const { activeChat, setActiveChat, chats, fetchChats } = useChatStore();
  const pageRef = usePageTransition();
  const [loading, setLoading] = useState(true);

  // Default collapsed to emphasize the chat content, user can expand if needed
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    let isMounted = true;
    const loadChat = async () => {
      if (!chatId) {
        navigate('/chats');
        return;
      }

      // If chats aren't loaded or we can't find the one we need, fetch them
      if (chats.length === 0) {
        await fetchChats();
      }

      // We need to check against the fresh state after fetch, so use useChatStore.getState() 
      // or assume the effect dep on `chats` handles re-runs.
      // Better to check the store directly here to be sure.
      const currentChats = useChatStore.getState().chats;
      const chat = currentChats.find(c => (c.id || c._id) === chatId);

      if (isMounted) {
        if (chat) {
          setActiveChat(chat);
        } else {
          console.warn(`Chat with id ${chatId} not found`);
          // Optional: could try to fetch specific chat details if API supports it
        }
        setLoading(false);
      }
    };

    loadChat();

    // Cleanup active chat on unmount or id change? 
    // Maybe not, we want it to persist if we just switch tabs. 
    // But if we leave the page, we might want to clear it.
    return () => { isMounted = false; };
  }, [chatId, activeChat, navigate, setActiveChat, fetchChats]);
  // Removed chats dependency to avoid infinite loops if fetchChats updates reference

  const handleBack = () => {
    setActiveChat(null);
    navigate('/chats');
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MainLayout
      sidebar={
        <Sidebar // Keep sidebar but collapsed by default for "focus" mode
          activeTab="chats"
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      }
    >
      <div ref={pageRef} className="flex h-full w-full bg-background/50 overflow-hidden relative">
        {/* Chat List Sidebar - Hidden on mobile if chat is active, visible on desktop */}
        <div className="hidden md:flex flex-col w-80 lg:w-96 border-r border-border/50 bg-background/40 backdrop-blur-sm h-full shrink-0">
          <div className="p-4 pb-2 border-b border-border/50 bg-background/50 backdrop-blur-xl">
            <h2 className="text-lg font-semibold px-2">Messages</h2>
          </div>
          {/* Passing navigate as prop isn't needed if ChatList uses useNavigate internally, checking ChatList props... */}
          {/* ChatList takes onChatSelect, we can use it to maybe auto-collapse sidebar or tracking */}
          <div className="flex-1 overflow-hidden">
            {/* We need to import ChatList first */}
            <ChatList />
          </div>
        </div>

        {/* Chat Window Container */}
        <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden bg-background/30 backdrop-blur-sm">
          {/* Centered Chat Window Wrapper */}
          <div className="flex h-full w-full justify-center">
            <div className="flex-1 flex flex-col h-11/12 w-full max-w-5xl bg-background shadow-2xl overflow-hidden md:my-4 md:rounded-2xl border border-border/50 relative">
              {activeChat ? (
                <ChatWindow chat={activeChat} onBack={handleBack} />
              ) : (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">Chat not found or unavailable</p>
                    <Button onClick={() => navigate('/chats')}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Chats
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

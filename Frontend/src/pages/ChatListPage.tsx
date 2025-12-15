import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { MainLayout } from '@/components/layout/MainLayout';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatList } from '@/components/chat/ChatList';
import { usePageTransition } from '@/hooks/useGSAP';
import { Card } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';

export default function ChatListPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const pageRef = usePageTransition();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleChatSelect = () => {
    // Navigation is handled largely by ChatList itself now, or we can enforce it here
    // navigate('/chat'); // No longer generic
  };

  return (
    <MainLayout
      sidebar={
        <Sidebar
          activeTab="chats"
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      }
    >
      <div ref={pageRef} className="flex h-full">
        {/* Chat list - Full width on mobile/tablet, Sidebar width on desktop */}
        <div className="w-full md:w-80 lg:w-96 border-r border-border bg-card/30 h-full">
          <ChatList onChatSelect={handleChatSelect} />
        </div>

        {/* Empty State / Placeholder for Desktop */}
        <div className="hidden md:flex flex-1 items-center justify-center bg-background/50 p-6 text-center">
          <Card glass className="max-w-md p-8 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <MessageCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Select a conversation</h2>
            <p className="text-muted-foreground">
              Choose a chat from the list to start messaging or connect with a new friend.
            </p>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

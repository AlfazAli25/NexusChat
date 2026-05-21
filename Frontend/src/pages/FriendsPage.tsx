import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, MessageCircle, Ban, Check, X, MoreHorizontal } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore, Friend } from '@/stores/chatStore';
import { friendsApi } from '@/lib/api';
import { MainLayout } from '@/components/layout/MainLayout';
import { Sidebar } from '@/components/layout/Sidebar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AddFriendDialog } from '@/components/friends/AddFriendDialog'; // Import
import { usePageTransition } from '@/hooks/useGSAP';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function FriendsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { friends } = useChatStore();
  const { toast } = useToast();
  const pageRef = usePageTransition();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'online' | 'pending'>('all');
  const [addFriendOpen, setAddFriendOpen] = useState(false); // State

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      // Fetch friends on mount to ensure list is up to date
      // Note: we can import fetchFriends from store usage
      useChatStore.getState().fetchFriends();
    }
  }, [isAuthenticated, navigate]);

  const filteredFriends = friends.filter((friend) => {
    const matchesSearch = friend.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'online') {
      return matchesSearch && friend.status === 'online';
    }
    return matchesSearch;
  });

  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'pending') {
      const fetchRequests = async () => {
        try {
          const res = await friendsApi.getRequests();
          const incoming = res.incoming.map(u => ({ ...u, type: 'incoming' }));
          const outgoing = res.outgoing.map(u => ({ ...u, type: 'outgoing' }));
          setPendingRequests([...incoming, ...outgoing]);
        } catch (error) {
          console.error('Failed to fetch requests', error);
        }
      };
      fetchRequests();
    }
  }, [activeTab]);

  const handleAcceptRequest = async (id: string) => {
    try {
      await friendsApi.acceptRequest(id);
      setPendingRequests(prev => prev.filter(r => (r.id || r._id) !== id));
      toast({ title: 'Friend request accepted!' });
    } catch (error) {
      toast({ title: 'Failed to accept request', variant: 'destructive' });
    }
  };

  const handleDeclineRequest = async (id: string) => {
    try {
      await friendsApi.declineRequest(id);
      setPendingRequests(prev => prev.filter(r => (r.id || r._id) !== id));
      toast({ title: 'Friend request declined' });
    } catch (error) {
      toast({ title: 'Failed to decline request', variant: 'destructive' });
    }
  };

  const tabs = [
    { id: 'all', label: 'All Friends', count: friends.length },
    { id: 'online', label: 'Online', count: friends.filter((f) => f.status === 'online').length },
    { id: 'pending', label: 'Pending', count: pendingRequests.length },
  ];

  return (
    <MainLayout
      sidebar={
        <Sidebar
          activeTab="friends"
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      }
    >
      <div ref={pageRef} className="flex flex-col h-full p-4 md:p-6 overflow-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Friends</h1>
          <p className="text-muted-foreground text-sm">Manage your connections</p>
        </div>

        {/* Search and Add */}
        <div className="flex gap-3 mb-6">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button variant="gradient" onClick={() => setAddFriendOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Friend
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              )}
            >
              {tab.label}
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-background/20 text-xs">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'pending' ? (
          <div className="space-y-3">
            {pendingRequests.length === 0 ? (
              <Card glass className="p-8 text-center">
                <p className="text-muted-foreground">No pending requests</p>
              </Card>
            ) : (
              pendingRequests.map((request, index) => (
                <Card
                  key={request.id}
                  glass
                  className="p-4 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar size="lg">
                        <AvatarImage src={request.avatar} alt={request.name} />
                        <AvatarFallback>{request.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {request.type === 'incoming' ? 'Sent you a request' : 'Request pending'}
                        </p>
                      </div>
                    </div>
                    {request.type === 'incoming' ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleAcceptRequest(request.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeclineRequest(request.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost">
                        Cancel
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFriends.length === 0 ? (
              <Card glass className="col-span-full p-8 text-center">
                <p className="text-muted-foreground">No friends found</p>
              </Card>
            ) : (
              filteredFriends.map((friend, index) => (
                <FriendCard
                  key={friend.id}
                  friend={friend}
                  index={index}
                />
              ))
            )}
          </div>
        )}
      </div>
      <AddFriendDialog open={addFriendOpen} onOpenChange={setAddFriendOpen} />
    </MainLayout>
  );
}

const statusColors = {
  online: 'text-green-500',
  offline: 'text-gray-500',
  away: 'text-yellow-500',
  busy: 'text-red-500',
};

function FriendCard({ friend, index }: { friend: Friend; index: number }) {
  const navigate = useNavigate();
  const { startDirectChat } = useChatStore();

  const { toast } = useToast();

  const handleMessage = async () => {
    try {
      const newChat = await startDirectChat(friend.id || friend._id!);
      navigate(`/chat/${newChat.id || newChat._id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start chat',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card
      glass
      className="p-4 hover:border-primary/30 transition-all duration-300 animate-slide-up group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <Avatar size="lg" status={friend.status}>
          <AvatarImage src={friend.avatar} alt={friend.name} />
          <AvatarFallback>{friend.name.slice(0, 2)}</AvatarFallback>
        </Avatar>
        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <h3 className="font-medium mb-1">{friend.name}</h3>
      <p className={cn('text-xs capitalize', statusColors[friend.status])}>
        {friend.status}
      </p>

      <div className="flex gap-2 mt-4">
        <Button
          size="sm"
          variant="default"
          className="flex-1"
          onClick={handleMessage}
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          Message
        </Button>
        <Button size="sm" variant="ghost">
          <Ban className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

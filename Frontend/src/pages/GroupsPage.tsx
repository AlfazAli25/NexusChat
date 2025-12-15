import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Users, Lock, Globe, Settings, MoreHorizontal } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { groupsApi } from '@/lib/api';
import { MainLayout } from '@/components/layout/MainLayout';
import { Sidebar } from '@/components/layout/Sidebar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CreateGroupDialog } from '@/components/groups/CreateGroupDialog'; // Import
import { usePageTransition } from '@/hooks/useGSAP';
import { cn } from '@/lib/utils';

interface Group {
  id: string;
  name: string;
  avatar: string;
  memberCount: number;
  isPrivate: boolean;
  lastActivity: string;
}

export default function GroupsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const pageRef = usePageTransition();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'private' | 'public'>('all');
  const [groups, setGroups] = useState<Group[]>([]);
  const [createGroupOpen, setCreateGroupOpen] = useState(false); // State

  const fetchGroups = async () => {
    try {
      const res = await groupsApi.getGroups();
      // Adapt API response to component's Group interface if needed
      const adaptedGroups = res.groups.map((g: any) => ({
        id: g.id || g._id,
        name: g.name,
        avatar: g.avatar,
        memberCount: g.memberCount || g.participants?.length || 0,
        isPrivate: g.isPrivate,
        lastActivity: new Date(g.updatedAt).toLocaleDateString(),
      }));
      setGroups(adaptedGroups);
    } catch (error) {
      console.error('Failed to fetch groups', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchGroups();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const filteredGroups = groups.filter((group) => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeFilter === 'private') return matchesSearch && group.isPrivate;
    if (activeFilter === 'public') return matchesSearch && !group.isPrivate;
    return matchesSearch;
  });

  const filters = [
    { id: 'all', label: 'All Groups', icon: Users },
    { id: 'private', label: 'Private', icon: Lock },
    { id: 'public', label: 'Public', icon: Globe },
  ];

  return (
    <MainLayout
      sidebar={
        <Sidebar
          activeTab="groups"
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      }
    >
      <div ref={pageRef} className="flex flex-col h-full p-4 md:p-6 overflow-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Groups</h1>
          <p className="text-muted-foreground text-sm">Create and manage group conversations</p>
        </div>

        {/* Search and Create */}
        <div className="flex gap-3 mb-6">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button variant="gradient" onClick={() => setCreateGroupOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap',
                activeFilter === filter.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              )}
            >
              <filter.icon className="h-4 w-4" />
              {filter.label}
            </button>
          ))}
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.length === 0 ? (
            <Card glass className="col-span-full p-8 text-center">
              <p className="text-muted-foreground">No groups found</p>
            </Card>
          ) : (
            filteredGroups.map((group, index) => (
              <GroupCard key={group.id} group={group} index={index} />
            ))
          )}
        </div>
      </div>

      <CreateGroupDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        onGroupCreated={fetchGroups}
      />
    </MainLayout>
  );
}

function GroupCard({ group, index }: { group: Group; index: number }) {
  const navigate = useNavigate();

  return (
    <Card
      glass
      className="p-4 hover:border-primary/30 transition-all duration-300 animate-slide-up group cursor-pointer"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => navigate('/chat')}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="relative">
          <Avatar size="xl">
            <AvatarImage src={group.avatar} alt={group.name} />
            <AvatarFallback>{group.name.slice(0, 2)}</AvatarFallback>
          </Avatar>
          {group.isPrivate && (
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-secondary">
              <Lock className="h-3 w-3 text-secondary-foreground" />
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <h3 className="font-semibold mb-1">{group.name}</h3>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Users className="h-3.5 w-3.5" />
        <span>{group.memberCount} members</span>
        <span>•</span>
        <span>{group.lastActivity}</span>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="default" className="flex-1">
          Open Chat
        </Button>
        <Button size="sm" variant="ghost">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

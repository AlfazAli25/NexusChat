import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  Users,
  UserPlus,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/themeStore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface SidebarProps {
  activeTab?: 'chats' | 'friends' | 'groups' | 'settings';
  onTabChange?: (tab: 'chats' | 'friends' | 'groups' | 'settings') => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar(props: SidebarProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden shrink-0 m-2">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-80">
          <span className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </span>
          <SidebarContent
            {...props}
            isMobile={true}
            onNavigate={() => setOpen(false)}
            // On mobile, force uncollapsed view for the drawer
            collapsed={false}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <SidebarContent
      {...props}
      isMobile={false}
    />
  );
}

interface SidebarContentProps extends SidebarProps {
  isMobile: boolean;
  onNavigate?: () => void;
}

function SidebarContent({
  activeTab = 'chats',
  onTabChange,
  collapsed = false,
  onCollapsedChange,
  isMobile,
  onNavigate,
}: SidebarContentProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useSettingsStore();

  const navItems = [
    { id: 'chats', icon: MessageCircle, label: 'Chats', path: '/chats' },
    { id: 'friends', icon: Users, label: 'Friends', path: '/friends' },
    { id: 'groups', icon: UserPlus, label: 'Groups', path: '/groups' },
    { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    onTabChange?.(item.id as any);
    navigate(item.path);
    onNavigate?.();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    onNavigate?.();
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-full md:w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <h1 className="text-xl font-bold gradient-text">NexusChat</h1>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCollapsedChange?.(!collapsed)}
            className="shrink-0"
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </Button>
        )}
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onNavigate}
            className="shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* User profile */}
      <div className={cn('p-4 border-b border-sidebar-border', collapsed && 'px-2')}>
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <Avatar size={collapsed ? 'md' : 'lg'} status="online">
            <AvatarImage src={user?.avatar} alt={user?.name} />
            <AvatarFallback>{user?.name?.slice(0, 2)}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
              'hover:bg-sidebar-accent',
              activeTab === item.id && 'bg-sidebar-accent text-sidebar-primary',
              collapsed && 'justify-center px-2'
            )}
          >
            <item.icon className={cn('h-5 w-5 shrink-0', activeTab === item.id && 'text-primary')} />
            {!collapsed && <span className="text-sm">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Footer actions */}
      <div className={cn('p-4 border-t border-sidebar-border space-y-2', collapsed && 'p-2')}>
        <Button
          variant="ghost"
          className={cn('w-full justify-start', collapsed && 'justify-center px-2')}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 shrink-0" />
          ) : (
            <Moon className="h-5 w-5 shrink-0" />
          )}
          {!collapsed && <span className="ml-3 text-sm">Toggle theme</span>}
        </Button>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10',
            collapsed && 'justify-center px-2'
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="ml-3 text-sm">Logout</span>}
        </Button>
      </div>
    </div>
  );
}

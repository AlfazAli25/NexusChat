import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Bell,
  Shield,
  Palette,
  HelpCircle,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/themeStore';
import { MainLayout } from '@/components/layout/MainLayout';
import { Sidebar } from '@/components/layout/Sidebar';
import { Avatar3DViewer } from '@/components/3d/Avatar3D';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { EditProfileDialog } from '@/components/settings/EditProfileDialog';
import { ChangePasswordDialog } from '@/components/settings/ChangePasswordDialog';
import { ChatThemeDialog } from '@/components/settings/ChatThemeDialog';
import { HelpDialog } from '@/components/settings/HelpDialog';
import { AvatarDialog } from '@/components/settings/AvatarDialog';
import { PrivacyDialog } from '@/components/settings/PrivacyDialog';
import { usePageTransition } from '@/hooks/useGSAP';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const {
    theme, toggleTheme,
    notifications, toggleNotifications,
    sounds, toggleSounds,
    chatTheme,
    avatarSeed
  } = useSettingsStore();
  const pageRef = usePageTransition();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [themesOpen, setThemesOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'Edit Profile',
          description: 'Change your name, bio, and avatar',
          action: 'edit-profile',
        },
        {
          icon: Shield,
          label: 'Privacy & Security',
          description: 'Manage privacy and password',
          action: 'privacy',
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: theme === 'dark' ? Moon : Sun,
          label: 'Dark Mode',
          description: theme === 'dark' ? 'Currently enabled' : 'Currently disabled',
          action: 'toggle',
          value: theme === 'dark',
          onToggle: toggleTheme,
        },
        {
          icon: Bell,
          label: 'Notifications',
          description: 'Manage notification preferences',
          action: 'toggle',
          value: notifications,
          onToggle: toggleNotifications,
        },
        {
          icon: sounds ? Volume2 : VolumeX,
          label: 'Sound Effects',
          description: 'Enable or disable sound effects',
          action: 'toggle',
          value: sounds,
          onToggle: toggleSounds,
        },
      ],
    },
    {
      title: 'More',
      items: [
        {
          icon: Palette,
          label: 'Chat Themes',
          description: chatTheme === 'default' ? 'Default Theme' : 'Custom Theme',
          action: 'themes',
        },
        {
          icon: HelpCircle,
          label: 'Help & Support',
          description: 'Get help with NexusChat',
          action: 'help',
        },
      ],
    },
  ];

  const handleAction = (action: string) => {
    switch (action) {
      case 'edit-profile':
        setEditProfileOpen(true);
        break;
      case 'privacy':
        setPrivacyOpen(true);
        break;
      case 'themes':
        setThemesOpen(true);
        break;
      case 'help':
        setHelpOpen(true);
        break;
      // Add other cases as needed
    }
  };

  return (
    <MainLayout
      sidebar={
        <Sidebar
          activeTab="settings"
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      }
    >
      <div ref={pageRef} className="flex flex-col h-full p-4 md:p-6 overflow-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Settings</h1>
          <p className="text-muted-foreground text-sm">Customize your experience</p>
        </div>

        {/* Profile Card */}
        <Card glass className="p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20 bg-muted">
                <Avatar3DViewer seed={avatarSeed || user?.name || 'avatar'} className="w-full h-full" />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary/20 backdrop-blur-sm text-xs text-primary font-medium">
                3D Avatar
              </div>
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-xl font-bold mb-1">{user?.name}</h2>
              <p className="text-muted-foreground text-sm mb-2">{user?.email}</p>
              <p className="text-sm text-muted-foreground mb-4">{user?.bio || 'No bio yet'}</p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <Button size="sm" variant="default" onClick={() => setEditProfileOpen(true)}>
                  Edit Profile
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAvatarOpen(true)}>
                  Change Avatar
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Settings Sections */}
        <div className="space-y-6">
          {settingsSections.map((section, sectionIndex) => (
            <div
              key={section.title}
              className="animate-slide-up"
              style={{ animationDelay: `${sectionIndex * 100}ms` }}
            >
              <h3 className="text-sm font-medium text-muted-foreground mb-3 px-2">
                {section.title}
              </h3>
              <Card glass className="divide-y divide-border">
                {section.items.map((item, index) => (
                  <button
                    key={item.label}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    onClick={() => item.action === 'toggle' ? item.onToggle?.() : handleAction(item.action)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    {item.action === 'toggle' ? (
                      <Switch checked={item.value} />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                ))}
              </Card>
            </div>
          ))}
        </div>

        {/* Version */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>NexusChat v1.0.0</p>
          <p className="mt-1">Made with ❤️ using React & Three.js</p>
        </div>
      </div>

      <EditProfileDialog open={editProfileOpen} onOpenChange={setEditProfileOpen} />
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
      <ChatThemeDialog open={themesOpen} onOpenChange={setThemesOpen} />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
      <AvatarDialog open={avatarOpen} onOpenChange={setAvatarOpen} />
      <PrivacyDialog
        open={privacyOpen}
        onOpenChange={setPrivacyOpen}
        onChangePassword={() => setChangePasswordOpen(true)}
      />
    </MainLayout>
  );
}

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar3DViewer } from '@/components/3d/Avatar3D';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/themeStore';
import { RefreshCw, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AvatarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AvatarDialog({ open, onOpenChange }: AvatarDialogProps) {
  const { user } = useAuthStore();
  const { avatarSeed, setAvatarSeed } = useSettingsStore();
  const { toast } = useToast();

  const [currentSeed, setCurrentSeed] = useState(avatarSeed || user?.name || 'avatar');

  const handleRandomize = () => {
    setCurrentSeed(Math.random().toString(36).substring(7));
  };

  const handleSave = () => {
    setAvatarSeed(currentSeed);
    toast({
      title: 'Avatar updated',
      description: 'Your 3D avatar has been updated successfully.',
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    const defaultSeed = user?.name || 'avatar';
    setCurrentSeed(defaultSeed);
    setAvatarSeed(''); // Reset to empty to use username
    toast({
      title: 'Avatar reset',
      description: 'Your avatar has been reset to default.',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Customize Avatar</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-primary/20 bg-muted relative">
            <Avatar3DViewer key={currentSeed} seed={currentSeed} className="w-full h-full" />
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={handleRandomize} title="Randomize">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleSave} className="min-w-[120px]">
              <Check className="mr-2 h-4 w-4" />
              Save Avatar
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
            Reset to Default
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

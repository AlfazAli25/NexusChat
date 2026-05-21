import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/themeStore';

interface ChatThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const themes = [
  { id: 'default', name: 'Cosmic Blue', color: 'bg-blue-600' },
  { id: 'purple', name: 'Nebula Purple', color: 'bg-purple-600' },
  { id: 'green', name: 'Aurora Green', color: 'bg-emerald-600' },
  { id: 'orange', name: 'Solar Flare', color: 'bg-orange-600' },
  { id: 'pink', name: 'Stardust Pink', color: 'bg-pink-600' },
];

export function ChatThemeDialog({ open, onOpenChange }: ChatThemeDialogProps) {
  const { toast } = useToast();
  const { chatTheme, setChatTheme } = useSettingsStore();

  const handleSelect = (id: string) => {
    setChatTheme(id);
    toast({
      title: 'Theme updated',
      description: 'Chat appearance has been customized.',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Chat Theme</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          {themes.map((theme) => (
            <button
              key={theme.id}
              className={cn(
                'relative flex flex-col items-center gap-2 p-4 rounded-xl border border-border transition-all hover:scale-105 active:scale-95',
                chatTheme === theme.id && 'ring-2 ring-primary border-primary/50'
              )}
              onClick={() => handleSelect(theme.id)}
            >
              <div className={cn('w-12 h-12 rounded-full shadow-lg', theme.color)} />
              <span className="font-medium text-sm">{theme.name}</span>
              {chatTheme === theme.id && (
                <div className="absolute top-2 right-2 p-1 rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Lock, Eye, Clock, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PrivacyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChangePassword: () => void;
}

export function PrivacyDialog({ open, onOpenChange, onChangePassword }: PrivacyDialogProps) {
  const { toast } = useToast();
  const [readReceipts, setReadReceipts] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(true);

  const handleToggle = (setting: string, value: boolean) => {
    if (setting === 'readReceipts') setReadReceipts(value);
    if (setting === 'onlineStatus') setOnlineStatus(value);

    toast({
      title: 'Privacy settings updated',
      description: 'Your changes have been saved locally.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Privacy & Security</DialogTitle>
          <DialogDescription>
            Manage your account privacy and security settings.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Eye className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-sm">Read Receipts</span>
                <span className="text-xs text-muted-foreground">Let others see when you read messages</span>
              </div>
            </div>
            <Switch
              checked={readReceipts}
              onCheckedChange={(c) => handleToggle('readReceipts', c)}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Clock className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-sm">Online Status</span>
                <span className="text-xs text-muted-foreground">Show when you are active</span>
              </div>
            </div>
            <Switch
              checked={onlineStatus}
              onCheckedChange={(c) => handleToggle('onlineStatus', c)}
            />
          </div>

          <div className="h-px bg-border my-2" />

          <Button
            variant="outline"
            className="justify-start gap-3 h-auto py-3"
            onClick={() => {
              onOpenChange(false);
              onChangePassword();
            }}
          >
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <Lock className="h-4 w-4" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium">Change Password</span>
              <span className="text-xs text-muted-foreground">Update your account password</span>
            </div>
          </Button>

          <Button variant="ghost" className="justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10">
            <ShieldAlert className="h-4 w-4" />
            Delete Account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

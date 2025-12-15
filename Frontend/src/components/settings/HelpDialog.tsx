import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, MessageCircle, ExternalLink } from 'lucide-react';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  const handleEmailSupport = () => {
    window.location.href = 'mailto:alfazali499@gmail.com';
  };

  const handleHelpCenter = () => {
    window.open('https://help.nexuschat.com', '_blank');
  };

  const handleContactSupport = () => {
    // In a real app, this might open a chat window or a form
    // For now, we'll redirect to email as well
    window.location.href = 'mailto:alfazali499@gmail.com?subject=Support%20Request';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Help & Support</DialogTitle>
          <DialogDescription>
            Need help with NexusChat? We're here for you.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Button variant="outline" className="h-auto py-4 justify-start gap-4" onClick={handleContactSupport}>
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="flex flex-col items-start gap-1">
              <span className="font-semibold">Contact Support</span>
              <span className="text-xs text-muted-foreground">Chat with our support team</span>
            </div>
          </Button>

          <Button variant="outline" className="h-auto py-4 justify-start gap-4" onClick={handleEmailSupport}>
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div className="flex flex-col items-start gap-1">
              <span className="font-semibold">Email Us</span>
              <span className="text-xs text-muted-foreground">alfazali499@gmail.com</span>
            </div>
          </Button>

          <Button variant="ghost" className="justify-start gap-2 text-primary" onClick={handleHelpCenter}>
            Visit Help Center <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
        <DialogFooter className="text-xs text-center text-muted-foreground">
          NexusChat v1.0.0 • alfazali499@gmail.com
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

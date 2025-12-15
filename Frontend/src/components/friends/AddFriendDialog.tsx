import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Search, UserPlus, Check, Loader2 } from 'lucide-react';
import { usersApi, friendsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/lib/api';

interface AddFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFriendDialog({ open, onOpenChange }: AddFriendDialogProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      const res = await usersApi.searchUsers(query);
      setResults(res.users);
    } catch (error) {
      console.error(error);
      toast({ title: 'Search failed', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    setRequesting(userId);
    try {
      await friendsApi.sendRequest(userId);
      toast({ title: 'Friend request sent!' });
      // update result state to show sent
      setResults(prev => prev.map(u => u.id === userId || u._id === userId ? { ...u, isFriend: true } : u));
    } catch (error) {
      toast({
        title: 'Failed to send request',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setRequesting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Friend</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        <div className="max-h-[300px] overflow-y-auto space-y-2 py-2">
          {results.length === 0 && query && !isLoading && (
            <p className="text-center text-sm text-muted-foreground py-4">No users found</p>
          )}

          {results.map((user) => (
            <div key={user.id || user._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
              {user.isFriend ? (
                <Button size="sm" variant="ghost" disabled>
                  <Check className="h-4 w-4 mr-1" /> Sent
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleSendRequest(user.id || user._id!)}
                  disabled={requesting === (user.id || user._id)}
                >
                  {requesting === (user.id || user._id) ?
                    <Loader2 className="h-4 w-4 animate-spin" /> :
                    <UserPlus className="h-4 w-4" />
                  }
                </Button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

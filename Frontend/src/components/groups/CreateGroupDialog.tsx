import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { friendsApi, groupsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, Lock, Globe } from 'lucide-react';
import { Friend } from '@/stores/chatStore';

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated?: () => void;
}

export function CreateGroupDialog({ open, onOpenChange, onGroupCreated }: CreateGroupDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadFriends();
    }
  }, [open]);

  const loadFriends = async () => {
    try {
      const res = await friendsApi.getFriends();
      setFriends(res.friends);
    } catch (error) {
      console.error('Failed to load friends', error);
    }
  };

  const toggleFriend = (id: string) => {
    setSelectedFriends(prev =>
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: 'Group name is required', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      await groupsApi.createGroup(name, selectedFriends, description, isPrivate);
      toast({ title: 'Group created successfully!' });
      onOpenChange(false);
      setName('');
      setDescription('');
      setSelectedFriends([]);
      if (onGroupCreated) onGroupCreated();
    } catch (error) {
      toast({
        title: 'Failed to create group',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="e.g. Project Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="What's this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-background">
                {isPrivate ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-sm">Private Group</span>
                <span className="text-xs text-muted-foreground">Only members can join</span>
              </div>
            </div>
            <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>

          <div className="space-y-2">
            <Label>Add Members ({selectedFriends.length})</Label>
            <div className="max-h-[200px] overflow-y-auto border rounded-lg p-2 space-y-1">
              {friends.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground p-4">No friends to add</p>
              ) : (
                friends.map(friend => (
                  <div
                    key={friend.id || friend._id}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${selectedFriends.includes(friend.id || friend._id!) ? 'bg-primary/10' : 'hover:bg-muted'}`}
                    onClick={() => toggleFriend(friend.id || friend._id!)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friend.avatar} />
                        <AvatarFallback>{friend.name.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{friend.name}</span>
                    </div>
                    {selectedFriends.includes(friend.id || friend._id!) && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isLoading || !name.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

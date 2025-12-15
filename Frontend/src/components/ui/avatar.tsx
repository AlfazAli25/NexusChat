import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    status?: 'online' | 'offline' | 'away' | 'busy';
    size?: 'sm' | 'md' | 'lg' | 'xl';
  }
>(({ className, status, size = 'md', ...props }, ref) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const statusSizeClasses = {
    sm: 'h-2.5 w-2.5 right-0 bottom-0',
    md: 'h-3 w-3 right-0 bottom-0',
    lg: 'h-3.5 w-3.5 right-0.5 bottom-0.5',
    xl: 'h-4 w-4 right-1 bottom-1',
  };

  const statusColorClasses = {
    online: 'bg-success',
    offline: 'bg-muted-foreground',
    away: 'bg-warning',
    busy: 'bg-destructive',
  };

  return (
    <div className="relative inline-block">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full ring-2 ring-border",
          sizeClasses[size],
          className
        )}
        {...props}
      />
      {status && (
        <span
          className={cn(
            "absolute rounded-full border-2 border-background",
            statusSizeClasses[size],
            statusColorClasses[status]
          )}
        />
      )}
    </div>
  );
});
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full object-cover", className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted text-muted-foreground font-medium", className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

function AvatarGroup({ children, max = 4 }: { children: React.ReactNode; max?: number }) {
  const childArray = React.Children.toArray(children);
  const visibleAvatars = childArray.slice(0, max);
  const remaining = childArray.length - max;

  return (
    <div className="flex -space-x-3">
      {visibleAvatars.map((child, index) => (
        <div key={index} className="ring-2 ring-background rounded-full">
          {child}
        </div>
      ))}
      {remaining > 0 && (
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center ring-2 ring-background">
          <span className="text-muted-foreground text-sm font-medium">+{remaining}</span>
        </div>
      )}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup };

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'circle' | 'text';
}

function Skeleton({ className, variant = 'default', ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-muted/60",
        variant === 'circle' && "rounded-full",
        variant === 'text' && "h-4 rounded",
        className
      )}
      {...props}
    />
  );
}

function ChatSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 animate-fade-in">
      <Skeleton variant="circle" className="h-10 w-10 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="h-4 w-24" />
        <Skeleton variant="text" className="h-4 w-full max-w-[200px]" />
      </div>
    </div>
  );
}

function MessageSkeleton({ align = 'left' }: { align?: 'left' | 'right' }) {
  return (
    <div className={cn("flex gap-3 animate-fade-in", align === 'right' && "flex-row-reverse")}>
      <Skeleton variant="circle" className="h-8 w-8 shrink-0" />
      <div className={cn("space-y-2", align === 'right' && "flex flex-col items-end")}>
        <Skeleton className="h-10 w-48 rounded-2xl" />
        <Skeleton variant="text" className="h-3 w-16" />
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-10 w-full" />
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <ChatSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export { Skeleton, ChatSkeleton, MessageSkeleton, SidebarSkeleton };

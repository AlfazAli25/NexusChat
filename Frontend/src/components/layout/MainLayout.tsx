import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  className?: string;
}

export function MainLayout({ children, sidebar, className }: MainLayoutProps) {
  return (
    <div className={cn('flex flex-col md:flex-row h-screen supports-[height:100dvh]:h-[100dvh] bg-background overflow-hidden', className)}>
      {sidebar}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

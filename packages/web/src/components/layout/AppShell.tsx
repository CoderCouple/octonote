import { type ReactNode } from 'react';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop sidebar -- always visible on md+ screens */}
      <aside
        className={cn(
          'hidden md:flex md:flex-col md:w-[260px] md:min-w-[260px] border-r bg-muted/40',
        )}
      >
        <Sidebar />
      </aside>

      {/* Mobile sidebar via Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={toggleSidebar}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetHeader className="px-4 pt-4">
            <SheetTitle>OctoNote</SheetTitle>
          </SheetHeader>
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar with hamburger */}
        <div className="flex items-center border-b px-4 py-2 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-2 text-lg font-semibold">OctoNote</span>
        </div>

        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}

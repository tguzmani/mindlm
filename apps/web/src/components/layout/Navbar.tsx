'use client';

import { Menu, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { ThemeToggle } from './ThemeToggle';
import { SidebarContent } from './Sidebar';
import { useLayoutStore } from '@/lib/stores/layout-store';

export function Navbar() {
  const { mobileSidebarOpen, setMobileSidebarOpen, toggleChatPanel } =
    useLayoutStore();

  return (
    <header className="flex md:hidden h-14 items-center justify-between border-b border-border bg-surface px-4">
      {/* Left: hamburger */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>
        <SheetContent side="left" className="w-64 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Center: logo */}
      <span className="font-serif text-lg font-semibold text-accent">
        LuminaLM
      </span>

      {/* Right: chat + theme */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleChatPanel}
          aria-label="Toggle chat"
        >
          <MessageCircle className="size-5" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}

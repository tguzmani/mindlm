'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  FolderOpen,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import { useLayoutStore } from '@/lib/stores/layout-store';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Entries', icon: BookOpen, href: '/entries', disabled: false },
  { label: 'Collections', icon: FolderOpen, href: '/collections', disabled: true },
];

export function SidebarContent() {
  const { sidebarOpen, toggleChatPanel } = useLayoutStore();
  const pathname = usePathname();
  const collapsed = !sidebarOpen;

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Link href="/" className="font-serif text-lg font-semibold text-accent">
          {collapsed ? 'L' : 'LuminaLM'}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);

          if (item.disabled) {
            return (
              <span
                key={item.label}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text opacity-40 cursor-not-allowed',
                  collapsed && 'justify-center px-2',
                )}
              >
                <item.icon className="size-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </span>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text transition-colors hover:bg-surface',
                collapsed && 'justify-center px-2',
                active && 'bg-surface font-medium',
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="space-y-1 border-t border-border p-2">
        <button
          onClick={toggleChatPanel}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text transition-colors hover:bg-surface',
            collapsed && 'justify-center px-2',
          )}
        >
          <MessageCircle className="size-4 shrink-0" />
          {!collapsed && <span>Chat</span>}
        </button>
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'px-1')}>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useLayoutStore();

  return (
    <aside
      className={cn(
        'hidden md:flex relative h-screen flex-col border-r border-border bg-surface transition-[width] duration-200',
        sidebarOpen ? 'w-44' : 'w-16',
      )}
    >
      <SidebarContent />
      {/* Collapse toggle */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggleSidebar}
        className="absolute -right-3 top-4 z-10 rounded-full border border-border bg-background shadow-sm"
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="size-3.5" />
        ) : (
          <PanelLeftOpen className="size-3.5" />
        )}
      </Button>
    </aside>
  );
}

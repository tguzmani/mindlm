'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { ChatPanel } from './ChatPanel';

function useIsLoggedIn() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('luminalm_token'));
  }, []);

  return loggedIn;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = useIsLoggedIn();

  if (!loggedIn) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <ChatPanel />
    </div>
  );
}

import { Sidebar } from './Sidebar';
import { BottomTabs } from './BottomTabs';
import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 min-w-0 px-4 md:px-8 py-6 pb-24 md:pb-8">
          {children}
        </main>
      </div>
      <BottomTabs />
    </div>
  );
}

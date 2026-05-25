'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { NAV_ITEMS } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col glass-strong sticky top-0 h-screen transition-all duration-300 border-y-0 border-l-0 rounded-none border-r border-white/[0.06]',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className={cn('flex items-center gap-2 px-4 py-5', collapsed && 'justify-center px-0')}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-bronze flex items-center justify-center font-bold text-bg-base">
          ◆
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-tight">Dashboard</span>
            <span className="text-[10px] text-silver-dim uppercase tracking-widest">personal OS</span>
          </div>
        )}
      </div>

      <nav className="flex-1 flex flex-col gap-0.5 px-2 mt-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-300',
                'hover:bg-white/[0.04] hover:text-white',
                active
                  ? 'bg-gradient-to-r from-gold/15 to-transparent text-white border border-gold/20'
                  : 'text-silver-dim border border-transparent',
                collapsed && 'justify-center px-0',
              )}
            >
              <Icon className={cn('w-4 h-4', active && 'text-gold')} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t border-white/[0.04]">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-silver-dim hover:text-danger hover:bg-danger/5 transition',
              collapsed && 'justify-center px-0',
            )}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </form>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-silver-dim hover:text-white hover:bg-white/[0.03] transition',
            collapsed && 'justify-center px-0',
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

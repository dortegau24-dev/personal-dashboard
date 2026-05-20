'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MOBILE_TABS } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-strong border-t border-white/[0.06] rounded-none">
      <ul className="flex items-center justify-around h-16 px-2 pb-[env(safe-area-inset-bottom)]">
        {MOBILE_TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 min-h-[44px] py-1.5 transition',
                  active ? 'text-gold' : 'text-silver-dim',
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] tracking-wide">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

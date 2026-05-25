'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MoreHorizontal, X } from 'lucide-react';
import { MOBILE_TABS, MOBILE_MORE } from '@/lib/nav';
import { cn } from '@/lib/utils';

export function BottomTabs() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const moreActive = MOBILE_MORE.some((it) =>
    it.href === pathname || (it.href !== '/' && pathname.startsWith(it.href)),
  );

  return (
    <>
      {/* Bottom tabs */}
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
          <li className="flex-1">
            <button
              onClick={() => setOpen(true)}
              className={cn(
                'w-full flex flex-col items-center justify-center gap-1 min-h-[44px] py-1.5 transition',
                moreActive || open ? 'text-gold' : 'text-silver-dim',
              )}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[10px] tracking-wide">More</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Backdrop */}
      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'md:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-white/[0.08] rounded-t-2xl transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3">
          <span className="text-[10px] uppercase tracking-[0.3em] text-silver-dim">All Modules</span>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 -mr-1.5 rounded-lg text-silver-dim hover:text-white hover:bg-white/[0.06] transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Grid of items */}
        <div className="grid grid-cols-3 gap-2 px-4 pb-5">
          {MOBILE_MORE.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border transition',
                  active
                    ? 'bg-gradient-to-br from-gold/15 to-transparent border-gold/30 text-gold'
                    : 'bg-white/[0.03] border-white/[0.06] text-silver-dim hover:bg-white/[0.06] hover:text-white',
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs tracking-wide">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

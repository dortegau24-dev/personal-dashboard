'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MOCK_TICKER, type TickerItem, type TickerSeverity } from '@/lib/ticker-mock';
import { cn } from '@/lib/utils';

const SEVERITY: Record<TickerSeverity, string> = {
  red:   'text-danger animate-pulse-soft',
  amber: 'text-warning',
  gold:  'text-gold-bright',
  white: 'text-silver',
};

const DOT: Record<TickerSeverity, string> = {
  red:   'bg-danger',
  amber: 'bg-warning',
  gold:  'bg-gold-bright',
  white: 'bg-silver/60',
};

function Item({ item }: { item: TickerItem }) {
  const inner = (
    <span className={cn('inline-flex items-center gap-2 num text-xs tracking-wide', SEVERITY[item.severity])}>
      <span className={cn('w-1.5 h-1.5 rounded-full', DOT[item.severity])} />
      {item.message}
    </span>
  );
  return item.href ? (
    <Link href={item.href} className="hover:opacity-100 opacity-90 transition">
      {inner}
    </Link>
  ) : inner;
}

export function Ticker() {
  const [items, setItems] = useState<TickerItem[]>(MOCK_TICKER);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/ticker');
        if (res.ok) {
          const data: TickerItem[] = await res.json();
          if (mounted && data.length > 0) setItems(data);
        }
      } catch {
        // Keep mock data on failure
      }
    }
    load();
    const interval = setInterval(load, 60_000); // Refresh every minute
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const doubled = [...items, ...items];

  return (
    <div className="glass-strong sticky top-0 z-50 border-t-0 border-x-0 rounded-none border-b border-white/[0.06]">
      <div className="ticker-mask overflow-hidden h-9 flex items-center">
        <div className="ticker-track px-6">
          {doubled.map((it, i) => (
            <Item key={`${it.id}-${i}`} item={it} />
          ))}
        </div>
      </div>
    </div>
  );
}

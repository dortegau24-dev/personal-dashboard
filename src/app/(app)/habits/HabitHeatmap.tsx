'use client';

import { GlassCard } from '@/components/GlassCard';
import { cn } from '@/lib/utils';
import type { Habit } from './types';
import { daysAgo, dateRange, formatDate } from '@/lib/dates';

type Props = {
  habits: Habit[];
  recentLogs: { habit_id: string; date: string; completed: boolean }[];
};

export function HabitHeatmap({ habits, recentLogs }: Props) {
  const days = dateRange(daysAgo(89), 90);

  // Build lookup: date → completed count / total
  const logsByDate = new Map<string, { done: number; total: number }>();
  days.forEach((d) => {
    const logsForDay = recentLogs.filter((l) => l.date === d);
    const done = logsForDay.filter((l) => l.completed).length;
    logsByDate.set(d, { done, total: habits.length });
  });

  // Per-habit completion rate
  const habitStats = habits.map((h) => {
    const completed = recentLogs.filter((l) => l.habit_id === h.id && l.completed).length;
    const total = days.length;
    return { habit: h, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }).sort((a, b) => b.rate - a.rate);

  return (
    <div className="space-y-6">
      {/* Calendar heatmap */}
      <GlassCard>
        <h3 className="text-xs uppercase tracking-widest text-silver-dim mb-3">90-day completion heatmap</h3>
        <div className="flex flex-wrap gap-[3px]">
          {days.map((d) => {
            const entry = logsByDate.get(d);
            const pct = entry && entry.total > 0 ? entry.done / entry.total : 0;
            return (
              <div
                key={d}
                title={`${formatDate(d)}: ${Math.round(pct * 100)}%`}
                className={cn(
                  'w-3 h-3 rounded-[3px] transition',
                  pct === 0 && 'bg-white/[0.04]',
                  pct > 0 && pct < 0.5 && 'bg-gold/20',
                  pct >= 0.5 && pct < 0.8 && 'bg-gold/40',
                  pct >= 0.8 && pct < 1 && 'bg-gold/70',
                  pct >= 1 && 'bg-gold',
                )}
              />
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-3 text-[10px] text-muted">
          <span>Less</span>
          <div className="w-3 h-3 rounded-[3px] bg-white/[0.04]" />
          <div className="w-3 h-3 rounded-[3px] bg-gold/20" />
          <div className="w-3 h-3 rounded-[3px] bg-gold/40" />
          <div className="w-3 h-3 rounded-[3px] bg-gold/70" />
          <div className="w-3 h-3 rounded-[3px] bg-gold" />
          <span>More</span>
        </div>
      </GlassCard>

      {/* Per-habit rates */}
      <GlassCard>
        <h3 className="text-xs uppercase tracking-widest text-silver-dim mb-3">Completion rate by habit</h3>
        <div className="space-y-2">
          {habitStats.map(({ habit, rate }) => (
            <div key={habit.id} className="flex items-center gap-3">
              <span className="text-sm truncate flex-1 min-w-0">{habit.name}</span>
              <div className="w-32 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    rate >= 80 ? 'bg-success' : rate >= 50 ? 'bg-gold' : 'bg-danger/60',
                  )}
                  style={{ width: `${rate}%` }}
                />
              </div>
              <span className={cn(
                'num text-xs w-10 text-right',
                rate >= 80 ? 'text-success' : rate >= 50 ? 'text-gold' : 'text-danger',
              )}>
                {rate}%
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

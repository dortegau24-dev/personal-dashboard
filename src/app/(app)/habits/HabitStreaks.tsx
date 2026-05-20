'use client';

import { GlassCard } from '@/components/GlassCard';
import { Flame, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Habit, HabitStreak } from './types';

const MILESTONES = [7, 14, 30, 60, 90, 365];

type Props = {
  habits: Habit[];
  streaks: HabitStreak[];
};

export function HabitStreaks({ habits, streaks }: Props) {
  const sorted = [...habits]
    .map((h) => ({ habit: h, streak: streaks.find((s) => s.habit_id === h.id) }))
    .sort((a, b) => (b.streak?.current_streak ?? 0) - (a.streak?.current_streak ?? 0));

  if (sorted.length === 0) {
    return <GlassCard className="text-center py-12 text-silver-dim text-sm">No habits to show streaks for.</GlassCard>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {sorted.map(({ habit, streak }) => {
        const current = streak?.current_streak ?? 0;
        const longest = streak?.longest_streak ?? 0;
        const nextMilestone = MILESTONES.find((m) => m > current) ?? 365;
        const pct = Math.min(100, Math.round((current / nextMilestone) * 100));
        const atMilestone = MILESTONES.includes(current) && current > 0;

        return (
          <GlassCard key={habit.id} hover className={cn('p-4', atMilestone && 'border-gold/30')}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium truncate">{habit.name}</span>
              {atMilestone && <Trophy className="w-4 h-4 text-gold" />}
            </div>

            <div className="flex items-baseline gap-2 mb-3">
              <div className="flex items-center gap-1">
                <Flame className={cn('w-4 h-4', current > 0 ? 'text-gold' : 'text-muted')} />
                <span className={cn('num text-2xl font-semibold', current > 0 ? 'text-gold-gradient' : 'text-muted')}>
                  {current}
                </span>
              </div>
              <span className="text-xs text-silver-dim">
                day{current !== 1 ? 's' : ''} current
              </span>
              <span className="text-xs text-muted ml-auto">
                best: <span className="num text-silver">{longest}</span>
              </span>
            </div>

            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted mt-1">
              {current} / {nextMilestone} to next milestone
            </p>
          </GlassCard>
        );
      })}
    </div>
  );
}

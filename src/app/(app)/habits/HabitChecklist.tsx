'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/GlassCard';
import { today } from '@/lib/dates';
import { Check, ShieldOff, Flame, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Habit, HabitLog, HabitStreak } from './types';

const STREAK_MILESTONES = [7, 14, 30, 60, 90, 365];

type Props = {
  habits: Habit[];
  logs: HabitLog[];
  streaks: HabitStreak[];
  isFreezeDay: boolean;
  onToggle: () => void;
  onEdit: (h: Habit) => void;
};

const TIME_LABELS: Record<string, string> = {
  morning: 'Morning routine',
  afternoon: 'Afternoon',
  evening: 'Evening routine',
  anytime: 'Anytime',
};

const CATEGORY_COLORS: Record<string, string> = {
  health: 'text-success',
  training: 'text-gold',
  mental: 'text-blue-400',
  business: 'text-bronze',
  personal: 'text-silver',
};

export function HabitChecklist({ habits, logs, streaks, isFreezeDay, onToggle, onEdit }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState<string | null>(null);

  const groups = habits.reduce<Record<string, Habit[]>>((acc, h) => {
    const slot = h.time_of_day ?? 'anytime';
    (acc[slot] ??= []).push(h);
    return acc;
  }, {});

  const order = ['morning', 'afternoon', 'evening', 'anytime'];

  async function toggle(habit: Habit) {
    setLoading(habit.id);
    const existingLog = logs.find((l) => l.habit_id === habit.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (existingLog) {
      await supabase.from('habit_logs').update({ completed: !existingLog.completed }).eq('id', existingLog.id);
    } else {
      await supabase.from('habit_logs').insert({ user_id: user.id, habit_id: habit.id, date: today(), completed: true });
    }

    // Update streak
    const streak = streaks.find((s) => s.habit_id === habit.id);
    const wasCompleted = existingLog?.completed ?? false;
    const nowCompleted = !wasCompleted;

    if (streak) {
      const updates: Partial<HabitStreak> = {};
      if (nowCompleted) {
        updates.current_streak = streak.current_streak + 1;
        updates.last_completed_date = today();
        if ((streak.current_streak + 1) > streak.longest_streak) {
          updates.longest_streak = streak.current_streak + 1;
        }
      } else {
        updates.current_streak = Math.max(0, streak.current_streak - 1);
      }
      await supabase.from('habit_streaks').update(updates).eq('id', streak.id);
    } else if (nowCompleted) {
      await supabase.from('habit_streaks').insert({
        user_id: user.id,
        habit_id: habit.id,
        current_streak: 1,
        longest_streak: 1,
        last_completed_date: today(),
      });
    }

    setLoading(null);
    onToggle();
  }

  if (habits.length === 0) {
    return (
      <GlassCard className="text-center py-12">
        <p className="text-silver-dim text-sm mb-2">No habits yet</p>
        <p className="text-xs text-muted">Click &quot;Add habit&quot; to create your first daily discipline.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {order.filter((slot) => groups[slot]?.length).map((slot) => (
        <div key={slot}>
          <h3 className="text-[10px] uppercase tracking-widest text-silver-dim mb-2">{TIME_LABELS[slot]}</h3>
          <div className="space-y-1.5">
            {groups[slot].map((habit) => {
              const log = logs.find((l) => l.habit_id === habit.id);
              const done = log?.completed ?? false;
              const streak = streaks.find((s) => s.habit_id === habit.id);
              const currentStreak = streak?.current_streak ?? 0;
              const milestone = STREAK_MILESTONES.find((m) => currentStreak === m);

              return (
                <GlassCard
                  key={habit.id}
                  hover
                  className={cn(
                    'flex items-center gap-3 p-3 !rounded-xl group cursor-pointer',
                    done && 'border-gold/20',
                    milestone && 'animate-pr-flash',
                  )}
                  onClick={() => toggle(habit)}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition',
                    done
                      ? habit.type === 'negative' ? 'bg-success/20 border-success' : 'bg-gold/20 border-gold'
                      : 'border-white/20 hover:border-gold/40',
                    loading === habit.id && 'animate-pulse',
                  )}>
                    {done && (
                      habit.type === 'negative'
                        ? <ShieldOff className="w-3 h-3 text-success" />
                        : <Check className="w-3 h-3 text-gold" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-sm transition',
                        done ? 'text-white' : 'text-silver',
                      )}>
                        {habit.name}
                      </span>
                      {habit.type === 'negative' && (
                        <span className="text-[9px] uppercase tracking-widest text-amber-400/70 bg-amber-400/10 px-1.5 py-0.5 rounded">
                          avoid
                        </span>
                      )}
                      {habit.category && (
                        <span className={cn('text-[9px] uppercase tracking-widest opacity-60', CATEGORY_COLORS[habit.category] ?? 'text-silver-dim')}>
                          {habit.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {currentStreak > 0 && (
                    <div className={cn(
                      'flex items-center gap-1 num text-xs',
                      milestone ? 'text-gold' : 'text-silver-dim',
                    )}>
                      <Flame className={cn('w-3 h-3', milestone && 'text-gold')} />
                      {currentStreak}
                    </div>
                  )}

                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(habit); }}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition p-1"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </GlassCard>
              );
            })}
          </div>
        </div>
      ))}

      {isFreezeDay && (
        <p className="text-xs text-bronze text-center mt-2">
          Freeze day active — streaks are preserved regardless of completion.
        </p>
      )}
    </div>
  );
}

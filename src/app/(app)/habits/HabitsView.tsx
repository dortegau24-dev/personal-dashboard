'use client';

import { useState, useCallback } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Label, LabelText } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { today } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { Plus, Check, Trash2, Flame } from 'lucide-react';
import type { Habit, HabitLog, HabitStreak } from './types';

type Props = {
  initialHabits: Habit[];
  initialLogs: HabitLog[];
  initialStreaks: HabitStreak[];
};

export function HabitsView({ initialHabits, initialLogs, initialStreaks }: Props) {
  const supabase = createClient();
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [logs, setLogs] = useState<HabitLog[]>(initialLogs);
  const [streaks, setStreaks] = useState<HabitStreak[]>(initialStreaks);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const todayDate = today();
  const completedCount = habits.filter((h) => logs.find((l) => l.habit_id === h.id)?.completed).length;
  const pct = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  const refreshData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [habitsRes, logsRes, streaksRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at'),
      supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', todayDate),
      supabase.from('habit_streaks').select('*').eq('user_id', user.id),
    ]);
    if (habitsRes.data) setHabits(habitsRes.data);
    if (logsRes.data) setLogs(logsRes.data);
    if (streaksRes.data) setStreaks(streaksRes.data);
  }, [supabase, todayDate]);

  async function addHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('habits').insert({
      user_id: user.id, name: newName.trim(), category: 'personal',
      type: 'positive', frequency: 'daily', active_days: [0, 1, 2, 3, 4, 5, 6],
      time_of_day: 'anytime', is_active: true,
    });
    setNewName('');
    setShowAdd(false);
    setSaving(false);
    refreshData();
  }

  async function removeHabit(id: string) {
    await supabase.from('habits').update({ is_active: false }).eq('id', id);
    setHabits((p) => p.filter((h) => h.id !== id));
  }

  async function toggle(habit: Habit) {
    setLoading(habit.id);
    const existingLog = logs.find((l) => l.habit_id === habit.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (existingLog) {
      await supabase.from('habit_logs').update({ completed: !existingLog.completed }).eq('id', existingLog.id);
    } else {
      await supabase.from('habit_logs').insert({ user_id: user.id, habit_id: habit.id, date: todayDate, completed: true });
    }

    // Update streak
    const streak = streaks.find((s) => s.habit_id === habit.id);
    const wasCompleted = existingLog?.completed ?? false;
    const nowCompleted = !wasCompleted;

    if (streak) {
      const updates: Partial<HabitStreak> = {};
      if (nowCompleted) {
        updates.current_streak = streak.current_streak + 1;
        updates.last_completed_date = todayDate;
        if ((streak.current_streak + 1) > streak.longest_streak) {
          updates.longest_streak = streak.current_streak + 1;
        }
      } else {
        updates.current_streak = Math.max(0, streak.current_streak - 1);
      }
      await supabase.from('habit_streaks').update(updates).eq('id', streak.id);
    } else if (nowCompleted) {
      await supabase.from('habit_streaks').insert({
        user_id: user.id, habit_id: habit.id,
        current_streak: 1, longest_streak: 1, last_completed_date: todayDate,
      });
    }

    setLoading(null);
    refreshData();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-silver-dim mb-1">Discipline</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Habits</h1>
        </div>
        <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAdd(true)}>
          Add habit
        </Button>
      </header>

      {/* Score bar */}
      <GlassCard className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-silver-dim uppercase tracking-widest">Today&apos;s completion</span>
            <span className="num text-sm">
              <span className="text-gold font-semibold">{completedCount}</span>
              <span className="text-muted"> / {habits.length}</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-gold/70 to-gold" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="num text-3xl font-semibold text-gold-gradient">{pct}%</div>
      </GlassCard>

      {/* Habit list */}
      {habits.length === 0 ? (
        <GlassCard className="text-center py-12">
          <p className="text-silver-dim text-sm mb-2">No habits yet</p>
          <p className="text-xs text-muted">Click &quot;Add habit&quot; to create your first daily discipline.</p>
        </GlassCard>
      ) : (
        <div className="space-y-1.5">
          {habits.map((habit) => {
            const log = logs.find((l) => l.habit_id === habit.id);
            const done = log?.completed ?? false;
            const streak = streaks.find((s) => s.habit_id === habit.id);
            const currentStreak = streak?.current_streak ?? 0;

            return (
              <GlassCard
                key={habit.id}
                hover
                className={cn('flex items-center gap-3 p-3 !rounded-xl group cursor-pointer', done && 'border-gold/20')}
                onClick={() => toggle(habit)}
              >
                <div className={cn(
                  'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition',
                  done ? 'bg-gold/20 border-gold' : 'border-white/20 hover:border-gold/40',
                  loading === habit.id && 'animate-pulse',
                )}>
                  {done && <Check className="w-3 h-3 text-gold" />}
                </div>

                <span className={cn('flex-1 text-sm transition', done ? 'text-white' : 'text-silver')}>
                  {habit.name}
                </span>

                {currentStreak > 0 && (
                  <div className={cn('flex items-center gap-1 num text-xs', currentStreak >= 7 ? 'text-gold' : 'text-silver-dim')}>
                    <Flame className={cn('w-3 h-3', currentStreak >= 7 && 'text-gold')} />
                    {currentStreak}
                  </div>
                )}

                <button
                  onClick={(e) => { e.stopPropagation(); removeHabit(habit.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-danger transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </GlassCard>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Habit">
        <form onSubmit={addHabit} className="space-y-3">
          <Label><LabelText>Habit name</LabelText><Input required placeholder="e.g. Cold shower, Read 30 min..." value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus /></Label>
          <Button type="submit" loading={saving} className="w-full mt-2">Add habit</Button>
        </form>
      </Modal>
    </div>
  );
}

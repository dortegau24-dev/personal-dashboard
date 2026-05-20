'use client';

import { useState, useCallback } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/Button';
import { HabitChecklist } from './HabitChecklist';
import { HabitManager } from './HabitManager';
import { HabitStreaks } from './HabitStreaks';
import { HabitHeatmap } from './HabitHeatmap';
import { FreezeDayManager } from './FreezeDayManager';
import { createClient } from '@/lib/supabase/client';
import { today, dayOfWeek } from '@/lib/dates';
import { Plus, Flame, CalendarHeart, BarChart3 } from 'lucide-react';
import type { Habit, HabitLog, HabitStreak, FreezeDay } from './types';

type Props = {
  initialHabits: Habit[];
  initialLogs: HabitLog[];
  initialStreaks: HabitStreak[];
  recentLogs: { habit_id: string; date: string; completed: boolean }[];
  freezeDays: FreezeDay[];
};

export function HabitsView({ initialHabits, initialLogs, initialStreaks, recentLogs, freezeDays: initialFreezeDays }: Props) {
  const supabase = createClient();
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [logs, setLogs] = useState<HabitLog[]>(initialLogs);
  const [streaks, setStreaks] = useState<HabitStreak[]>(initialStreaks);
  const [freezeDays, setFreezeDays] = useState<FreezeDay[]>(initialFreezeDays);
  const [showManager, setShowManager] = useState(false);
  const [showFreezeManager, setShowFreezeManager] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [tab, setTab] = useState<'today' | 'streaks' | 'analytics'>('today');

  const todayDate = today();
  const dow = dayOfWeek(todayDate);
  const isFreezeDay = freezeDays.some((f) => f.date === todayDate);

  const todayHabits = habits.filter((h) => {
    const days: number[] = Array.isArray(h.active_days) ? h.active_days : [0, 1, 2, 3, 4, 5, 6];
    return days.includes(dow);
  });

  const completedCount = todayHabits.filter((h) => {
    const log = logs.find((l) => l.habit_id === h.id);
    return log?.completed;
  }).length;
  const pct = todayHabits.length > 0 ? Math.round((completedCount / todayHabits.length) * 100) : 0;

  const refreshData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [habitsRes, logsRes, streaksRes, freezeRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).eq('is_active', true).order('time_of_day').order('created_at'),
      supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', todayDate),
      supabase.from('habit_streaks').select('*').eq('user_id', user.id),
      supabase.from('freeze_days').select('*').eq('user_id', user.id).gte('date', `${new Date().getFullYear()}-01-01`),
    ]);
    if (habitsRes.data) setHabits(habitsRes.data);
    if (logsRes.data) setLogs(logsRes.data);
    if (streaksRes.data) setStreaks(streaksRes.data);
    if (freezeRes.data) setFreezeDays(freezeRes.data);
  }, [supabase, todayDate]);

  const TABS = [
    { key: 'today', label: 'Today', icon: CalendarHeart },
    { key: 'streaks', label: 'Streaks', icon: Flame },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-silver-dim mb-1">Discipline</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Habits</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowFreezeManager(true)}>
            <CalendarHeart className="w-3.5 h-3.5" />
            Freeze days
          </Button>
          <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setEditingHabit(null); setShowManager(true); }}>
            Add habit
          </Button>
        </div>
      </header>

      {/* Score bar */}
      <GlassCard className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-silver-dim uppercase tracking-widest">Today&apos;s completion</span>
            <span className="num text-sm">
              <span className="text-gold font-semibold">{completedCount}</span>
              <span className="text-muted"> / {todayHabits.length}</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-gold/70 to-gold"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="num text-3xl font-semibold text-gold-gradient">{pct}%</div>
        {isFreezeDay && (
          <span className="text-[10px] uppercase tracking-widest text-bronze border border-bronze/30 rounded-full px-2 py-0.5">
            Freeze day
          </span>
        )}
      </GlassCard>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 glass rounded-xl w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${
              tab === key ? 'bg-white/[0.08] text-white' : 'text-silver-dim hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'today' && (
        <HabitChecklist
          habits={todayHabits}
          logs={logs}
          streaks={streaks}
          isFreezeDay={isFreezeDay}
          onToggle={refreshData}
          onEdit={(h) => { setEditingHabit(h); setShowManager(true); }}
        />
      )}

      {tab === 'streaks' && (
        <HabitStreaks habits={habits} streaks={streaks} />
      )}

      {tab === 'analytics' && (
        <HabitHeatmap habits={habits} recentLogs={recentLogs} />
      )}

      <HabitManager
        open={showManager}
        onClose={() => { setShowManager(false); setEditingHabit(null); }}
        habit={editingHabit}
        onSaved={refreshData}
      />

      <FreezeDayManager
        open={showFreezeManager}
        onClose={() => setShowFreezeManager(false)}
        freezeDays={freezeDays}
        onSaved={refreshData}
      />
    </div>
  );
}

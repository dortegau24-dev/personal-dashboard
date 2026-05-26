'use client';

import { useState, useCallback } from 'react';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Label, LabelText } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { today } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { Plus, Check, Trash2, Flame, Sparkles, TrendingDown, Lightbulb, AlertTriangle, Loader2 } from 'lucide-react';
import type { Habit, HabitLog, HabitStreak } from './types';

type AIInsights = {
  summary: string;
  patterns: string[];
  risks: string[];
  suggestions: string[];
};

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
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsErr, setInsightsErr] = useState<string | null>(null);

  async function generateInsights() {
    setInsightsLoading(true);
    setInsightsErr(null);
    try {
      const res = await fetch('/api/ai/habits-insights', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setInsightsErr(json.error ?? 'Failed to generate insights');
      } else {
        setInsights(json);
      }
    } catch (e) {
      setInsightsErr(e instanceof Error ? e.message : 'Network error');
    }
    setInsightsLoading(false);
  }

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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Session expired — please log in again.'); window.location.href = '/login'; return; }
      const { error } = await supabase.from('habits').insert({
        user_id: user.id, name: newName.trim(), category: 'personal',
        type: 'positive', frequency: 'daily', active_days: [0, 1, 2, 3, 4, 5, 6],
        time_of_day: 'anytime', is_active: true,
      });
      if (error) { alert(`Failed to add habit: ${error.message}`); return; }
      setNewName('');
      setShowAdd(false);
      refreshData();
    } finally {
      setSaving(false);
    }
  }

  async function removeHabit(id: string) {
    await supabase.from('habits').update({ is_active: false }).eq('id', id);
    setHabits((p) => p.filter((h) => h.id !== id));
  }

  async function toggle(habit: Habit) {
    setLoading(habit.id);
    try {
    const existingLog = logs.find((l) => l.habit_id === habit.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('Session expired — please log in again.'); window.location.href = '/login'; return; }

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

    refreshData();
    } finally {
      setLoading(null);
    }
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

      {/* AI Insights card */}
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="text-xs uppercase tracking-widest text-silver-dim">AI Insights</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            loading={insightsLoading}
            onClick={generateInsights}
            icon={insightsLoading ? undefined : <Sparkles className="w-3 h-3" />}
          >
            {insights ? 'Regenerate' : 'Generate insights'}
          </Button>
        </div>

        {insightsErr && <p className="text-xs text-danger mb-2">{insightsErr}</p>}

        {!insights && !insightsLoading && !insightsErr && (
          <p className="text-sm text-silver-dim">
            Tap <strong>Generate insights</strong> for a 30-day analysis of patterns, streak risks, and tips.
          </p>
        )}

        {insightsLoading && (
          <div className="flex items-center gap-2 text-sm text-silver-dim py-4 justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-gold" />
            Analyzing 30 days of habit data…
          </div>
        )}

        {insights && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-white/90">{insights.summary}</p>

            {insights.patterns?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gold/70 mb-1.5 flex items-center gap-1.5">
                  <TrendingDown className="w-3 h-3" /> Patterns
                </p>
                {insights.patterns.map((p, i) => (
                  <p key={i} className="text-xs text-gold/90 pl-3 border-l border-gold/20 mb-1">{p}</p>
                ))}
              </div>
            )}

            {insights.risks?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-danger/70 mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3" /> At risk
                </p>
                {insights.risks.map((r, i) => (
                  <p key={i} className="text-xs text-danger/90 pl-3 border-l border-danger/20 mb-1">{r}</p>
                ))}
              </div>
            )}

            {insights.suggestions?.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-silver/70 mb-1.5 flex items-center gap-1.5">
                  <Lightbulb className="w-3 h-3" /> Suggestions
                </p>
                {insights.suggestions.map((s, i) => (
                  <p key={i} className="text-xs text-silver/80 pl-3 border-l border-silver/20 mb-1">{s}</p>
                ))}
              </div>
            )}
          </div>
        )}
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

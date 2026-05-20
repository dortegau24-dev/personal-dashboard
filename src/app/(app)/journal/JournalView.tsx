'use client';

import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, Label, LabelText } from '@/components/ui/Input';
import { today, daysAgo, formatDate, addDays } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { Plus, SmilePlus, Zap, Sun, Cloud, Moon } from 'lucide-react';

type MoodEntry = {
  id: string;
  user_id: string;
  date: string;
  time_of_day: 'morning' | 'afternoon' | 'evening' | null;
  mood_score: number | null;
  energy_score: number | null;
  notes: string | null;
  tags: string[];
  created_at: string;
};

const FACTOR_TAGS = ['sleep', 'training', 'social', 'work stress', 'nutrition', 'weather', 'caffeine', 'rest day'];
const TOD_ICONS = { morning: Sun, afternoon: Cloud, evening: Moon };
const MOOD_LABELS = ['', 'Very low', 'Low', 'Neutral', 'Good', 'Great'];
const ENERGY_LABELS = ['', 'Exhausted', 'Low', 'Moderate', 'High', 'Peak'];

type Props = { initialEntries: MoodEntry[] };

export function JournalView({ initialEntries }: Props) {
  const supabase = createClient();
  const [entries, setEntries] = useState(initialEntries);
  const [showForm, setShowForm] = useState(false);
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [tod, setTod] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const todayDate = today();

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('mood_entries').select('*').eq('user_id', user.id).gte('date', daysAgo(89)).order('date', { ascending: false }).order('created_at', { ascending: false });
    if (data) setEntries(data);
  }, [supabase]);

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('mood_entries').insert({
      user_id: user.id,
      date: todayDate,
      time_of_day: tod,
      mood_score: mood,
      energy_score: energy,
      notes: notes.trim() || null,
      tags,
    });
    setSaving(false);
    setShowForm(false);
    setNotes('');
    setTags([]);
    refresh();
  }

  // 30-day chart data
  const chartData = useMemo(() => {
    const days: { date: string; mood: number | null; energy: number | null }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(todayDate, -i);
      const dayEntries = entries.filter((e) => e.date === d);
      const avgMood = dayEntries.length > 0 ? dayEntries.reduce((s, e) => s + (e.mood_score ?? 0), 0) / dayEntries.length : null;
      const avgEnergy = dayEntries.length > 0 ? dayEntries.reduce((s, e) => s + (e.energy_score ?? 0), 0) / dayEntries.length : null;
      days.push({ date: d, mood: avgMood ? Math.round(avgMood * 10) / 10 : null, energy: avgEnergy ? Math.round(avgEnergy * 10) / 10 : null });
    }
    return days;
  }, [entries, todayDate]);

  const todayEntries = entries.filter((e) => e.date === todayDate);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-silver-dim mb-1">Reflection</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Mood &amp; Energy</h1>
        </div>
        <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowForm(true)}>
          Log entry
        </Button>
      </header>

      {/* Quick entry form */}
      {showForm && (
        <GlassCard strong className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <LabelText>Mood ({MOOD_LABELS[mood]})</LabelText>
              <div className="flex items-center gap-2 mt-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    onClick={() => setMood(v)}
                    className={cn(
                      'w-10 h-10 rounded-xl border transition flex items-center justify-center num text-sm',
                      mood === v ? 'bg-gold/20 border-gold text-gold' : 'bg-white/[0.03] border-white/[0.06] text-muted hover:text-white',
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <LabelText>Energy ({ENERGY_LABELS[energy]})</LabelText>
              <div className="flex items-center gap-2 mt-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    onClick={() => setEnergy(v)}
                    className={cn(
                      'w-10 h-10 rounded-xl border transition flex items-center justify-center num text-sm',
                      energy === v ? 'bg-blue-400/20 border-blue-400 text-blue-400' : 'bg-white/[0.03] border-white/[0.06] text-muted hover:text-white',
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <Label>
              <LabelText>Time of day</LabelText>
              <Select value={tod} onChange={(e) => setTod(e.target.value as typeof tod)} className="mt-1">
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
              </Select>
            </Label>
          </div>

          <div>
            <LabelText>Factors</LabelText>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {FACTOR_TAGS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs border transition',
                    tags.includes(t) ? 'bg-gold/15 border-gold/30 text-gold' : 'bg-white/[0.03] border-white/[0.06] text-muted hover:text-silver',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <Label>
            <LabelText>Notes (optional)</LabelText>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What's influencing your mood or energy today?" />
          </Label>

          <div className="flex gap-2">
            <Button loading={saving} onClick={save}>Save entry</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </GlassCard>
      )}

      {/* 30-day mini chart */}
      <GlassCard>
        <LabelText>30-day trend</LabelText>
        <div className="flex items-end gap-[2px] h-20 mt-2">
          {chartData.map(({ date, mood: m, energy: e }) => {
            const val = m ?? 0;
            const eVal = e ?? 0;
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-[1px]" title={`${formatDate(date)}: mood ${m ?? '—'} / energy ${e ?? '—'}`}>
                <div className="w-full flex flex-col gap-[1px] justify-end h-16">
                  <div className="w-full bg-gold/40 rounded-sm" style={{ height: `${(val / 5) * 100}%` }} />
                  <div className="w-full bg-blue-400/40 rounded-sm" style={{ height: `${(eVal / 5) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-muted">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-gold/40" /> Mood</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400/40" /> Energy</span>
        </div>
      </GlassCard>

      {/* Today's entries */}
      <div>
        <LabelText>Today&apos;s entries</LabelText>
        {todayEntries.length === 0 ? (
          <GlassCard className="text-center py-8 mt-2">
            <p className="text-silver-dim text-sm">No entries yet today.</p>
          </GlassCard>
        ) : (
          <div className="space-y-2 mt-2">
            {todayEntries.map((entry) => {
              const TodIcon = entry.time_of_day ? TOD_ICONS[entry.time_of_day] : Sun;
              return (
                <GlassCard key={entry.id} hover className="p-4 flex items-start gap-3">
                  <TodIcon className="w-4 h-4 text-silver-dim mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="flex items-center gap-1 text-xs">
                        <SmilePlus className="w-3 h-3 text-gold" />
                        <span className="num text-gold">{entry.mood_score}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs">
                        <Zap className="w-3 h-3 text-blue-400" />
                        <span className="num text-blue-400">{entry.energy_score}</span>
                      </span>
                      <span className="text-[10px] text-muted capitalize">{entry.time_of_day}</span>
                    </div>
                    {entry.notes && <p className="text-xs text-silver leading-relaxed">{entry.notes}</p>}
                    {entry.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {entry.tags.map((t) => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-muted">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

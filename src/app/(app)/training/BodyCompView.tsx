'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { today } from '@/lib/dates';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Label, LabelText } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Scale, Heart, Activity, Moon, Zap, TrendingDown, TrendingUp } from 'lucide-react';
import type { WeightEntry, WhoopData } from './types';

type Props = {
  weightEntries: WeightEntry[];
  whoopData: WhoopData[];
  onChanged: () => void;
};

export function BodyCompView({ weightEntries: initWeights, whoopData: initWhoop, onChanged }: Props) {
  const supabase = createClient();
  const [weights, setWeights] = useState(initWeights);
  const [whoop] = useState(initWhoop);
  const [showAdd, setShowAdd] = useState(false);
  const [showWhoop, setShowWhoop] = useState(false);
  const [saving, setSaving] = useState(false);

  // Weight form
  const [weightVal, setWeightVal] = useState('');
  const [weightDate, setWeightDate] = useState(today());
  const [weightNotes, setWeightNotes] = useState('');

  // Whoop manual entry form
  const [whoopDate, setWhoopDate] = useState(today());
  const [recovery, setRecovery] = useState('');
  const [hrv, setHrv] = useState('');
  const [restingHr, setRestingHr] = useState('');
  const [strain, setStrain] = useState('');
  const [sleepPerf, setSleepPerf] = useState('');
  const [whoopCalories, setWhoopCalories] = useState('');

  // Latest weight + trend
  const sortedWeights = useMemo(() => [...weights].sort((a, b) => b.date.localeCompare(a.date)), [weights]);
  const latestWeight = sortedWeights[0] ?? null;
  const previousWeight = sortedWeights[1] ?? null;
  const weightDiff = latestWeight && previousWeight ? Number(latestWeight.weight_kg) - Number(previousWeight.weight_kg) : null;

  // Latest whoop
  const sortedWhoop = useMemo(() => [...whoop].sort((a, b) => b.date.localeCompare(a.date)), [whoop]);
  const latestWhoop = sortedWhoop[0] ?? null;

  async function addWeight(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('weight_entries').insert({
      user_id: user.id,
      weight_kg: Number(weightVal),
      date: weightDate,
      notes: weightNotes || null,
    }).select().single();
    if (!error && data) {
      setWeights((prev) => [data, ...prev]);
      setWeightVal('');
      setWeightNotes('');
      setShowAdd(false);
      onChanged();
    }
    setSaving(false);
  }

  async function deleteWeight(id: string) {
    await supabase.from('weight_entries').delete().eq('id', id);
    setWeights((prev) => prev.filter((w) => w.id !== id));
    onChanged();
  }

  async function addWhoopEntry(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('whoop_data').upsert({
      user_id: user.id,
      date: whoopDate,
      recovery_score: recovery ? Number(recovery) : null,
      hrv: hrv ? Number(hrv) : null,
      resting_hr: restingHr ? Number(restingHr) : null,
      strain: strain ? Number(strain) : null,
      sleep_performance: sleepPerf ? Number(sleepPerf) : null,
      calories: whoopCalories ? Number(whoopCalories) : null,
    }, { onConflict: 'user_id,date', ignoreDuplicates: false });
    setShowWhoop(false);
    setSaving(false);
    onChanged();
  }

  function recoveryColor(score: number | null): string {
    if (score == null) return 'text-silver-dim';
    if (score >= 67) return 'text-success';
    if (score >= 34) return 'text-warning';
    return 'text-danger';
  }

  return (
    <div className="space-y-4">
      {/* Weight + Whoop overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Current weight */}
        <GlassCard hover className="p-4 text-center">
          <Scale className="w-4 h-4 text-gold mx-auto mb-1" />
          <p className="num text-2xl font-semibold text-gold">
            {latestWeight ? Number(latestWeight.weight_kg).toFixed(1) : '—'}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">kg</p>
          {weightDiff !== null && (
            <div className="flex items-center justify-center gap-1 mt-1">
              {weightDiff > 0 ? <TrendingUp className="w-3 h-3 text-danger" /> : weightDiff < 0 ? <TrendingDown className="w-3 h-3 text-success" /> : null}
              <span className={cn('num text-[11px]', weightDiff > 0 ? 'text-danger' : weightDiff < 0 ? 'text-success' : 'text-muted')}>
                {weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)} kg
              </span>
            </div>
          )}
        </GlassCard>

        {/* Whoop Recovery */}
        <GlassCard hover className="p-4 text-center">
          <Heart className="w-4 h-4 text-success mx-auto mb-1" />
          <p className={cn('num text-2xl font-semibold', recoveryColor(latestWhoop?.recovery_score ?? null))}>
            {latestWhoop?.recovery_score != null ? `${latestWhoop.recovery_score}%` : '—'}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">Recovery</p>
        </GlassCard>

        {/* HRV */}
        <GlassCard hover className="p-4 text-center">
          <Activity className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <p className="num text-2xl font-semibold text-blue-400">
            {latestWhoop?.hrv != null ? Math.round(Number(latestWhoop.hrv)) : '—'}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">HRV (ms)</p>
        </GlassCard>

        {/* Strain */}
        <GlassCard hover className="p-4 text-center">
          <Zap className="w-4 h-4 text-bronze mx-auto mb-1" />
          <p className="num text-2xl font-semibold text-bronze">
            {latestWhoop?.strain != null ? Number(latestWhoop.strain).toFixed(1) : '—'}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">Strain</p>
        </GlassCard>
      </div>

      {/* Whoop sleep breakdown */}
      {latestWhoop && (latestWhoop.deep_sleep_min || latestWhoop.rem_min || latestWhoop.light_sleep_min) && (
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Moon className="w-4 h-4 text-indigo-400" />
            <span className="text-xs uppercase tracking-widest text-silver-dim">Sleep breakdown</span>
            <span className="text-[10px] text-muted ml-auto num">{latestWhoop.date}</span>
          </div>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="num text-lg font-semibold text-indigo-400">{latestWhoop.deep_sleep_min ?? '—'}</p>
              <p className="text-[10px] text-silver-dim">Deep (min)</p>
            </div>
            <div>
              <p className="num text-lg font-semibold text-purple-400">{latestWhoop.rem_min ?? '—'}</p>
              <p className="text-[10px] text-silver-dim">REM (min)</p>
            </div>
            <div>
              <p className="num text-lg font-semibold text-blue-300">{latestWhoop.light_sleep_min ?? '—'}</p>
              <p className="text-[10px] text-silver-dim">Light (min)</p>
            </div>
            <div>
              <p className="num text-lg font-semibold text-amber-400">{latestWhoop.awake_min ?? '—'}</p>
              <p className="text-[10px] text-silver-dim">Awake (min)</p>
            </div>
          </div>
          {latestWhoop.sleep_performance != null && (
            <p className="text-xs text-silver-dim mt-2 num text-center">Sleep performance: {latestWhoop.sleep_performance}%</p>
          )}
        </GlassCard>
      )}

      {/* Manual Whoop entry button */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" icon={<Heart className="w-3.5 h-3.5" />} onClick={() => setShowWhoop(true)}>
          Log Whoop data
        </Button>
      </div>

      {/* Weight history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-widest text-silver-dim">Weight history</span>
          <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAdd(true)}>Log weight</Button>
        </div>
        {sortedWeights.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Scale className="w-10 h-10 text-silver-dim/30 mx-auto mb-3" />
            <p className="text-sm text-silver-dim">No weight entries yet</p>
          </GlassCard>
        ) : (
          <>
            {/* Mini chart (bar representation) */}
            {sortedWeights.length > 1 && (
              <GlassCard className="p-4 mb-3">
                <div className="flex items-end gap-1 h-20">
                  {sortedWeights.slice(0, 30).reverse().map((w) => {
                    const min = Math.min(...sortedWeights.map((x) => Number(x.weight_kg)));
                    const max = Math.max(...sortedWeights.map((x) => Number(x.weight_kg)));
                    const range = max - min || 1;
                    const pct = ((Number(w.weight_kg) - min) / range) * 80 + 20;
                    return (
                      <div key={w.id} className="flex-1 flex flex-col items-center" title={`${w.date}: ${Number(w.weight_kg).toFixed(1)}kg`}>
                        <div className="w-full rounded-t bg-gold/40 transition-all" style={{ height: `${pct}%` }} />
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            )}

            <div className="space-y-1.5">
              {sortedWeights.slice(0, 15).map((w) => (
                <GlassCard key={w.id} className="p-3 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="num text-sm font-semibold text-gold">{Number(w.weight_kg).toFixed(1)} kg</span>
                      <span className="text-[10px] text-muted num">{w.date}</span>
                      {w.notes && <span className="text-xs text-silver-dim">{w.notes}</span>}
                    </div>
                    <button onClick={() => deleteWeight(w.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-danger transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add Weight Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log Weight">
        <form onSubmit={addWeight} className="space-y-3">
          <Label><LabelText>Weight (kg)</LabelText><Input type="number" step="0.1" min={0} required value={weightVal} onChange={(e) => setWeightVal(e.target.value)} placeholder="75.0" /></Label>
          <Label><LabelText>Date</LabelText><Input type="date" required value={weightDate} onChange={(e) => setWeightDate(e.target.value)} /></Label>
          <Label><LabelText>Notes</LabelText><Input placeholder="Morning weigh-in, post-meal, etc." value={weightNotes} onChange={(e) => setWeightNotes(e.target.value)} /></Label>
          <Button type="submit" loading={saving} className="w-full mt-2">Log weight</Button>
        </form>
      </Modal>

      {/* Manual Whoop Modal */}
      <Modal open={showWhoop} onClose={() => setShowWhoop(false)} title="Log Whoop Data">
        <form onSubmit={addWhoopEntry} className="space-y-3">
          <Label><LabelText>Date</LabelText><Input type="date" required value={whoopDate} onChange={(e) => setWhoopDate(e.target.value)} /></Label>
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Recovery (%)</LabelText><Input type="number" min={0} max={100} value={recovery} onChange={(e) => setRecovery(e.target.value)} placeholder="0-100" /></Label>
            <Label><LabelText>HRV (ms)</LabelText><Input type="number" min={0} value={hrv} onChange={(e) => setHrv(e.target.value)} /></Label>
            <Label><LabelText>Resting HR</LabelText><Input type="number" min={0} value={restingHr} onChange={(e) => setRestingHr(e.target.value)} /></Label>
            <Label><LabelText>Strain</LabelText><Input type="number" step="0.1" min={0} max={21} value={strain} onChange={(e) => setStrain(e.target.value)} /></Label>
            <Label><LabelText>Sleep perf (%)</LabelText><Input type="number" min={0} max={100} value={sleepPerf} onChange={(e) => setSleepPerf(e.target.value)} /></Label>
            <Label><LabelText>Calories</LabelText><Input type="number" min={0} value={whoopCalories} onChange={(e) => setWhoopCalories(e.target.value)} /></Label>
          </div>
          <Button type="submit" loading={saving} className="w-full mt-2">Save</Button>
        </form>
      </Modal>
    </div>
  );
}

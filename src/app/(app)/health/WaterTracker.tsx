'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, LabelText } from '@/components/ui/Input';
import { today, addDays, formatDate } from '@/lib/dates';
import { Droplets, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WaterProfile, WaterLog } from './types';

const QUICK_ADD = [250, 500, 750, 1000];

function calculateTarget(profile: WaterProfile | null): number {
  if (!profile?.weight_kg) return 3000; // fallback
  let target = profile.weight_kg * 35;
  // Activity level
  if (profile.activity_level === 'active') target *= 1.2;
  else if (profile.activity_level === 'very_active') target *= 1.35;
  else if (profile.activity_level === 'moderate') target *= 1.1;
  // Stimulants
  target += (profile.caffeine_servings ?? 0) * target * 0.10;
  if (profile.nicotine) target *= 1.15;
  if (profile.adhd_meds) target *= 1.10;
  return Math.round(target);
}

type Props = {
  profile: WaterProfile | null;
  logs: WaterLog[];
  onLogged: () => void;
};

export function WaterTracker({ profile, logs, onLogged }: Props) {
  const supabase = createClient();
  const [customAmt, setCustomAmt] = useState('');
  const [adding, setAdding] = useState(false);

  const todayDate = today();
  const target = calculateTarget(profile);

  const todayTotal = useMemo(
    () => logs.filter((l) => l.date === todayDate).reduce((sum, l) => sum + l.amount_ml, 0),
    [logs, todayDate],
  );
  const pct = Math.min(100, Math.round((todayTotal / target) * 100));

  // 14-day history
  const history = useMemo(() => {
    const days: { date: string; total: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = addDays(todayDate, -i);
      const total = logs.filter((l) => l.date === d).reduce((s, l) => s + l.amount_ml, 0);
      days.push({ date: d, total });
    }
    return days;
  }, [logs, todayDate]);

  const weeklyAvg = Math.round(
    history.slice(-7).reduce((s, d) => s + d.total, 0) / 7,
  );

  async function addWater(ml: number) {
    if (ml <= 0) return;
    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('water_logs').insert({
      user_id: user.id,
      amount_ml: ml,
      date: todayDate,
      logged_at: new Date().toISOString(),
    });
    setAdding(false);
    setCustomAmt('');
    onLogged();
  }

  const barColor = pct < 33 ? 'from-danger/70 to-danger' : pct < 66 ? 'from-warning/70 to-warning' : 'from-success/70 to-success';

  return (
    <div className="space-y-4">
      {/* Today's progress */}
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-blue-400" />
            <span className="text-xs uppercase tracking-widest text-silver-dim">Today&apos;s water</span>
          </div>
          <span className="num text-xs text-muted">target: {(target / 1000).toFixed(1)}L</span>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span className={cn('num text-4xl font-semibold', pct >= 100 ? 'text-success' : 'text-white')}>
            {(todayTotal / 1000).toFixed(1)}
          </span>
          <span className="text-sm text-silver-dim">/ {(target / 1000).toFixed(1)} L</span>
          <span className={cn('num text-sm ml-auto font-semibold', pct >= 100 ? 'text-success' : pct >= 66 ? 'text-warning' : 'text-danger')}>
            {pct}%
          </span>
        </div>

        <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden mb-4">
          <div
            className={cn('h-full rounded-full transition-all duration-700 bg-gradient-to-r', barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Quick-add buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_ADD.map((ml) => (
            <Button
              key={ml}
              variant="secondary"
              size="sm"
              loading={adding}
              onClick={() => addWater(ml)}
              icon={<Plus className="w-3 h-3" />}
            >
              {ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`}
            </Button>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <Input
              type="number"
              min={1}
              placeholder="ml"
              value={customAmt}
              onChange={(e) => setCustomAmt(e.target.value)}
              className="w-20 !py-1.5 text-xs"
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={!customAmt || Number(customAmt) <= 0}
              onClick={() => addWater(Number(customAmt))}
            >
              Add
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* 14-day history */}
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <LabelText>14-day history</LabelText>
          <span className="num text-xs text-silver-dim">
            avg: <span className="text-white">{(weeklyAvg / 1000).toFixed(1)}L</span>/day
          </span>
        </div>

        <div className="flex items-end gap-1 h-24">
          {history.map(({ date, total }) => {
            const hp = Math.min(100, (total / target) * 100);
            const isToday = date === todayDate;
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1" title={`${formatDate(date)}: ${(total / 1000).toFixed(1)}L`}>
                <div className="w-full h-20 rounded-md bg-white/[0.03] overflow-hidden flex items-end">
                  <div
                    className={cn(
                      'w-full rounded-md transition-all',
                      hp >= 100 ? 'bg-success/60' : hp >= 50 ? 'bg-blue-400/50' : 'bg-blue-400/20',
                      isToday && 'ring-1 ring-gold/40',
                    )}
                    style={{ height: `${hp}%` }}
                  />
                </div>
                <span className={cn('text-[8px] num', isToday ? 'text-gold' : 'text-muted')}>
                  {formatDate(date)}
                </span>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}

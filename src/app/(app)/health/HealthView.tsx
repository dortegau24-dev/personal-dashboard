'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { today, daysAgo } from '@/lib/dates';
import { SupplementChecklist } from './SupplementChecklist';
import { SupplementManager } from './SupplementManager';
import { WaterTracker } from './WaterTracker';
import { NutritionTracker } from './NutritionTracker';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/GlassCard';
import { Plus, Droplets, Pill, Utensils } from 'lucide-react';
import type { Supplement, SupplementLog, WaterProfile, WaterLog, NutritionLog, NutritionTargets } from './types';

type Props = {
  supplements: Supplement[];
  supplementLogs: SupplementLog[];
  waterProfile: WaterProfile | null;
  waterLogs: WaterLog[];
  nutritionLogs: NutritionLog[];
  nutritionTargets: NutritionTargets | null;
};

export function HealthView({ supplements: initSupps, supplementLogs: initLogs, waterProfile, waterLogs: initWater, nutritionLogs, nutritionTargets }: Props) {
  const supabase = createClient();
  const [supplements, setSupplements] = useState(initSupps);
  const [suppLogs, setSuppLogs] = useState(initLogs);
  const [waterLogs, setWaterLogs] = useState(initWater);
  const [showSupMgr, setShowSupMgr] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplement | null>(null);
  const [tab, setTab] = useState<'supplements' | 'water' | 'diet'>('supplements');

  const todayDate = today();
  const takenCount = supplements.filter((s) => suppLogs.some((l) => l.supplement_id === s.id)).length;
  const suppPct = supplements.length > 0 ? Math.round((takenCount / supplements.length) * 100) : 0;

  const refreshSupps = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [s, l] = await Promise.all([
      supabase.from('supplements').select('*').eq('user_id', user.id).eq('is_active', true).order('schedule_slot').order('name'),
      supabase.from('supplement_logs').select('*').eq('user_id', user.id).eq('date', todayDate),
    ]);
    if (s.data) setSupplements(s.data);
    if (l.data) setSuppLogs(l.data);
  }, [supabase, todayDate]);

  const refreshWater = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('water_logs').select('*').eq('user_id', user.id).gte('date', daysAgo(13)).order('date');
    if (data) setWaterLogs(data);
  }, [supabase]);

  const TABS = [
    { key: 'supplements', label: 'Supplements', icon: Pill },
    { key: 'water', label: 'Water', icon: Droplets },
    { key: 'diet', label: 'Diet', icon: Utensils },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-silver-dim mb-1">Wellness</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Health</h1>
        </div>
        {tab === 'supplements' && (
          <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => { setEditingSup(null); setShowSupMgr(true); }}>
            Add supplement
          </Button>
        )}
      </header>

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

      {tab === 'supplements' && (
        <>
          <GlassCard className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-silver-dim uppercase tracking-widest">Today&apos;s compliance</span>
                <span className="num text-sm">
                  <span className="text-gold font-semibold">{takenCount}</span>
                  <span className="text-muted"> / {supplements.length}</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-success/70 to-success"
                  style={{ width: `${suppPct}%` }}
                />
              </div>
            </div>
            <div className="num text-3xl font-semibold text-gold-gradient">{suppPct}%</div>
          </GlassCard>

          <SupplementChecklist
            supplements={supplements}
            logs={suppLogs}
            onToggle={refreshSupps}
            onEdit={(s) => { setEditingSup(s); setShowSupMgr(true); }}
          />
        </>
      )}

      {tab === 'water' && (
        <WaterTracker
          profile={waterProfile}
          logs={waterLogs}
          onLogged={refreshWater}
        />
      )}

      {tab === 'diet' && (
        <NutritionTracker
          logs={nutritionLogs}
          targets={nutritionTargets}
          onChanged={refreshSupps}
        />
      )}

      <SupplementManager
        open={showSupMgr}
        onClose={() => { setShowSupMgr(false); setEditingSup(null); }}
        supplement={editingSup}
        onSaved={refreshSupps}
      />
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { today } from '@/lib/dates';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Select, Label, LabelText } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Settings2, Utensils, Flame, Beef, Wheat, Droplet } from 'lucide-react';
import type { NutritionLog, NutritionTargets } from './types';
import { MEAL_LABELS } from './types';

type Props = {
  logs: NutritionLog[];
  targets: NutritionTargets | null;
  onChanged: () => void;
};

const DEFAULT_TARGETS = { calories: 2500, protein_g: 150, carbs_g: 250, fat_g: 80 };

export function NutritionTracker({ logs: initLogs, targets: initTargets, onChanged }: Props) {
  const supabase = createClient();
  const [logs, setLogs] = useState(initLogs);
  const [targets, setTargets] = useState(initTargets);
  const [showAdd, setShowAdd] = useState(false);
  const [showTargets, setShowTargets] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add form state
  const [mealLabel, setMealLabel] = useState<string>('Breakfast');
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');

  // Target form state
  const [tCal, setTCal] = useState(String(targets?.calories ?? DEFAULT_TARGETS.calories));
  const [tPro, setTPro] = useState(String(targets?.protein_g ?? DEFAULT_TARGETS.protein_g));
  const [tCarb, setTCarb] = useState(String(targets?.carbs_g ?? DEFAULT_TARGETS.carbs_g));
  const [tFat, setTFat] = useState(String(targets?.fat_g ?? DEFAULT_TARGETS.fat_g));

  const t = targets ?? DEFAULT_TARGETS;

  // Compute daily totals
  const totals = useMemo(() => {
    return logs.reduce(
      (acc, l) => ({
        calories: acc.calories + Number(l.calories),
        protein: acc.protein + Number(l.protein_g),
        carbs: acc.carbs + Number(l.carbs_g),
        fat: acc.fat + Number(l.fat_g),
        fiber: acc.fiber + Number(l.fiber_g ?? 0),
        sugar: acc.sugar + Number(l.sugar_g ?? 0),
        sodium: acc.sodium + Number(l.sodium_mg ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
    );
  }, [logs]);

  const calPct = Math.min(100, Math.round((totals.calories / t.calories) * 100));
  const proPct = Math.min(100, Math.round((totals.protein / t.protein_g) * 100));
  const carbPct = Math.min(100, Math.round((totals.carbs / t.carbs_g) * 100));
  const fatPct = Math.min(100, Math.round((totals.fat / t.fat_g) * 100));

  function resetForm() {
    setMealLabel('Breakfast');
    setDescription('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setFiber('');
    setSugar('');
    setSodium('');
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from('nutrition_logs').insert({
      user_id: user.id,
      date: today(),
      meal_label: mealLabel,
      description: description || null,
      calories: Number(calories) || 0,
      protein_g: Number(protein) || 0,
      carbs_g: Number(carbs) || 0,
      fat_g: Number(fat) || 0,
      fiber_g: Number(fiber) || 0,
      sugar_g: Number(sugar) || 0,
      sodium_mg: Number(sodium) || 0,
    }).select().single();

    if (!error && data) {
      setLogs((prev) => [...prev, data]);
      resetForm();
      setShowAdd(false);
      onChanged();
    }
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    await supabase.from('nutrition_logs').delete().eq('id', id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
    onChanged();
  }

  async function saveTargets(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      calories: Number(tCal) || DEFAULT_TARGETS.calories,
      protein_g: Number(tPro) || DEFAULT_TARGETS.protein_g,
      carbs_g: Number(tCarb) || DEFAULT_TARGETS.carbs_g,
      fat_g: Number(tFat) || DEFAULT_TARGETS.fat_g,
    };

    if (targets?.id) {
      const { data } = await supabase.from('nutrition_targets').update(payload).eq('id', targets.id).select().single();
      if (data) setTargets(data);
    } else {
      const { data } = await supabase.from('nutrition_targets').insert(payload).select().single();
      if (data) setTargets(data);
    }

    setShowTargets(false);
    setSaving(false);
  }

  const MACROS = [
    { label: 'Calories', value: totals.calories, target: t.calories, pct: calPct, unit: 'kcal', color: 'from-gold/60 to-gold', icon: Flame, textColor: 'text-gold' },
    { label: 'Protein', value: totals.protein, target: t.protein_g, pct: proPct, unit: 'g', color: 'from-red-500/60 to-red-500', icon: Beef, textColor: 'text-red-400' },
    { label: 'Carbs', value: totals.carbs, target: t.carbs_g, pct: carbPct, unit: 'g', color: 'from-amber-500/60 to-amber-500', icon: Wheat, textColor: 'text-amber-400' },
    { label: 'Fat', value: totals.fat, target: t.fat_g, pct: fatPct, unit: 'g', color: 'from-blue-500/60 to-blue-500', icon: Droplet, textColor: 'text-blue-400' },
  ];

  // Group logs by meal label
  const grouped = useMemo(() => {
    const map = new Map<string, NutritionLog[]>();
    for (const l of logs) {
      const arr = map.get(l.meal_label) ?? [];
      arr.push(l);
      map.set(l.meal_label, arr);
    }
    return Array.from(map.entries());
  }, [logs]);

  return (
    <div className="space-y-4">
      {/* Macro overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {MACROS.map(({ label, value, target, pct, unit, color, icon: Icon, textColor }) => (
          <GlassCard key={label} hover className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-silver-dim">{label}</span>
              <Icon className={cn('w-3.5 h-3.5', textColor)} />
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className={cn('num text-2xl font-semibold', textColor)}>{Math.round(value)}</span>
              <span className="text-xs text-muted num">/ {Math.round(target)} {unit}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500 bg-gradient-to-r', color)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[10px] text-silver-dim mt-1 num">{pct}%</p>
          </GlassCard>
        ))}
      </div>

      {/* Micro nutrients summary */}
      {(totals.fiber > 0 || totals.sugar > 0 || totals.sodium > 0) && (
        <GlassCard className="p-4">
          <span className="text-[10px] uppercase tracking-widest text-silver-dim mb-2 block">Micronutrients</span>
          <div className="flex gap-6 text-xs">
            <div><span className="text-silver-dim">Fiber:</span> <span className="num text-white">{totals.fiber.toFixed(1)}g</span></div>
            <div><span className="text-silver-dim">Sugar:</span> <span className="num text-white">{totals.sugar.toFixed(1)}g</span></div>
            <div><span className="text-silver-dim">Sodium:</span> <span className="num text-white">{totals.sodium.toFixed(0)}mg</span></div>
          </div>
        </GlassCard>
      )}

      {/* Set targets button */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" icon={<Settings2 className="w-3.5 h-3.5" />} onClick={() => setShowTargets(true)}>
          Set macro targets
        </Button>
      </div>

      {/* Meal entries */}
      {grouped.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <Utensils className="w-10 h-10 text-silver-dim/30 mx-auto mb-3" />
          <p className="text-sm text-silver-dim">No meals logged today</p>
          <p className="text-xs text-muted mt-1">Tap the + button to add your first meal</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {grouped.map(([meal, entries]) => (
            <GlassCard key={meal} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium uppercase tracking-widest text-gold">{meal}</span>
                <span className="num text-xs text-silver-dim">
                  {entries.reduce((s, e) => s + Number(e.calories), 0)} kcal
                </span>
              </div>
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between gap-2 group">
                    <div className="flex-1 min-w-0">
                      {entry.description && (
                        <p className="text-sm text-white/90 mb-0.5">{entry.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] num text-silver-dim">
                        <span>{entry.calories} kcal</span>
                        <span>P {Number(entry.protein_g).toFixed(0)}g</span>
                        <span>C {Number(entry.carbs_g).toFixed(0)}g</span>
                        <span>F {Number(entry.fat_g).toFixed(0)}g</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-danger transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Add Meal Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log meal">
        <form onSubmit={addEntry} className="space-y-3">
          <Label>
            <LabelText>Meal</LabelText>
            <Select value={mealLabel} onChange={(e) => setMealLabel(e.target.value)}>
              {MEAL_LABELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </Label>

          <Label>
            <LabelText>Description (optional)</LabelText>
            <Input
              placeholder="e.g. Chicken breast with rice"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Label>

          <div className="grid grid-cols-2 gap-3">
            <Label>
              <LabelText>Calories (kcal)</LabelText>
              <Input type="number" min={0} required value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="0" />
            </Label>
            <Label>
              <LabelText>Protein (g)</LabelText>
              <Input type="number" min={0} step="0.1" required value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="0" />
            </Label>
            <Label>
              <LabelText>Carbs (g)</LabelText>
              <Input type="number" min={0} step="0.1" required value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="0" />
            </Label>
            <Label>
              <LabelText>Fat (g)</LabelText>
              <Input type="number" min={0} step="0.1" required value={fat} onChange={(e) => setFat(e.target.value)} placeholder="0" />
            </Label>
          </div>

          <details className="text-xs">
            <summary className="text-silver-dim cursor-pointer hover:text-white transition">+ Micronutrients</summary>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <Label>
                <LabelText>Fiber (g)</LabelText>
                <Input type="number" min={0} step="0.1" value={fiber} onChange={(e) => setFiber(e.target.value)} placeholder="0" />
              </Label>
              <Label>
                <LabelText>Sugar (g)</LabelText>
                <Input type="number" min={0} step="0.1" value={sugar} onChange={(e) => setSugar(e.target.value)} placeholder="0" />
              </Label>
              <Label>
                <LabelText>Sodium (mg)</LabelText>
                <Input type="number" min={0} step="0.1" value={sodium} onChange={(e) => setSodium(e.target.value)} placeholder="0" />
              </Label>
            </div>
          </details>

          <Button type="submit" loading={saving} className="w-full mt-2">Log meal</Button>
        </form>
      </Modal>

      {/* Targets Modal */}
      <Modal open={showTargets} onClose={() => setShowTargets(false)} title="Daily macro targets">
        <form onSubmit={saveTargets} className="space-y-3">
          <Label>
            <LabelText>Calories (kcal)</LabelText>
            <Input type="number" min={0} required value={tCal} onChange={(e) => setTCal(e.target.value)} />
          </Label>
          <Label>
            <LabelText>Protein (g)</LabelText>
            <Input type="number" min={0} step="0.1" required value={tPro} onChange={(e) => setTPro(e.target.value)} />
          </Label>
          <Label>
            <LabelText>Carbs (g)</LabelText>
            <Input type="number" min={0} step="0.1" required value={tCarb} onChange={(e) => setTCarb(e.target.value)} />
          </Label>
          <Label>
            <LabelText>Fat (g)</LabelText>
            <Input type="number" min={0} step="0.1" required value={tFat} onChange={(e) => setTFat(e.target.value)} />
          </Label>
          <Button type="submit" loading={saving} className="w-full mt-2">Save targets</Button>
        </form>
      </Modal>

      {/* Floating add button */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-gold to-bronze text-bg-base flex items-center justify-center shadow-lg hover:brightness-110 transition z-40"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

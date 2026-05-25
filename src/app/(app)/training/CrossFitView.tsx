'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { today } from '@/lib/dates';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Select, Label, LabelText, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Trophy, Flame, Clock, Dumbbell, TrendingUp } from 'lucide-react';
import type { CrossfitWod, CrossfitPR } from './types';
import { WOD_TYPES } from './types';

type Props = {
  wods: CrossfitWod[];
  prs: CrossfitPR[];
  onChanged: () => void;
};

export function CrossFitView({ wods: initWods, prs: initPrs, onChanged }: Props) {
  const supabase = createClient();
  const [wods, setWods] = useState(initWods);
  const [prs, setPrs] = useState(initPrs);
  const [showWod, setShowWod] = useState(false);
  const [showPr, setShowPr] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subTab, setSubTab] = useState<'log' | 'prs'>('log');

  // WOD form
  const [wodDate, setWodDate] = useState(today());
  const [wodType, setWodType] = useState('AMRAP');
  const [description, setDescription] = useState('');
  const [score, setScore] = useState('');
  const [timeCap, setTimeCap] = useState('');
  const [rounds, setRounds] = useState('');
  const [reps, setReps] = useState('');
  const [notes, setNotes] = useState('');

  // PR form
  const [prMovement, setPrMovement] = useState('');
  const [prValue, setPrValue] = useState('');
  const [prUnit, setPrUnit] = useState('kg');
  const [prDate, setPrDate] = useState(today());

  function resetWodForm() {
    setWodDate(today());
    setWodType('AMRAP');
    setDescription('');
    setScore('');
    setTimeCap('');
    setRounds('');
    setReps('');
    setNotes('');
  }

  async function addWod(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('crossfit_wods').insert({
      user_id: user.id,
      date: wodDate,
      wod_type: wodType,
      description: description || null,
      score: score || null,
      time_cap_seconds: timeCap ? Number(timeCap) * 60 : null,
      rounds: rounds ? Number(rounds) : null,
      reps: reps ? Number(reps) : null,
      notes: notes || null,
    }).select().single();
    if (!error && data) {
      setWods((prev) => [data, ...prev]);
      resetWodForm();
      setShowWod(false);
      onChanged();
    }
    setSaving(false);
  }

  async function deleteWod(id: string) {
    await supabase.from('crossfit_wods').delete().eq('id', id);
    setWods((prev) => prev.filter((w) => w.id !== id));
    onChanged();
  }

  async function addPr(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('crossfit_prs').insert({
      user_id: user.id,
      movement_name: prMovement,
      value: Number(prValue),
      unit: prUnit,
      date: prDate,
    }).select().single();
    if (!error && data) {
      setPrs((prev) => [data, ...prev]);
      setPrMovement('');
      setPrValue('');
      setShowPr(false);
      onChanged();
    }
    setSaving(false);
  }

  async function deletePr(id: string) {
    await supabase.from('crossfit_prs').delete().eq('id', id);
    setPrs((prev) => prev.filter((p) => p.id !== id));
    onChanged();
  }

  // Stats
  const thisMonth = wods.filter((w) => w.date.startsWith(new Date().toISOString().slice(0, 7)));
  const totalPrs = prs.length;

  // Group PRs by movement (latest only)
  const latestPrs = useMemo(() => {
    const map = new Map<string, CrossfitPR>();
    for (const pr of [...prs].sort((a, b) => b.date.localeCompare(a.date))) {
      if (!map.has(pr.movement_name)) map.set(pr.movement_name, pr);
    }
    return Array.from(map.values());
  }, [prs]);

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard hover className="p-4 text-center">
          <Dumbbell className="w-4 h-4 text-gold mx-auto mb-1" />
          <p className="num text-2xl font-semibold text-gold">{wods.length}</p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">Total WODs</p>
        </GlassCard>
        <GlassCard hover className="p-4 text-center">
          <Clock className="w-4 h-4 text-bronze mx-auto mb-1" />
          <p className="num text-2xl font-semibold text-bronze">{thisMonth.length}</p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">This month</p>
        </GlassCard>
        <GlassCard hover className="p-4 text-center">
          <Trophy className="w-4 h-4 text-gold mx-auto mb-1" />
          <p className="num text-2xl font-semibold text-gold">{totalPrs}</p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">PRs logged</p>
        </GlassCard>
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 p-1 glass rounded-xl w-fit">
        {(['log', 'prs'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${
              subTab === t ? 'bg-white/[0.08] text-white' : 'text-silver-dim hover:text-white'
            }`}
          >
            {t === 'log' ? <Dumbbell className="w-3.5 h-3.5" /> : <Trophy className="w-3.5 h-3.5" />}
            {t === 'log' ? 'WOD Log' : 'PRs'}
          </button>
        ))}
      </div>

      {subTab === 'log' && (
        <>
          {wods.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Dumbbell className="w-10 h-10 text-silver-dim/30 mx-auto mb-3" />
              <p className="text-sm text-silver-dim">No WODs logged yet</p>
              <p className="text-xs text-muted mt-1">Tap + to log your first workout</p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {wods.map((wod) => (
                <GlassCard key={wod.id} hover className="p-4 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gold uppercase">{wod.wod_type}</span>
                        <span className="text-[10px] text-muted num">{wod.date}</span>
                        {wod.time_cap_seconds && (
                          <span className="text-[10px] text-silver-dim num">{Math.round(wod.time_cap_seconds / 60)} min cap</span>
                        )}
                      </div>
                      {wod.description && <p className="text-sm text-white/80 mb-1 whitespace-pre-wrap">{wod.description}</p>}
                      {wod.score && (
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-3 h-3 text-bronze" />
                          <span className="text-sm num font-medium text-bronze">{wod.score}</span>
                        </div>
                      )}
                      {(wod.rounds || wod.reps) && (
                        <p className="text-xs text-silver-dim num mt-0.5">
                          {wod.rounds && `${wod.rounds} rnds`}{wod.rounds && wod.reps && ' + '}{wod.reps && `${wod.reps} reps`}
                        </p>
                      )}
                      {wod.notes && <p className="text-xs text-muted mt-1 italic">{wod.notes}</p>}
                    </div>
                    <button onClick={() => deleteWod(wod.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-danger transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}

      {subTab === 'prs' && (
        <>
          <div className="flex justify-end">
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowPr(true)}>Add PR</Button>
          </div>
          {latestPrs.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Trophy className="w-10 h-10 text-silver-dim/30 mx-auto mb-3" />
              <p className="text-sm text-silver-dim">No PRs logged yet</p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {latestPrs.map((pr) => (
                <GlassCard key={pr.id} hover className="p-4 group">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{pr.movement_name}</p>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="num text-xl font-semibold text-gold">{pr.value}</span>
                        <span className="text-xs text-silver-dim">{pr.unit}</span>
                      </div>
                      <p className="text-[10px] text-muted num mt-0.5">{pr.date}</p>
                    </div>
                    <button onClick={() => deletePr(pr.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-danger transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add WOD Modal */}
      <Modal open={showWod} onClose={() => setShowWod(false)} title="Log WOD">
        <form onSubmit={addWod} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Date</LabelText><Input type="date" required value={wodDate} onChange={(e) => setWodDate(e.target.value)} /></Label>
            <Label>
              <LabelText>Type</LabelText>
              <Select value={wodType} onChange={(e) => setWodType(e.target.value)}>
                {WOD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Label>
          </div>
          <Label><LabelText>Description</LabelText><Textarea placeholder="e.g. 21-15-9 Thrusters & Pull-ups" value={description} onChange={(e) => setDescription(e.target.value)} /></Label>
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Score / Time</LabelText><Input placeholder="e.g. 12:34" value={score} onChange={(e) => setScore(e.target.value)} /></Label>
            <Label><LabelText>Time cap (min)</LabelText><Input type="number" min={0} value={timeCap} onChange={(e) => setTimeCap(e.target.value)} /></Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Rounds</LabelText><Input type="number" min={0} value={rounds} onChange={(e) => setRounds(e.target.value)} /></Label>
            <Label><LabelText>Reps</LabelText><Input type="number" min={0} value={reps} onChange={(e) => setReps(e.target.value)} /></Label>
          </div>
          <Label><LabelText>Notes</LabelText><Input placeholder="How did it feel?" value={notes} onChange={(e) => setNotes(e.target.value)} /></Label>
          <Button type="submit" loading={saving} className="w-full mt-2">Log WOD</Button>
        </form>
      </Modal>

      {/* Add PR Modal */}
      <Modal open={showPr} onClose={() => setShowPr(false)} title="Log PR">
        <form onSubmit={addPr} className="space-y-3">
          <Label><LabelText>Movement</LabelText><Input required placeholder="e.g. Back Squat" value={prMovement} onChange={(e) => setPrMovement(e.target.value)} /></Label>
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Value</LabelText><Input type="number" step="0.1" required value={prValue} onChange={(e) => setPrValue(e.target.value)} /></Label>
            <Label>
              <LabelText>Unit</LabelText>
              <Select value={prUnit} onChange={(e) => setPrUnit(e.target.value)}>
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
                <option value="reps">reps</option>
                <option value="seconds">seconds</option>
              </Select>
            </Label>
          </div>
          <Label><LabelText>Date</LabelText><Input type="date" required value={prDate} onChange={(e) => setPrDate(e.target.value)} /></Label>
          <Button type="submit" loading={saving} className="w-full mt-2">Save PR</Button>
        </form>
      </Modal>

      {/* Floating add button */}
      {subTab === 'log' && (
        <button
          onClick={() => setShowWod(true)}
          className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-gold to-bronze text-bg-base flex items-center justify-center shadow-lg hover:brightness-110 transition z-40"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

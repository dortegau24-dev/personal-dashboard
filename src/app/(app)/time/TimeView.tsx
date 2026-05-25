'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { today } from '@/lib/dates';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Select, Label, LabelText } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Clock, Target, Settings2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

type TimeBlock = { id: string; user_id: string; date: string; category: string; hours: number; notes: string | null; created_at: string; updated_at: string };
type TimeTarget = { id: string; user_id: string; category: string; target_hours_daily: number; color: string | null; created_at: string; updated_at: string };

type Props = { blocks: TimeBlock[]; targets: TimeTarget[] };

const CATEGORIES = ['DeepBlock', 'Exercise', 'Learning', 'School', 'Rest', 'Sleep', 'Social', 'Other'] as const;
const CAT_COLORS: Record<string, string> = {
  DeepBlock: '#D4AF37', Exercise: '#22c55e', Learning: '#3b82f6', School: '#a855f7',
  Rest: '#6b7280', Sleep: '#818cf8', Social: '#CD7F32', Other: '#64748b',
};

export function TimeView({ blocks: initBlocks, targets: initTargets }: Props) {
  const supabase = createClient();
  const [blocks, setBlocks] = useState(initBlocks);
  const [targets, setTargets] = useState(initTargets);
  const [showAdd, setShowAdd] = useState(false);
  const [showTarget, setShowTarget] = useState(false);
  const [saving, setSaving] = useState(false);

  const [blockCat, setBlockCat] = useState('Work');
  const [blockHours, setBlockHours] = useState('');
  const [blockNotes, setBlockNotes] = useState('');
  const [blockDate, setBlockDate] = useState(today());

  const [targetCat, setTargetCat] = useState('Work');
  const [targetHrs, setTargetHrs] = useState('');

  const todayBlocks = useMemo(() => blocks.filter((b) => b.date === today()), [blocks]);
  const totalToday = useMemo(() => todayBlocks.reduce((s, b) => s + Number(b.hours), 0), [todayBlocks]);

  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of todayBlocks) {
      const cat = b.category;
      map[cat] = (map[cat] || 0) + Number(b.hours);
    }
    return Object.entries(map).map(([name, value]) => ({
      name, value, color: CAT_COLORS[name] || '#64748b',
    }));
  }, [todayBlocks]);

  // Target lookup
  const targetMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of targets) m.set(t.category, Number(t.target_hours_daily));
    return m;
  }, [targets]);

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('time_blocks').insert({
      user_id: user.id, date: blockDate, category: blockCat,
      hours: Number(blockHours), notes: blockNotes || null,
    }).select().single();
    if (data) { setBlocks((p) => [data, ...p]); setShowAdd(false); setBlockHours(''); setBlockNotes(''); }
    setSaving(false);
  }

  async function deleteBlock(id: string) {
    await supabase.from('time_blocks').delete().eq('id', id);
    setBlocks((p) => p.filter((b) => b.id !== id));
  }

  async function saveTarget(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const existing = targets.find((t) => t.category === targetCat);
    if (existing) {
      const { data } = await supabase.from('time_targets').update({ target_hours_daily: Number(targetHrs) }).eq('id', existing.id).select().single();
      if (data) setTargets((p) => p.map((t) => t.id === data.id ? data : t));
    } else {
      const { data } = await supabase.from('time_targets').insert({
        user_id: user.id, category: targetCat, target_hours_daily: Number(targetHrs),
        color: CAT_COLORS[targetCat] || null,
      }).select().single();
      if (data) setTargets((p) => [...p, data]);
    }
    setShowTarget(false);
    setTargetHrs('');
    setSaving(false);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-silver-dim mb-1">Productivity</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Time Blocking</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={<Target className="w-3.5 h-3.5" />} onClick={() => setShowTarget(true)}>Set target</Button>
          <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAdd(true)}>Log time</Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pie chart */}
        <GlassCard hover>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gold" />
            <span className="text-xs uppercase tracking-widest text-silver-dim">Today&apos;s allocation</span>
            <span className="ml-auto num text-sm text-gold">{totalToday.toFixed(1)}h</span>
          </div>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-silver-dim">No time logged today</div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-36 h-36 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={58} paddingAngle={2} dataKey="value" stroke="none">
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
                    </Pie>
                    <Tooltip content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload;
                      return <div className="glass rounded-lg px-3 py-2 text-xs"><span className="font-medium">{d.name}</span><span className="text-silver-dim ml-2 num">{d.value.toFixed(1)}h</span></div>;
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {pieData.sort((a, b) => b.value - a.value).map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-white/80 truncate">{d.name}</span>
                    <span className="num text-silver-dim ml-auto">{d.value.toFixed(1)}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>

        {/* Targets vs actual */}
        <GlassCard hover>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-gold" />
            <span className="text-xs uppercase tracking-widest text-silver-dim">Targets vs. Actual</span>
          </div>
          {targets.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-silver-dim">No targets set yet</div>
          ) : (
            <div className="space-y-3">
              {targets.map((t) => {
                const actual = todayBlocks.filter((b) => b.category === t.category).reduce((s, b) => s + Number(b.hours), 0);
                const pct = Number(t.target_hours_daily) > 0 ? Math.min(100, Math.round((actual / Number(t.target_hours_daily)) * 100)) : 0;
                const color = CAT_COLORS[t.category] || '#64748b';
                return (
                  <div key={t.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs">{t.category}</span>
                      </div>
                      <span className="num text-[11px] text-silver-dim">{actual.toFixed(1)} / {Number(t.target_hours_daily).toFixed(1)}h</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Today's blocks */}
      <div>
        <span className="text-xs uppercase tracking-widest text-silver-dim mb-3 block">Today&apos;s time blocks</span>
        {todayBlocks.length === 0 ? (
          <GlassCard className="p-6 text-center text-sm text-silver-dim">No blocks logged yet today</GlassCard>
        ) : (
          <div className="space-y-2">
            {todayBlocks.map((b) => (
              <GlassCard key={b.id} hover className="p-3 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CAT_COLORS[b.category] || '#64748b' }} />
                    <span className="text-sm font-medium">{b.category}</span>
                    <span className="num text-xs text-gold">{Number(b.hours).toFixed(1)}h</span>
                    {b.notes && <span className="text-xs text-muted">{b.notes}</span>}
                  </div>
                  <button onClick={() => deleteBlock(b.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-danger transition"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Add Block Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log Time Block">
        <form onSubmit={addBlock} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Category</LabelText><Select value={blockCat} onChange={(e) => setBlockCat(e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Label>
            <Label><LabelText>Hours</LabelText><Input type="number" step="0.25" min={0} required value={blockHours} onChange={(e) => setBlockHours(e.target.value)} placeholder="1.5" /></Label>
          </div>
          <Label><LabelText>Date</LabelText><Input type="date" required value={blockDate} onChange={(e) => setBlockDate(e.target.value)} /></Label>
          <Label><LabelText>Notes</LabelText><Input placeholder="What did you do?" value={blockNotes} onChange={(e) => setBlockNotes(e.target.value)} /></Label>
          <Button type="submit" loading={saving} className="w-full mt-2">Log time</Button>
        </form>
      </Modal>

      {/* Target Modal */}
      <Modal open={showTarget} onClose={() => setShowTarget(false)} title="Set Daily Target">
        <form onSubmit={saveTarget} className="space-y-3">
          <Label><LabelText>Category</LabelText><Select value={targetCat} onChange={(e) => setTargetCat(e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Label>
          <Label><LabelText>Target hours / day</LabelText><Input type="number" step="0.25" min={0} required value={targetHrs} onChange={(e) => setTargetHrs(e.target.value)} placeholder="2.0" /></Label>
          <Button type="submit" loading={saving} className="w-full mt-2">Save target</Button>
        </form>
      </Modal>
    </div>
  );
}

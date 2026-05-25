'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { today } from '@/lib/dates';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Select, Label, LabelText, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Target, Flag, TrendingUp, CheckCircle2 } from 'lucide-react';

type Goal = {
  id: string; user_id: string; title: string; description: string | null;
  category: string | null; level: string | null; target_date: string | null;
  status: string; progress_pct: number; parent_goal_id: string | null;
  created_at: string; updated_at: string;
};

type Props = { goals: Goal[] };

const CATEGORIES = ['Health', 'Fitness', 'Finance', 'Career', 'Learning', 'Social', 'Personal', 'Other'] as const;
const LEVELS = ['Vision', 'Yearly', 'Quarterly', 'Monthly', 'Weekly'] as const;
const STATUSES = ['not_started', 'in_progress', 'completed', 'abandoned'] as const;
const STATUS_LABELS: Record<string, string> = { not_started: 'Not started', in_progress: 'In progress', completed: 'Completed', abandoned: 'Abandoned' };
const STATUS_COLORS: Record<string, string> = { not_started: 'text-muted', in_progress: 'text-gold', completed: 'text-success', abandoned: 'text-danger' };
const LEVEL_COLORS: Record<string, string> = { Vision: 'text-gold', Yearly: 'text-bronze', Quarterly: 'text-blue-400', Monthly: 'text-success', Weekly: 'text-silver' };

export function GoalsView({ goals: initGoals }: Props) {
  const supabase = createClient();
  const [goals, setGoals] = useState(initGoals);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Personal');
  const [level, setLevel] = useState('Quarterly');
  const [targetDate, setTargetDate] = useState('');
  const [parentId, setParentId] = useState('');

  const filtered = filter === 'all' ? goals : goals.filter((g) => g.level === filter);
  const completed = goals.filter((g) => g.status === 'completed').length;
  const active = goals.filter((g) => g.status === 'in_progress').length;
  const avgProgress = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + Number(g.progress_pct), 0) / goals.length) : 0;

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('goals').insert({
      user_id: user.id, title, description: description || null,
      category, level, target_date: targetDate || null,
      parent_goal_id: parentId || null,
      status: 'not_started', progress_pct: 0,
    }).select().single();
    if (error) console.error('Failed to add goal:', error);
    if (data) { setGoals((p) => [data, ...p]); setShowAdd(false); setTitle(''); setDescription(''); setTargetDate(''); setParentId(''); }
    setSaving(false);
  }

  async function deleteGoal(id: string) {
    await supabase.from('goals').delete().eq('id', id);
    setGoals((p) => p.filter((g) => g.id !== id));
  }

  async function updateProgress(id: string, pct: number) {
    const status = pct >= 100 ? 'completed' : pct > 0 ? 'in_progress' : 'not_started';
    const { data } = await supabase.from('goals').update({ progress_pct: pct, status }).eq('id', id).select().single();
    if (data) setGoals((p) => p.map((g) => g.id === id ? data : g));
  }

  // Group by level
  const visionGoals = goals.filter((g) => g.level === 'Vision');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-silver-dim mb-1">Life Architecture</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Goals</h1>
        </div>
        <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAdd(true)}>Add goal</Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard hover className="p-4 text-center">
          <Target className="w-4 h-4 text-gold mx-auto mb-1" />
          <p className="num text-2xl font-semibold text-gold">{goals.length}</p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">Total goals</p>
        </GlassCard>
        <GlassCard hover className="p-4 text-center">
          <CheckCircle2 className="w-4 h-4 text-success mx-auto mb-1" />
          <p className="num text-2xl font-semibold text-success">{completed}</p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">Completed</p>
        </GlassCard>
        <GlassCard hover className="p-4 text-center">
          <TrendingUp className="w-4 h-4 text-bronze mx-auto mb-1" />
          <p className="num text-2xl font-semibold text-bronze">{avgProgress}%</p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">Avg progress</p>
        </GlassCard>
      </div>

      {/* Filter by level */}
      <div className="flex items-center gap-1 p-1 glass rounded-xl w-fit overflow-x-auto">
        {['all', ...LEVELS].map((l) => (
          <button key={l} onClick={() => setFilter(l)}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition ${filter === l ? 'bg-white/[0.08] text-white' : 'text-silver-dim hover:text-white'}`}>
            {l === 'all' ? 'All' : l}
          </button>
        ))}
      </div>

      {/* Goals list */}
      {filtered.length === 0 ? (
        <GlassCard className="p-8 text-center"><Target className="w-10 h-10 text-silver-dim/30 mx-auto mb-3" /><p className="text-sm text-silver-dim">No goals yet</p></GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map((g) => {
            const pct = Number(g.progress_pct);
            const parent = g.parent_goal_id ? goals.find((x) => x.id === g.parent_goal_id) : null;
            return (
              <GlassCard key={g.id} hover className="p-4 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium">{g.title}</span>
                      {g.level && <span className={cn('text-[10px] font-medium uppercase', LEVEL_COLORS[g.level])}>{g.level}</span>}
                      {g.category && <span className="text-[10px] text-muted">{g.category}</span>}
                      <span className={cn('text-[10px] font-medium', STATUS_COLORS[g.status])}>{STATUS_LABELS[g.status]}</span>
                    </div>
                    {g.description && <p className="text-xs text-muted mb-2">{g.description}</p>}
                    {parent && <p className="text-[10px] text-silver-dim mb-1">Parent: {parent.title}</p>}
                    {g.target_date && <p className="text-[10px] text-silver-dim num mb-2">Target: {g.target_date}</p>}

                    {/* Progress bar with quick adjust */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="num text-xs text-gold w-10 text-right">{pct}%</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {[0, 25, 50, 75, 100].map((v) => (
                        <button key={v} onClick={() => updateProgress(g.id, v)}
                          className={cn('text-[10px] num px-2 py-0.5 rounded border transition',
                            pct === v ? 'border-gold/40 text-gold bg-gold/10' : 'border-white/[0.06] text-muted hover:text-white hover:border-white/20')}>
                          {v}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => deleteGoal(g.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-danger transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Goal">
        <form onSubmit={addGoal} className="space-y-3">
          <Label><LabelText>Title</LabelText><Input required placeholder="What do you want to achieve?" value={title} onChange={(e) => setTitle(e.target.value)} /></Label>
          <Label><LabelText>Description</LabelText><Textarea placeholder="Details..." value={description} onChange={(e) => setDescription(e.target.value)} /></Label>
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Category</LabelText><Select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Label>
            <Label><LabelText>Level</LabelText><Select value={level} onChange={(e) => setLevel(e.target.value)}>{LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}</Select></Label>
          </div>
          <Label><LabelText>Target date</LabelText><Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></Label>
          {visionGoals.length > 0 && (
            <Label>
              <LabelText>Parent goal (optional)</LabelText>
              <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">None</option>
                {goals.filter((g) => g.level === 'Vision' || g.level === 'Yearly').map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </Select>
            </Label>
          )}
          <Button type="submit" loading={saving} className="w-full mt-2">Add goal</Button>
        </form>
      </Modal>
    </div>
  );
}

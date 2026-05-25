'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { today } from '@/lib/dates';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Select, Label, LabelText, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { Plus, Trash2, BookOpen, Star, Podcast, Video, FileText, GraduationCap } from 'lucide-react';

type LearningEntry = {
  id: string; user_id: string; title: string; author: string | null; type: string | null;
  status: string; date_started: string | null; date_completed: string | null;
  rating: number | null; tags: string[]; takeaways: string | null;
  created_at: string; updated_at: string;
};

type Props = { entries: LearningEntry[] };

const TYPES = ['Book', 'Course', 'Podcast', 'Article', 'Video', 'Other'] as const;
const STATUSES = ['not_started', 'in_progress', 'completed', 'abandoned'] as const;
const STATUS_LABELS: Record<string, string> = { not_started: 'Not started', in_progress: 'In progress', completed: 'Completed', abandoned: 'Abandoned' };
const STATUS_COLORS: Record<string, string> = { not_started: 'text-muted', in_progress: 'text-gold', completed: 'text-success', abandoned: 'text-danger' };
const TYPE_ICONS: Record<string, typeof BookOpen> = { Book: BookOpen, Course: GraduationCap, Podcast: Podcast, Article: FileText, Video: Video };

export function KnowledgeView({ entries: initEntries }: Props) {
  const supabase = createClient();
  const [entries, setEntries] = useState(initEntries);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [type, setType] = useState('Book');
  const [status, setStatus] = useState('not_started');
  const [dateStarted, setDateStarted] = useState('');
  const [rating, setRating] = useState('');
  const [tags, setTags] = useState('');
  const [takeaways, setTakeaways] = useState('');

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.status === filter);
  const completed = entries.filter((e) => e.status === 'completed').length;
  const inProgress = entries.filter((e) => e.status === 'in_progress').length;

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('learning_entries').insert({
      user_id: user.id, title, author: author || null, type, status,
      date_started: dateStarted || null, rating: rating ? Number(rating) : null,
      tags: tags ? tags.split(',').map((t) => t.trim()) : [],
      takeaways: takeaways || null,
    }).select().single();
    if (error) console.error('Failed to add entry:', error);
    if (data) {
      setEntries((p) => [data, ...p]);
      setShowAdd(false);
      setTitle(''); setAuthor(''); setTakeaways(''); setTags(''); setRating(''); setDateStarted('');
    }
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    await supabase.from('learning_entries').delete().eq('id', id);
    setEntries((p) => p.filter((e) => e.id !== id));
  }

  async function updateStatus(id: string, newStatus: string) {
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'completed') updates.date_completed = today();
    const { data } = await supabase.from('learning_entries').update(updates).eq('id', id).select().single();
    if (data) setEntries((p) => p.map((e) => e.id === id ? data : e));
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-silver-dim mb-1">Growth</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Knowledge</h1>
        </div>
        <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAdd(true)}>Add entry</Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard hover className="p-4 text-center">
          <BookOpen className="w-4 h-4 text-gold mx-auto mb-1" />
          <p className="num text-2xl font-semibold text-gold">{entries.length}</p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">Total</p>
        </GlassCard>
        <GlassCard hover className="p-4 text-center">
          <GraduationCap className="w-4 h-4 text-success mx-auto mb-1" />
          <p className="num text-2xl font-semibold text-success">{completed}</p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">Completed</p>
        </GlassCard>
        <GlassCard hover className="p-4 text-center">
          <Star className="w-4 h-4 text-bronze mx-auto mb-1" />
          <p className="num text-2xl font-semibold text-bronze">{inProgress}</p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">In progress</p>
        </GlassCard>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-1 p-1 glass rounded-xl w-fit overflow-x-auto">
        {['all', ...STATUSES].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition ${filter === s ? 'bg-white/[0.08] text-white' : 'text-silver-dim hover:text-white'}`}>
            {s === 'all' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <GlassCard className="p-8 text-center"><BookOpen className="w-10 h-10 text-silver-dim/30 mx-auto mb-3" /><p className="text-sm text-silver-dim">No entries yet</p></GlassCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const Icon = TYPE_ICONS[entry.type ?? ''] ?? BookOpen;
            return (
              <GlassCard key={entry.id} hover className="p-4 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-3 flex-1 min-w-0">
                    <Icon className="w-5 h-5 mt-0.5 text-silver-dim flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-sm font-medium">{entry.title}</span>
                        {entry.author && <span className="text-xs text-muted">by {entry.author}</span>}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-[10px] font-medium uppercase', STATUS_COLORS[entry.status])}>{STATUS_LABELS[entry.status]}</span>
                        {entry.type && <span className="text-[10px] text-muted">{entry.type}</span>}
                        {entry.rating && (
                          <span className="text-[10px] num text-gold">{'★'.repeat(entry.rating)}{'☆'.repeat(5 - entry.rating)}</span>
                        )}
                      </div>
                      {entry.tags && Array.isArray(entry.tags) && entry.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {entry.tags.map((t: string, i: number) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-silver-dim">{t}</span>
                          ))}
                        </div>
                      )}
                      {entry.takeaways && <p className="text-xs text-muted mt-1 italic">{entry.takeaways}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {entry.status !== 'completed' && (
                      <button onClick={() => updateStatus(entry.id, entry.status === 'not_started' ? 'in_progress' : 'completed')}
                        className="text-[10px] px-2 py-1 rounded border border-white/10 text-silver-dim hover:text-gold hover:border-gold/30 transition">
                        {entry.status === 'not_started' ? 'Start' : 'Complete'}
                      </button>
                    )}
                    <button onClick={() => deleteEntry(entry.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-danger transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Learning Entry">
        <form onSubmit={addEntry} className="space-y-3">
          <Label><LabelText>Title</LabelText><Input required placeholder="e.g. Atomic Habits" value={title} onChange={(e) => setTitle(e.target.value)} /></Label>
          <Label><LabelText>Author</LabelText><Input placeholder="James Clear" value={author} onChange={(e) => setAuthor(e.target.value)} /></Label>
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Type</LabelText><Select value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Label>
            <Label><LabelText>Status</LabelText><Select value={status} onChange={(e) => setStatus(e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</Select></Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Date started</LabelText><Input type="date" value={dateStarted} onChange={(e) => setDateStarted(e.target.value)} /></Label>
            <Label><LabelText>Rating (1-5)</LabelText><Input type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value)} /></Label>
          </div>
          <Label><LabelText>Tags (comma-separated)</LabelText><Input placeholder="productivity, habits" value={tags} onChange={(e) => setTags(e.target.value)} /></Label>
          <Label><LabelText>Key takeaways</LabelText><Textarea placeholder="What did you learn?" value={takeaways} onChange={(e) => setTakeaways(e.target.value)} /></Label>
          <Button type="submit" loading={saving} className="w-full mt-2">Add entry</Button>
        </form>
      </Modal>
    </div>
  );
}

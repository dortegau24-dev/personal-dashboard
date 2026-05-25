'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { today } from '@/lib/dates';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Select, Label, LabelText, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Users, UserPlus, MessageSquare, Zap } from 'lucide-react';

type Person = { id: string; user_id: string; name: string; relationship_type: string | null; notes: string | null; created_at: string; updated_at: string };
type Interaction = { id: string; user_id: string; person_id: string; date: string; duration_min: number | null; type: string | null; energy_rating: number | null; notes: string | null; created_at: string; updated_at: string };

type Props = { people: Person[]; interactions: Interaction[] };

const RELATIONSHIP_TYPES = ['Family', 'Friend', 'Partner', 'Colleague', 'Mentor', 'Other'] as const;
const INTERACTION_TYPES = ['In person', 'Call', 'Video', 'Text', 'Social media', 'Other'] as const;

export function SocialView({ people: initPeople, interactions: initInts }: Props) {
  const supabase = createClient();
  const [people, setPeople] = useState(initPeople);
  const [interactions, setInteractions] = useState(initInts);
  const [tab, setTab] = useState<'people' | 'log'>('people');
  const [showPerson, setShowPerson] = useState(false);
  const [showInt, setShowInt] = useState(false);
  const [saving, setSaving] = useState(false);

  // Person form
  const [personName, setPersonName] = useState('');
  const [personType, setPersonType] = useState('Friend');
  const [personNotes, setPersonNotes] = useState('');

  // Interaction form
  const [intPersonId, setIntPersonId] = useState('');
  const [intDate, setIntDate] = useState(today());
  const [intDuration, setIntDuration] = useState('');
  const [intType, setIntType] = useState('In person');
  const [intEnergy, setIntEnergy] = useState('');
  const [intNotes, setIntNotes] = useState('');

  const personMap = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('people').insert({
      user_id: user.id, name: personName, relationship_type: personType, notes: personNotes || null,
    }).select().single();
    if (data) { setPeople((p) => [...p, data]); setShowPerson(false); setPersonName(''); setPersonNotes(''); }
    setSaving(false);
  }

  async function deletePerson(id: string) {
    await supabase.from('people').delete().eq('id', id);
    setPeople((p) => p.filter((x) => x.id !== id));
  }

  async function addInteraction(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('social_interactions').insert({
      user_id: user.id, person_id: intPersonId, date: intDate,
      duration_min: intDuration ? Number(intDuration) : null, type: intType,
      energy_rating: intEnergy ? Number(intEnergy) : null, notes: intNotes || null,
    }).select().single();
    if (data) { setInteractions((p) => [data, ...p]); setShowInt(false); setIntNotes(''); setIntDuration(''); setIntEnergy(''); }
    setSaving(false);
  }

  async function deleteInteraction(id: string) {
    await supabase.from('social_interactions').delete().eq('id', id);
    setInteractions((p) => p.filter((x) => x.id !== id));
  }

  const ENERGY_COLORS = ['', 'text-danger', 'text-warning', 'text-silver', 'text-success', 'text-gold'];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-silver-dim mb-1">Connections</p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Social</h1>
        </div>
        <div className="flex gap-2">
          {tab === 'people' && <Button size="sm" icon={<UserPlus className="w-3.5 h-3.5" />} onClick={() => setShowPerson(true)}>Add person</Button>}
          {tab === 'log' && <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowInt(true)}>Log interaction</Button>}
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard hover className="p-4 text-center">
          <Users className="w-4 h-4 text-gold mx-auto mb-1" />
          <p className="num text-2xl font-semibold text-gold">{people.length}</p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">People</p>
        </GlassCard>
        <GlassCard hover className="p-4 text-center">
          <MessageSquare className="w-4 h-4 text-bronze mx-auto mb-1" />
          <p className="num text-2xl font-semibold text-bronze">{interactions.length}</p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">Interactions</p>
        </GlassCard>
        <GlassCard hover className="p-4 text-center">
          <Zap className="w-4 h-4 text-success mx-auto mb-1" />
          <p className="num text-2xl font-semibold text-success">
            {interactions.length > 0 ? (interactions.reduce((s, i) => s + (i.energy_rating ?? 0), 0) / interactions.filter((i) => i.energy_rating).length).toFixed(1) : '—'}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">Avg energy</p>
        </GlassCard>
      </div>

      <div className="flex items-center gap-1 p-1 glass rounded-xl w-fit">
        {(['people', 'log'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition ${tab === t ? 'bg-white/[0.08] text-white' : 'text-silver-dim hover:text-white'}`}>
            {t === 'people' ? <Users className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
            {t === 'people' ? 'People' : 'Interactions'}
          </button>
        ))}
      </div>

      {tab === 'people' && (
        people.length === 0 ? (
          <GlassCard className="p-8 text-center"><Users className="w-10 h-10 text-silver-dim/30 mx-auto mb-3" /><p className="text-sm text-silver-dim">No people added yet</p></GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {people.map((p) => {
              const lastInt = interactions.filter((i) => i.person_id === p.id).sort((a, b) => b.date.localeCompare(a.date))[0];
              return (
                <GlassCard key={p.id} hover className="p-4 group">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <div className="flex items-center gap-2 text-[10px]">
                        {p.relationship_type && <span className="text-gold">{p.relationship_type}</span>}
                        {lastInt && <span className="text-muted num">Last: {lastInt.date}</span>}
                      </div>
                      {p.notes && <p className="text-xs text-muted mt-1">{p.notes}</p>}
                    </div>
                    <button onClick={() => deletePerson(p.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-danger transition"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )
      )}

      {tab === 'log' && (
        interactions.length === 0 ? (
          <GlassCard className="p-8 text-center"><MessageSquare className="w-10 h-10 text-silver-dim/30 mx-auto mb-3" /><p className="text-sm text-silver-dim">No interactions logged</p></GlassCard>
        ) : (
          <div className="space-y-2">
            {interactions.map((i) => {
              const person = personMap.get(i.person_id);
              return (
                <GlassCard key={i.id} hover className="p-4 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-sm font-medium">{person?.name ?? 'Unknown'}</span>
                        <span className="text-[10px] text-muted num">{i.date}</span>
                        {i.type && <span className="text-[10px] text-silver-dim">{i.type}</span>}
                        {i.duration_min && <span className="text-[10px] text-silver-dim num">{i.duration_min}min</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {i.energy_rating && <span className={cn('text-xs num font-medium', ENERGY_COLORS[i.energy_rating])}>Energy: {i.energy_rating}/5</span>}
                      </div>
                      {i.notes && <p className="text-xs text-muted mt-0.5">{i.notes}</p>}
                    </div>
                    <button onClick={() => deleteInteraction(i.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-danger transition"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )
      )}

      <Modal open={showPerson} onClose={() => setShowPerson(false)} title="Add Person">
        <form onSubmit={addPerson} className="space-y-3">
          <Label><LabelText>Name</LabelText><Input required value={personName} onChange={(e) => setPersonName(e.target.value)} /></Label>
          <Label><LabelText>Relationship</LabelText><Select value={personType} onChange={(e) => setPersonType(e.target.value)}>{RELATIONSHIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Label>
          <Label><LabelText>Notes</LabelText><Input placeholder="Birthday, context..." value={personNotes} onChange={(e) => setPersonNotes(e.target.value)} /></Label>
          <Button type="submit" loading={saving} className="w-full mt-2">Add person</Button>
        </form>
      </Modal>

      <Modal open={showInt} onClose={() => setShowInt(false)} title="Log Interaction">
        <form onSubmit={addInteraction} className="space-y-3">
          <Label>
            <LabelText>Person</LabelText>
            <Select value={intPersonId} onChange={(e) => setIntPersonId(e.target.value)}>
              <option value="">Select person...</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Date</LabelText><Input type="date" required value={intDate} onChange={(e) => setIntDate(e.target.value)} /></Label>
            <Label><LabelText>Type</LabelText><Select value={intType} onChange={(e) => setIntType(e.target.value)}>{INTERACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Duration (min)</LabelText><Input type="number" min={0} value={intDuration} onChange={(e) => setIntDuration(e.target.value)} /></Label>
            <Label><LabelText>Energy (1-5)</LabelText><Input type="number" min={1} max={5} value={intEnergy} onChange={(e) => setIntEnergy(e.target.value)} /></Label>
          </div>
          <Label><LabelText>Notes</LabelText><Textarea placeholder="What did you talk about?" value={intNotes} onChange={(e) => setIntNotes(e.target.value)} /></Label>
          <Button type="submit" loading={saving} className="w-full mt-2">Log interaction</Button>
        </form>
      </Modal>
    </div>
  );
}

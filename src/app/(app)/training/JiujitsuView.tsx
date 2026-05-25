'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { today } from '@/lib/dates';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Select, Label, LabelText, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Shield, Swords, Clock, Trophy, X as XIcon } from 'lucide-react';
import type { JiujitsuSession, JiujitsuBeltHistory } from './types';
import { BJJ_TYPES, BJJ_INTENSITIES, BJJ_BELTS, BJJ_BELT_COLORS } from './types';

type Props = {
  sessions: JiujitsuSession[];
  beltHistory: JiujitsuBeltHistory[];
  onChanged: () => void;
};

// Sparring data stored in notes as JSON prefix: `__SPARRING__{"partner":"...","result":"win","technique":"..."}__END__`
type SparringData = {
  partner: string;
  result: 'win' | 'loss';
  technique: string;
};

function encodeSparring(data: SparringData, extraNotes: string): string {
  return `__SPARRING__${JSON.stringify(data)}__END__${extraNotes ? '\n' + extraNotes : ''}`;
}

function decodeSparring(notes: string | null): { sparring: SparringData | null; extraNotes: string } {
  if (!notes) return { sparring: null, extraNotes: '' };
  const match = notes.match(/^__SPARRING__({.*?})__END__([\s\S]*)$/);
  if (!match) return { sparring: null, extraNotes: notes };
  try {
    return { sparring: JSON.parse(match[1]), extraNotes: match[2].trim() };
  } catch {
    return { sparring: null, extraNotes: notes };
  }
}

export function JiujitsuView({ sessions: initSessions, beltHistory: initBelts, onChanged }: Props) {
  const supabase = createClient();
  const [sessions, setSessions] = useState(initSessions);
  const [belts, setBelts] = useState(initBelts);
  const [showSession, setShowSession] = useState(false);
  const [showBelt, setShowBelt] = useState(false);
  const [saving, setSaving] = useState(false);

  // Session form
  const [sessDate, setSessDate] = useState(today());
  const [sessType, setSessType] = useState('Gi');
  const [sessDuration, setSessDuration] = useState('');
  const [sessIntensity, setSessIntensity] = useState('Moderate');
  const [sessNotes, setSessNotes] = useState('');

  // Sparring-specific form fields
  const [sparPartner, setSparPartner] = useState('');
  const [sparResult, setSparResult] = useState<'win' | 'loss' | null>(null);
  const [sparTechnique, setSparTechnique] = useState('');

  // Belt form
  const [beltColor, setBeltColor] = useState('White');
  const [beltStripes, setBeltStripes] = useState('0');
  const [beltDate, setBeltDate] = useState(today());
  const [beltNotes, setBeltNotes] = useState('');

  // Current belt (latest entry)
  const currentBelt = useMemo(() => {
    if (belts.length === 0) return null;
    return [...belts].sort((a, b) => b.date_awarded.localeCompare(a.date_awarded))[0];
  }, [belts]);

  // Stats
  const totalSessions = sessions.length;
  const totalHours = Math.round(sessions.reduce((s, x) => s + (x.duration_min ?? 0), 0) / 60);
  const thisMonthSessions = sessions.filter((s) => s.date.startsWith(new Date().toISOString().slice(0, 7))).length;

  // Sparring record
  const sparringRecord = useMemo(() => {
    let wins = 0; let losses = 0;
    for (const s of sessions) {
      const { sparring } = decodeSparring(s.notes);
      if (sparring) {
        if (sparring.result === 'win') wins++;
        else losses++;
      }
    }
    return { wins, losses };
  }, [sessions]);

  function resetSessionForm() {
    setSessDate(today());
    setSessType('Gi');
    setSessDuration('');
    setSessIntensity('Moderate');
    setSessNotes('');
    setSparPartner('');
    setSparResult(null);
    setSparTechnique('');
  }

  async function addSession(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let notes = sessNotes || null;
    if (sessType === 'Sparring' && sparResult) {
      notes = encodeSparring(
        { partner: sparPartner, result: sparResult, technique: sparTechnique },
        sessNotes,
      );
    }

    const { data, error } = await supabase.from('jiujitsu_sessions').insert({
      user_id: user.id,
      date: sessDate,
      type: sessType,
      duration_min: sessDuration ? Number(sessDuration) : null,
      intensity: sessIntensity,
      notes,
    }).select().single();
    if (!error && data) {
      setSessions((prev) => [data, ...prev]);
      resetSessionForm();
      setShowSession(false);
      onChanged();
    }
    setSaving(false);
  }

  async function deleteSession(id: string) {
    await supabase.from('jiujitsu_sessions').delete().eq('id', id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    onChanged();
  }

  async function addBelt(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.from('jiujitsu_belt_history').insert({
      user_id: user.id,
      belt: beltColor,
      stripes: Number(beltStripes),
      date_awarded: beltDate,
      notes: beltNotes || null,
    }).select().single();
    if (!error && data) {
      setBelts((prev) => [data, ...prev]);
      setShowBelt(false);
      onChanged();
    }
    setSaving(false);
  }

  const INTENSITY_COLORS: Record<string, string> = {
    Light: 'text-success',
    Moderate: 'text-warning',
    Hard: 'text-danger',
  };

  return (
    <div className="space-y-4">
      {/* Belt + Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Current Belt */}
        <GlassCard hover className="p-4 text-center col-span-2 md:col-span-1">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div
              className="w-6 h-3 rounded-sm border border-white/20"
              style={{ backgroundColor: BJJ_BELT_COLORS[currentBelt?.belt ?? 'White'] }}
            />
            <span className="text-sm font-medium">{currentBelt?.belt ?? 'White'} Belt</span>
          </div>
          {currentBelt && (
            <div className="flex items-center justify-center gap-1 mb-1">
              {Array.from({ length: currentBelt.stripes }).map((_, i) => (
                <div key={i} className="w-4 h-1 bg-white/80 rounded-full" />
              ))}
              {currentBelt.stripes === 0 && <span className="text-[10px] text-muted">No stripes</span>}
            </div>
          )}
          <button onClick={() => setShowBelt(true)} className="text-[10px] text-gold hover:text-gold/80 transition mt-1">
            Update belt
          </button>
        </GlassCard>
        <GlassCard hover className="p-4 text-center">
          <Shield className="w-4 h-4 text-gold mx-auto mb-1" />
          <p className="num text-2xl font-semibold text-gold">{totalSessions}</p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">Sessions</p>
        </GlassCard>
        <GlassCard hover className="p-4 text-center">
          <Clock className="w-4 h-4 text-bronze mx-auto mb-1" />
          <p className="num text-2xl font-semibold text-bronze">{totalHours}h</p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">Mat time</p>
        </GlassCard>
        <GlassCard hover className="p-4 text-center">
          <Trophy className="w-4 h-4 text-success mx-auto mb-1" />
          <p className="num text-lg font-semibold">
            <span className="text-success">{sparringRecord.wins}W</span>
            <span className="text-muted mx-1">/</span>
            <span className="text-danger">{sparringRecord.losses}L</span>
          </p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">Sparring</p>
        </GlassCard>
        <GlassCard hover className="p-4 text-center">
          <Swords className="w-4 h-4 text-silver mx-auto mb-1" />
          <p className="num text-2xl font-semibold text-silver">{thisMonthSessions}</p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">This month</p>
        </GlassCard>
      </div>

      {/* Session log */}
      {sessions.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <Shield className="w-10 h-10 text-silver-dim/30 mx-auto mb-3" />
          <p className="text-sm text-silver-dim">No sessions logged yet</p>
          <p className="text-xs text-muted mt-1">Tap + to log your first session</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const { sparring, extraNotes } = decodeSparring(s.notes);
            return (
              <GlassCard key={s.id} hover className="p-4 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-xs font-medium">{s.type}</span>
                      <span className="text-[10px] text-muted num">{s.date}</span>
                      {s.duration_min && <span className="text-[10px] text-silver-dim num">{s.duration_min} min</span>}
                      {s.intensity && <span className={cn('text-[10px] font-medium', INTENSITY_COLORS[s.intensity])}>{s.intensity}</span>}
                    </div>

                    {/* Sparring details */}
                    {sparring && (
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {sparring.partner && (
                          <span className="text-xs text-silver-dim">vs <span className="text-white/90 font-medium">{sparring.partner}</span></span>
                        )}
                        <span className={cn(
                          'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full',
                          sparring.result === 'win'
                            ? 'bg-success/15 text-success border border-success/30'
                            : 'bg-danger/15 text-danger border border-danger/30',
                        )}>
                          {sparring.result}
                        </span>
                        {sparring.technique && (
                          <span className="text-xs text-silver-dim">
                            via <span className="text-gold/90 italic">{sparring.technique}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {extraNotes && <p className="text-xs text-muted mt-1">{extraNotes}</p>}
                    {!sparring && s.notes && <p className="text-xs text-muted mt-0.5">{s.notes}</p>}
                  </div>
                  <button onClick={() => deleteSession(s.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-danger transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Add Session Modal */}
      <Modal open={showSession} onClose={() => { setShowSession(false); resetSessionForm(); }} title="Log BJJ Session">
        <form onSubmit={addSession} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Date</LabelText><Input type="date" required value={sessDate} onChange={(e) => setSessDate(e.target.value)} /></Label>
            <Label>
              <LabelText>Type</LabelText>
              <Select value={sessType} onChange={(e) => setSessType(e.target.value)}>
                {BJJ_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Duration (min)</LabelText><Input type="number" min={0} value={sessDuration} onChange={(e) => setSessDuration(e.target.value)} placeholder="60" /></Label>
            <Label>
              <LabelText>Intensity</LabelText>
              <Select value={sessIntensity} onChange={(e) => setSessIntensity(e.target.value)}>
                {BJJ_INTENSITIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </Select>
            </Label>
          </div>

          {/* Sparring-specific fields */}
          {sessType === 'Sparring' && (
            <div className="space-y-3 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02]">
              <p className="text-[10px] uppercase tracking-widest text-gold mb-1">Sparring details</p>
              <Label><LabelText>Partner name</LabelText><Input placeholder="Who did you roll with?" value={sparPartner} onChange={(e) => setSparPartner(e.target.value)} /></Label>

              {/* Win / Loss toggler */}
              <div>
                <LabelText>Result</LabelText>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSparResult('win')}
                    className={cn(
                      'flex-1 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all border',
                      sparResult === 'win'
                        ? 'bg-success/20 border-success/50 text-success shadow-[0_0_12px_rgba(34,197,94,0.2)]'
                        : 'bg-white/[0.03] border-white/[0.08] text-silver-dim hover:border-success/30 hover:text-success/80',
                    )}
                  >
                    Win
                  </button>
                  <button
                    type="button"
                    onClick={() => setSparResult('loss')}
                    className={cn(
                      'flex-1 py-2.5 rounded-lg text-sm font-semibold uppercase tracking-wide transition-all border',
                      sparResult === 'loss'
                        ? 'bg-danger/20 border-danger/50 text-danger shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                        : 'bg-white/[0.03] border-white/[0.08] text-silver-dim hover:border-danger/30 hover:text-danger/80',
                    )}
                  >
                    Loss
                  </button>
                </div>
              </div>

              <Label>
                <LabelText>Technique {sparResult === 'win' ? 'won' : sparResult === 'loss' ? 'lost' : 'won/lost'} by</LabelText>
                <Input
                  placeholder={sparResult === 'win' ? 'e.g. Rear naked choke' : sparResult === 'loss' ? 'e.g. Armbar' : 'Select win or loss first'}
                  value={sparTechnique}
                  onChange={(e) => setSparTechnique(e.target.value)}
                />
              </Label>
            </div>
          )}

          <Label><LabelText>Notes</LabelText><Textarea placeholder="What did you work on?" value={sessNotes} onChange={(e) => setSessNotes(e.target.value)} /></Label>
          <Button type="submit" loading={saving} className="w-full mt-2">Log session</Button>
        </form>
      </Modal>

      {/* Belt Modal */}
      <Modal open={showBelt} onClose={() => setShowBelt(false)} title="Update Belt">
        <form onSubmit={addBelt} className="space-y-3">
          <Label>
            <LabelText>Belt</LabelText>
            <Select value={beltColor} onChange={(e) => setBeltColor(e.target.value)}>
              {BJJ_BELTS.map((b) => <option key={b} value={b}>{b}</option>)}
            </Select>
          </Label>
          <Label>
            <LabelText>Stripes</LabelText>
            <Select value={beltStripes} onChange={(e) => setBeltStripes(e.target.value)}>
              {[0, 1, 2, 3, 4].map((n) => <option key={n} value={String(n)}>{n}</option>)}
            </Select>
          </Label>
          <Label><LabelText>Date awarded</LabelText><Input type="date" required value={beltDate} onChange={(e) => setBeltDate(e.target.value)} /></Label>
          <Label><LabelText>Notes</LabelText><Input placeholder="Promoted by..." value={beltNotes} onChange={(e) => setBeltNotes(e.target.value)} /></Label>
          <Button type="submit" loading={saving} className="w-full mt-2">Save</Button>
        </form>
      </Modal>

      {/* Floating add button */}
      <button
        onClick={() => setShowSession(true)}
        className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-gold to-bronze text-bg-base flex items-center justify-center shadow-lg hover:brightness-110 transition z-40"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { today } from '@/lib/dates';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Select, Label, LabelText, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Waves, Bike, PersonStanding, Timer, MapPin } from 'lucide-react';
import type { TriathlonSession } from './types';
import { TRI_DISCIPLINES, STROKE_TYPES, TERRAIN_OPTIONS, formatDuration } from './types';

type Props = {
  sessions: TriathlonSession[];
  onChanged: () => void;
};

const DISCIPLINE_ICONS: Record<string, typeof Waves> = {
  Swim: Waves,
  Bike: Bike,
  Run: PersonStanding,
};

const DISCIPLINE_COLORS: Record<string, string> = {
  Swim: 'text-blue-400',
  Bike: 'text-amber-400',
  Run: 'text-success',
};

export function TriathlonView({ sessions: initSessions, onChanged }: Props) {
  const supabase = createClient();
  const [sessions, setSessions] = useState(initSessions);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [sessDate, setSessDate] = useState(today());
  const [discipline, setDiscipline] = useState<string>('Run');
  const [distance, setDistance] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [strokeType, setStrokeType] = useState('Freestyle');
  const [terrain, setTerrain] = useState('Road');
  const [elevationGain, setElevationGain] = useState('');
  const [indoor, setIndoor] = useState(false);
  const [notes, setNotes] = useState('');

  // Stats per discipline
  const stats = useMemo(() => {
    const result: Record<string, { count: number; totalDist: number; totalTime: number }> = {};
    for (const d of TRI_DISCIPLINES) result[d] = { count: 0, totalDist: 0, totalTime: 0 };
    for (const s of sessions) {
      const d = result[s.discipline];
      if (d) {
        d.count++;
        d.totalDist += Number(s.distance ?? 0);
        d.totalTime += s.time_seconds ?? 0;
      }
    }
    return result;
  }, [sessions]);

  function resetForm() {
    setSessDate(today());
    setDiscipline('Run');
    setDistance('');
    setHours('');
    setMinutes('');
    setSeconds('');
    setStrokeType('Freestyle');
    setTerrain('Road');
    setElevationGain('');
    setIndoor(false);
    setNotes('');
  }

  async function addSession(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const totalSeconds = (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0);
    const dist = Number(distance) || null;
    let pace: string | null = null;
    let avgSpeed: number | null = null;

    if (dist && totalSeconds > 0) {
      if (discipline === 'Run') {
        const pacePerKm = totalSeconds / dist;
        pace = formatDuration(Math.round(pacePerKm)) + '/km';
      } else if (discipline === 'Bike') {
        avgSpeed = Math.round((dist / (totalSeconds / 3600)) * 10) / 10;
      } else if (discipline === 'Swim') {
        const pacePer100 = totalSeconds / (dist * 10); // dist in km, convert to 100m
        pace = formatDuration(Math.round(pacePer100)) + '/100m';
      }
    }

    const { data, error } = await supabase.from('triathlon_sessions').insert({
      user_id: user.id,
      date: sessDate,
      discipline,
      distance: dist,
      time_seconds: totalSeconds || null,
      pace,
      stroke_type: discipline === 'Swim' ? strokeType : null,
      avg_speed: avgSpeed,
      elevation_gain: elevationGain ? Number(elevationGain) : null,
      terrain,
      indoor,
      notes: notes || null,
    }).select().single();

    if (!error && data) {
      setSessions((prev) => [data, ...prev]);
      resetForm();
      setShowAdd(false);
      onChanged();
    }
    setSaving(false);
  }

  async function deleteSession(id: string) {
    await supabase.from('triathlon_sessions').delete().eq('id', id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    onChanged();
  }

  return (
    <div className="space-y-4">
      {/* Discipline stats */}
      <div className="grid grid-cols-3 gap-3">
        {TRI_DISCIPLINES.map((d) => {
          const Icon = DISCIPLINE_ICONS[d];
          const s = stats[d];
          return (
            <GlassCard key={d} hover className="p-4 text-center">
              <Icon className={cn('w-5 h-5 mx-auto mb-1', DISCIPLINE_COLORS[d])} />
              <p className="text-xs font-medium mb-1">{d}</p>
              <p className="num text-lg font-semibold text-white">{s.count}</p>
              <p className="text-[10px] text-silver-dim num">{s.totalDist.toFixed(1)} km</p>
            </GlassCard>
          );
        })}
      </div>

      {/* Session log */}
      {sessions.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <Timer className="w-10 h-10 text-silver-dim/30 mx-auto mb-3" />
          <p className="text-sm text-silver-dim">No sessions logged yet</p>
          <p className="text-xs text-muted mt-1">Tap + to log a swim, bike, or run</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const Icon = DISCIPLINE_ICONS[s.discipline] ?? Timer;
            return (
              <GlassCard key={s.id} hover className="p-4 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-3 flex-1 min-w-0">
                    <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', DISCIPLINE_COLORS[s.discipline])} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium">{s.discipline}</span>
                        <span className="text-[10px] text-muted num">{s.date}</span>
                        {s.indoor && <span className="text-[10px] text-muted">(indoor)</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] num text-silver-dim">
                        {s.distance && <span>{Number(s.distance).toFixed(2)} km</span>}
                        {s.time_seconds && <span>{formatDuration(s.time_seconds)}</span>}
                        {s.pace && <span>{s.pace}</span>}
                        {s.avg_speed && <span>{s.avg_speed} km/h</span>}
                        {s.elevation_gain && <span>+{Number(s.elevation_gain)}m</span>}
                        {s.terrain && <span>{s.terrain}</span>}
                        {s.stroke_type && <span>{s.stroke_type}</span>}
                      </div>
                      {s.notes && <p className="text-xs text-muted mt-0.5">{s.notes}</p>}
                    </div>
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
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Log Session">
        <form onSubmit={addSession} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Date</LabelText><Input type="date" required value={sessDate} onChange={(e) => setSessDate(e.target.value)} /></Label>
            <Label>
              <LabelText>Discipline</LabelText>
              <Select value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
                {TRI_DISCIPLINES.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </Label>
          </div>
          <Label><LabelText>Distance (km)</LabelText><Input type="number" step="0.01" min={0} value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="0.00" /></Label>
          <div>
            <LabelText>Duration</LabelText>
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" min={0} placeholder="h" value={hours} onChange={(e) => setHours(e.target.value)} />
              <Input type="number" min={0} max={59} placeholder="m" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
              <Input type="number" min={0} max={59} placeholder="s" value={seconds} onChange={(e) => setSeconds(e.target.value)} />
            </div>
          </div>
          {discipline === 'Swim' && (
            <Label>
              <LabelText>Stroke</LabelText>
              <Select value={strokeType} onChange={(e) => setStrokeType(e.target.value)}>
                {STROKE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Label>
              <LabelText>Terrain</LabelText>
              <Select value={terrain} onChange={(e) => setTerrain(e.target.value)}>
                {TERRAIN_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Label>
            <Label><LabelText>Elevation (m)</LabelText><Input type="number" min={0} value={elevationGain} onChange={(e) => setElevationGain(e.target.value)} placeholder="0" /></Label>
          </div>
          <label className="flex items-center gap-2 text-xs text-silver-dim cursor-pointer">
            <input type="checkbox" checked={indoor} onChange={(e) => setIndoor(e.target.checked)} className="rounded border-white/20 bg-white/5" />
            Indoor session
          </label>
          <Label><LabelText>Notes</LabelText><Input placeholder="Session notes..." value={notes} onChange={(e) => setNotes(e.target.value)} /></Label>
          <Button type="submit" loading={saving} className="w-full mt-2">Log session</Button>
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

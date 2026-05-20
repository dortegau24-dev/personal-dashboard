'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Label, LabelText } from '@/components/ui/Input';
import { CATEGORIES, TIME_OF_DAY, DAYS, type Habit } from './types';

type Props = {
  open: boolean;
  onClose: () => void;
  habit: Habit | null; // null = create mode
  onSaved: () => void;
};

const DEFAULT = {
  name: '',
  category: 'health' as string,
  type: 'positive' as 'positive' | 'negative',
  frequency: 'daily',
  active_days: [0, 1, 2, 3, 4, 5, 6],
  time_of_day: 'morning' as string,
};

export function HabitManager({ open, onClose, habit, onSaved }: Props) {
  const supabase = createClient();
  const [form, setForm] = useState(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (habit) {
      setForm({
        name: habit.name,
        category: habit.category ?? 'health',
        type: habit.type,
        frequency: habit.frequency,
        active_days: Array.isArray(habit.active_days) ? habit.active_days : [0, 1, 2, 3, 4, 5, 6],
        time_of_day: habit.time_of_day ?? 'morning',
      });
    } else {
      setForm(DEFAULT);
    }
  }, [habit, open]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toggleDay(d: number) {
    set('active_days', form.active_days.includes(d)
      ? form.active_days.filter((x) => x !== d)
      : [...form.active_days, d].sort());
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      category: form.category,
      type: form.type,
      frequency: form.frequency,
      active_days: form.active_days,
      time_of_day: form.time_of_day,
      is_active: true,
    };

    if (habit) {
      await supabase.from('habits').update(payload).eq('id', habit.id);
    } else {
      await supabase.from('habits').insert(payload);
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  async function deactivate() {
    if (!habit) return;
    setDeleting(true);
    await supabase.from('habits').update({ is_active: false }).eq('id', habit.id);
    setDeleting(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={habit ? 'Edit habit' : 'New habit'}>
      <div className="space-y-4">
        <Label>
          <LabelText>Habit name</LabelText>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Cold shower" autoFocus />
        </Label>

        <div className="grid grid-cols-2 gap-3">
          <Label>
            <LabelText>Type</LabelText>
            <Select value={form.type} onChange={(e) => set('type', e.target.value as 'positive' | 'negative')}>
              <option value="positive">Positive (do this)</option>
              <option value="negative">Negative (avoid this)</option>
            </Select>
          </Label>
          <Label>
            <LabelText>Category</LabelText>
            <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </Select>
          </Label>
        </div>

        <Label>
          <LabelText>Time of day</LabelText>
          <Select value={form.time_of_day} onChange={(e) => set('time_of_day', e.target.value)}>
            {TIME_OF_DAY.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </Select>
        </Label>

        <div>
          <LabelText>Active days</LabelText>
          <div className="flex gap-1.5 mt-1">
            {DAYS.map((d, i) => (
              <button
                key={d}
                onClick={() => toggleDay(i)}
                className={`w-9 h-9 rounded-lg text-xs transition border ${
                  form.active_days.includes(i)
                    ? 'bg-gold/20 border-gold/40 text-gold'
                    : 'bg-white/[0.03] border-white/[0.06] text-muted hover:text-silver'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button loading={saving} onClick={save}>
            {habit ? 'Update' : 'Create'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {habit && (
            <Button variant="danger" size="sm" loading={deleting} onClick={deactivate} className="ml-auto">
              Deactivate
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

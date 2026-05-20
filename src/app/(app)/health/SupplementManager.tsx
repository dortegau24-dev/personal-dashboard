'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, Label, LabelText } from '@/components/ui/Input';
import { SCHEDULE_SLOTS, type Supplement } from './types';

type Props = {
  open: boolean;
  onClose: () => void;
  supplement: Supplement | null;
  onSaved: () => void;
};

const DEFAULT = {
  name: '',
  dosage: '',
  schedule_slot: 'morning' as string,
  custom_time: '',
  quantity_remaining: 0,
  low_threshold: 7,
};

export function SupplementManager({ open, onClose, supplement, onSaved }: Props) {
  const supabase = createClient();
  const [form, setForm] = useState(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (supplement) {
      setForm({
        name: supplement.name,
        dosage: supplement.dosage ?? '',
        schedule_slot: supplement.schedule_slot ?? 'morning',
        custom_time: supplement.custom_time ?? '',
        quantity_remaining: supplement.quantity_remaining,
        low_threshold: supplement.low_threshold,
      });
    } else {
      setForm(DEFAULT);
    }
  }, [supplement, open]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      dosage: form.dosage.trim() || null,
      schedule_slot: form.schedule_slot,
      custom_time: form.schedule_slot === 'custom' ? form.custom_time || null : null,
      quantity_remaining: Number(form.quantity_remaining) || 0,
      low_threshold: Number(form.low_threshold) || 7,
      is_active: true,
    };

    if (supplement) {
      await supabase.from('supplements').update(payload).eq('id', supplement.id);
    } else {
      await supabase.from('supplements').insert(payload);
    }

    setSaving(false);
    onSaved();
    onClose();
  }

  async function deactivate() {
    if (!supplement) return;
    setDeleting(true);
    await supabase.from('supplements').update({ is_active: false }).eq('id', supplement.id);
    setDeleting(false);
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={supplement ? 'Edit supplement' : 'New supplement'}>
      <div className="space-y-4">
        <Label>
          <LabelText>Name</LabelText>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Creatine Monohydrate" autoFocus />
        </Label>

        <div className="grid grid-cols-2 gap-3">
          <Label>
            <LabelText>Dosage</LabelText>
            <Input value={form.dosage} onChange={(e) => set('dosage', e.target.value)} placeholder="e.g. 5g" />
          </Label>
          <Label>
            <LabelText>Schedule</LabelText>
            <Select value={form.schedule_slot} onChange={(e) => set('schedule_slot', e.target.value)}>
              {SCHEDULE_SLOTS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </Select>
          </Label>
        </div>

        {form.schedule_slot === 'custom' && (
          <Label>
            <LabelText>Custom time</LabelText>
            <Input type="time" value={form.custom_time} onChange={(e) => set('custom_time', e.target.value)} />
          </Label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Label>
            <LabelText>Quantity remaining</LabelText>
            <Input type="number" min={0} value={form.quantity_remaining} onChange={(e) => set('quantity_remaining', Number(e.target.value))} />
          </Label>
          <Label>
            <LabelText>Low-stock alert at</LabelText>
            <Input type="number" min={1} value={form.low_threshold} onChange={(e) => set('low_threshold', Number(e.target.value))} />
          </Label>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button loading={saving} onClick={save}>{supplement ? 'Update' : 'Create'}</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {supplement && (
            <Button variant="danger" size="sm" loading={deleting} onClick={deactivate} className="ml-auto">
              Remove
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

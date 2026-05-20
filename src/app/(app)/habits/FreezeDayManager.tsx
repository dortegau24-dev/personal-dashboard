'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, LabelText } from '@/components/ui/Input';
import { today, formatDate } from '@/lib/dates';
import { Snowflake, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FreezeDay } from './types';

const MAX_FREEZE_DAYS = 12;

type Props = {
  open: boolean;
  onClose: () => void;
  freezeDays: FreezeDay[];
  onSaved: () => void;
};

export function FreezeDayManager({ open, onClose, freezeDays, onSaved }: Props) {
  const supabase = createClient();
  const [date, setDate] = useState(today());
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const totalFreezes = freezeDays.filter((f) => f.is_total_freeze).length;
  const remaining = MAX_FREEZE_DAYS - totalFreezes;

  async function add() {
    if (remaining <= 0) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('freeze_days').upsert({
      user_id: user.id,
      date,
      reason: reason.trim() || null,
      is_total_freeze: true,
    }, { onConflict: 'user_id,date' });
    setSaving(false);
    setReason('');
    onSaved();
  }

  async function remove(id: string) {
    await supabase.from('freeze_days').delete().eq('id', id);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Freeze days">
      <p className="text-xs text-silver-dim mb-4 leading-relaxed">
        On freeze days, all habit streaks are preserved regardless of completion.
        Max {MAX_FREEZE_DAYS} per year.
      </p>

      <div className="flex items-center gap-2 mb-4">
        <Snowflake className={cn('w-4 h-4', remaining > 3 ? 'text-silver' : 'text-warning')} />
        <span className="text-sm">
          <span className="num text-white font-medium">{remaining}</span>
          <span className="text-silver-dim"> remaining this year</span>
        </span>
      </div>

      <div className="flex items-end gap-2 mb-5">
        <Label className="flex-1">
          <LabelText>Date</LabelText>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Label>
        <Label className="flex-1">
          <LabelText>Reason (optional)</LabelText>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wedding" />
        </Label>
        <Button size="sm" loading={saving} onClick={add} disabled={remaining <= 0}>
          Add
        </Button>
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {freezeDays
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((f) => (
            <div key={f.id} className="flex items-center gap-2 text-sm glass rounded-lg px-3 py-2">
              <Snowflake className="w-3 h-3 text-silver-dim" />
              <span className="num text-xs">{formatDate(f.date, 'long')}</span>
              {f.reason && <span className="text-xs text-muted truncate flex-1">{f.reason}</span>}
              <button onClick={() => remove(f.id)} className="text-muted hover:text-danger transition ml-auto">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        {freezeDays.length === 0 && (
          <p className="text-xs text-muted text-center py-4">No freeze days set this year.</p>
        )}
      </div>
    </Modal>
  );
}

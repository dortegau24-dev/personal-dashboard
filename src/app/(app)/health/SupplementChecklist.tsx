'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/GlassCard';
import { today } from '@/lib/dates';
import { Check, AlertTriangle, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Supplement, SupplementLog } from './types';
import { SLOT_LABELS } from './types';

type Props = {
  supplements: Supplement[];
  logs: SupplementLog[];
  onToggle: () => void;
  onEdit: (s: Supplement) => void;
};

export function SupplementChecklist({ supplements, logs, onToggle, onEdit }: Props) {
  const supabase = createClient();
  const [loading, setLoading] = useState<string | null>(null);

  const groups = supplements.reduce<Record<string, Supplement[]>>((acc, s) => {
    const slot = s.schedule_slot ?? 'morning';
    (acc[slot] ??= []).push(s);
    return acc;
  }, {});

  const order = ['morning', 'lunch', 'evening', 'custom'];

  async function toggle(supp: Supplement) {
    setLoading(supp.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const existing = logs.find((l) => l.supplement_id === supp.id);
    if (existing) {
      await supabase.from('supplement_logs').delete().eq('id', existing.id);
    } else {
      await supabase.from('supplement_logs').insert({
        user_id: user.id,
        supplement_id: supp.id,
        date: today(),
        taken_at: new Date().toISOString(),
      });
      // Decrement inventory
      if (supp.quantity_remaining > 0) {
        await supabase.from('supplements').update({ quantity_remaining: supp.quantity_remaining - 1 }).eq('id', supp.id);
      }
    }
    setLoading(null);
    onToggle();
  }

  if (supplements.length === 0) {
    return (
      <GlassCard className="text-center py-12">
        <p className="text-silver-dim text-sm mb-2">No supplements tracked</p>
        <p className="text-xs text-muted">Click &quot;Add supplement&quot; to start your stack.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {order.filter((slot) => groups[slot]?.length).map((slot) => (
        <div key={slot}>
          <h3 className="text-[10px] uppercase tracking-widest text-silver-dim mb-2">{SLOT_LABELS[slot]}</h3>
          <div className="space-y-1.5">
            {groups[slot].map((supp) => {
              const taken = logs.some((l) => l.supplement_id === supp.id);
              const lowStock = supp.quantity_remaining > 0 && supp.quantity_remaining <= supp.low_threshold;

              return (
                <GlassCard
                  key={supp.id}
                  hover
                  className={cn('flex items-center gap-3 p-3 !rounded-xl group cursor-pointer', taken && 'border-success/20')}
                  onClick={() => toggle(supp)}
                >
                  <div className={cn(
                    'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition',
                    taken ? 'bg-success/20 border-success' : 'border-white/20 hover:border-success/40',
                    loading === supp.id && 'animate-pulse',
                  )}>
                    {taken && <Check className="w-3 h-3 text-success" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-sm', taken ? 'text-white' : 'text-silver')}>{supp.name}</span>
                      {supp.dosage && <span className="text-[10px] text-muted num">{supp.dosage}</span>}
                    </div>
                  </div>

                  {lowStock && (
                    <span className="flex items-center gap-1 text-[10px] text-warning num">
                      <AlertTriangle className="w-3 h-3" />
                      {supp.quantity_remaining} left
                    </span>
                  )}

                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(supp); }}
                    className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition p-1"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </GlassCard>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/GlassCard';
import { Check, Loader2 } from 'lucide-react';

type Profile = {
  id: string;
  user_id: string;
  name: string | null;
  weight_kg: number | null;
  age: number | null;
  unit_preference: 'metric' | 'imperial';
  accent_color: string | null;
  whoop_api_token: string | null;
  openrouter_api_key: string | null;
};

export function SettingsForm({ initialProfile }: { initialProfile: Profile | null }) {
  const supabase = createClient();
  const [profile, setProfile] = useState<Partial<Profile>>(initialProfile ?? {});
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Profile>(k: K, v: Profile[K]) {
    setProfile((p) => ({ ...p, [k]: v }));
    setSaved(false);
  }

  async function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not signed in');
        return;
      }
      const payload = {
        user_id: user.id,
        name: profile.name ?? null,
        weight_kg: profile.weight_kg != null ? Number(profile.weight_kg) : null,
        age: profile.age != null ? Number(profile.age) : null,
        unit_preference: profile.unit_preference ?? 'metric',
        accent_color: profile.accent_color ?? 'gold',
        whoop_api_token: profile.whoop_api_token ?? null,
        openrouter_api_key: profile.openrouter_api_key ?? null,
      };
      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'user_id' });
      if (error) setError(error.message);
      else setSaved(true);
    });
  }

  return (
    <GlassCard className="space-y-5">
      <section>
        <h2 className="text-xs uppercase tracking-widest text-silver-dim mb-3">Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Name">
            <input
              value={profile.name ?? ''}
              onChange={(e) => set('name', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Age">
            <input
              type="number"
              value={profile.age ?? ''}
              onChange={(e) => set('age', e.target.value ? Number(e.target.value) : null)}
              className={inputCls}
            />
          </Field>
          <Field label={profile.unit_preference === 'imperial' ? 'Weight (lbs)' : 'Weight (kg)'}>
            <input
              type="number"
              step="0.1"
              value={profile.weight_kg ?? ''}
              onChange={(e) => set('weight_kg', e.target.value ? Number(e.target.value) : null)}
              className={inputCls}
            />
          </Field>
          <Field label="Units">
            <select
              value={profile.unit_preference ?? 'metric'}
              onChange={(e) => set('unit_preference', e.target.value as 'metric' | 'imperial')}
              className={inputCls}
            >
              <option value="metric">Metric (kg, km)</option>
              <option value="imperial">Imperial (lbs, mi)</option>
            </select>
          </Field>
          <Field label="Accent tone">
            <select
              value={profile.accent_color ?? 'gold'}
              onChange={(e) => set('accent_color', e.target.value)}
              className={inputCls}
            >
              <option value="gold">Gold dominant</option>
              <option value="silver">Silver dominant</option>
              <option value="bronze">Bronze dominant</option>
            </select>
          </Field>
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-widest text-silver-dim mb-3">API keys</h2>
        <p className="text-[11px] text-silver-dim mb-3 leading-relaxed">
          Keys stored in Supabase (RLS protected). Server-side API routes will use these for sync
          and AI calls — never exposed to the client.
        </p>
        <div className="grid grid-cols-1 gap-3">
          <Field label="OpenRouter API key">
            <input
              type="password"
              autoComplete="off"
              placeholder="sk-or-..."
              value={profile.openrouter_api_key ?? ''}
              onChange={(e) => set('openrouter_api_key', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Whoop API token">
            <input
              type="password"
              autoComplete="off"
              value={profile.whoop_api_token ?? ''}
              onChange={(e) => set('whoop_api_token', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={pending}
          className="bg-gradient-to-r from-gold to-bronze text-bg-base font-medium px-5 py-2 rounded-lg text-sm hover:brightness-110 transition flex items-center gap-2 disabled:opacity-50"
        >
          {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save
        </button>
        {saved && (
          <span className="text-xs text-success flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>
    </GlassCard>
  );
}

const inputCls =
  'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold/40 transition';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-widest text-silver-dim mb-1.5">{label}</span>
      {children}
    </label>
  );
}

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GlassCard } from '@/components/GlassCard';
import { SettingsForm } from './SettingsForm';

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] text-silver-dim mb-1">Configuration</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-silver-dim mt-2">Signed in as <span className="text-white">{user.email}</span></p>
      </header>

      <SettingsForm initialProfile={profile ?? null} />

      <GlassCard>
        <h3 className="text-sm font-medium mb-2">Coming in later phases</h3>
        <ul className="text-xs text-silver-dim space-y-1.5 leading-relaxed">
          <li>• Supplement CRUD, habit CRUD, freeze-day manager (Phase 2)</li>
          <li>• Whoop OAuth connect + sync frequency (Phase 3)</li>
          <li>• Time categories, financial accounts, jiujitsu technique library (Phase 4)</li>
          <li>• AI scoring prompt editor, ticker preferences, CSV export, backup</li>
        </ul>
      </GlassCard>
    </div>
  );
}

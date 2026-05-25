import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SettingsForm } from './SettingsForm';
import { WhoopConnection } from './WhoopConnection';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: whoopToken }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('whoop_tokens').select('user_id').eq('user_id', user.id).maybeSingle(),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] text-silver-dim mb-1">Configuration</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-silver-dim mt-2">Signed in as <span className="text-white">{user.email}</span></p>
      </header>

      <SettingsForm initialProfile={profile ?? null} />

      <WhoopConnection
        connected={!!whoopToken}
        autoSync={profile?.whoop_auto_sync ?? true}
        lastSync={profile?.whoop_last_sync ?? null}
      />
    </div>
  );
}

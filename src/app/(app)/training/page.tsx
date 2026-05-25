import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TrainingView } from './TrainingView';

export const dynamic = 'force-dynamic';

export default async function TrainingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [
    { data: wods },
    { data: prs },
    { data: bjjSessions },
    { data: beltHistory },
    { data: triSessions },
    { data: weightEntries },
    { data: whoopData },
  ] = await Promise.all([
    supabase.from('crossfit_wods').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(50),
    supabase.from('crossfit_prs').select('*').eq('user_id', user.id).order('date', { ascending: false }),
    supabase.from('jiujitsu_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(50),
    supabase.from('jiujitsu_belt_history').select('*').eq('user_id', user.id).order('date_awarded', { ascending: false }),
    supabase.from('triathlon_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(50),
    supabase.from('weight_entries').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(60),
    supabase.from('whoop_data').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30),
  ]);

  return (
    <TrainingView
      wods={wods ?? []}
      prs={prs ?? []}
      bjjSessions={bjjSessions ?? []}
      beltHistory={beltHistory ?? []}
      triSessions={triSessions ?? []}
      weightEntries={weightEntries ?? []}
      whoopData={whoopData ?? []}
    />
  );
}

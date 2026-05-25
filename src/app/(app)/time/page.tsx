import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TimeView } from './TimeView';
import { daysAgo } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export default async function TimePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [
    { data: blocks },
    { data: targets },
  ] = await Promise.all([
    supabase.from('time_blocks').select('*').eq('user_id', user.id).gte('date', daysAgo(6)).order('date', { ascending: false }),
    supabase.from('time_targets').select('*').eq('user_id', user.id),
  ]);

  return <TimeView blocks={blocks ?? []} targets={targets ?? []} />;
}

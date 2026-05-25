import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JournalView } from './JournalView';
import { daysAgo } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export default async function JournalPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: entries } = await supabase
    .from('mood_entries')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', daysAgo(89))
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  return <JournalView initialEntries={entries ?? []} />;
}

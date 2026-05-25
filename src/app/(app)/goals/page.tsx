import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GoalsView } from './GoalsView';

export const dynamic = 'force-dynamic';

export default async function GoalsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return <GoalsView goals={goals ?? []} />;
}

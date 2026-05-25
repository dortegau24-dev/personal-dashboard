import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HabitsView } from './HabitsView';
import { today } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export default async function HabitsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [
    { data: habits },
    { data: todayLogs },
    { data: streaks },
  ] = await Promise.all([
    supabase.from('habits').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at'),
    supabase.from('habit_logs').select('*').eq('user_id', user.id).eq('date', today()),
    supabase.from('habit_streaks').select('*').eq('user_id', user.id),
  ]);

  return (
    <HabitsView
      initialHabits={habits ?? []}
      initialLogs={todayLogs ?? []}
      initialStreaks={streaks ?? []}
    />
  );
}

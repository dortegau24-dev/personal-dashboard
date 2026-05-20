import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HabitsView } from './HabitsView';
import { today } from '@/lib/dates';

export default async function HabitsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch active habits
  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('time_of_day', { ascending: true })
    .order('created_at', { ascending: true });

  // Fetch today's logs
  const { data: todayLogs } = await supabase
    .from('habit_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', today());

  // Fetch streaks
  const { data: streaks } = await supabase
    .from('habit_streaks')
    .select('*')
    .eq('user_id', user.id);

  // Fetch recent logs for heatmap (last 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const { data: recentLogs } = await supabase
    .from('habit_logs')
    .select('habit_id, date, completed')
    .eq('user_id', user.id)
    .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true });

  // Fetch freeze days for this year
  const { data: freezeDays } = await supabase
    .from('freeze_days')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', `${new Date().getFullYear()}-01-01`);

  return (
    <HabitsView
      initialHabits={habits ?? []}
      initialLogs={todayLogs ?? []}
      initialStreaks={streaks ?? []}
      recentLogs={recentLogs ?? []}
      freezeDays={freezeDays ?? []}
    />
  );
}

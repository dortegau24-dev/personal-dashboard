import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HealthView } from './HealthView';
import { today, daysAgo } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export default async function HealthPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [
    { data: supplements },
    { data: supplementLogs },
    { data: waterProfile },
    { data: waterLogs },
    { data: nutritionLogs },
    { data: nutritionTargets },
  ] = await Promise.all([
    supabase.from('supplements').select('*').eq('user_id', user.id).eq('is_active', true).order('schedule_slot').order('name'),
    supabase.from('supplement_logs').select('*').eq('user_id', user.id).eq('date', today()),
    supabase.from('water_profile').select('*').eq('user_id', user.id).single(),
    supabase.from('water_logs').select('*').eq('user_id', user.id).gte('date', daysAgo(13)).order('date', { ascending: true }),
    supabase.from('nutrition_logs').select('*').eq('user_id', user.id).eq('date', today()).order('created_at'),
    supabase.from('nutrition_targets').select('*').eq('user_id', user.id).single(),
  ]);

  return (
    <HealthView
      supplements={supplements ?? []}
      supplementLogs={supplementLogs ?? []}
      waterProfile={waterProfile ?? null}
      waterLogs={waterLogs ?? []}
      nutritionLogs={nutritionLogs ?? []}
      nutritionTargets={nutritionTargets ?? null}
    />
  );
}

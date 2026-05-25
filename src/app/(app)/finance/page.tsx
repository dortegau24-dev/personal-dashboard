import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FinanceView } from './FinanceView';

export default async function FinancePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [
    { data: accounts },
    { data: subscriptions },
    { data: purchases },
    { data: wishList },
    { data: incomeLogs },
  ] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', user.id).order('name'),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).order('name'),
    supabase.from('purchases').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(50),
    supabase.from('wish_list').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('income_logs').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(50),
  ]);

  return (
    <FinanceView
      accounts={accounts ?? []}
      subscriptions={subscriptions ?? []}
      purchases={purchases ?? []}
      wishList={wishList ?? []}
      incomeLogs={incomeLogs ?? []}
    />
  );
}

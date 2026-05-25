import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SocialView } from './SocialView';

export const dynamic = 'force-dynamic';

export default async function SocialPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [
    { data: people },
    { data: interactions },
  ] = await Promise.all([
    supabase.from('people').select('*').eq('user_id', user.id).order('name'),
    supabase.from('social_interactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(100),
  ]);

  return <SocialView people={people ?? []} interactions={interactions ?? []} />;
}

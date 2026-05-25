import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { KnowledgeView } from './KnowledgeView';

export const dynamic = 'force-dynamic';

export default async function KnowledgePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: entries } = await supabase
    .from('learning_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return <KnowledgeView entries={entries ?? []} />;
}

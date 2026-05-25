import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncWhoopForUser } from '@/lib/whoop-sync';

export const dynamic = 'force-dynamic';

/** POST /api/whoop/sync — manual on-demand sync */
export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await syncWhoopForUser(supabase, user.id, 14);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

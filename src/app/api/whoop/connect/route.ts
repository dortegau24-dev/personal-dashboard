import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildAuthUrl } from '@/lib/whoop';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

/** GET /api/whoop/connect — start OAuth flow */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // CSRF state — store in cookie, verify on callback
  const state = randomBytes(16).toString('hex');
  const url = buildAuthUrl(state);

  const res = NextResponse.redirect(url);
  res.cookies.set('whoop_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 min
    path: '/',
  });
  return res;
}

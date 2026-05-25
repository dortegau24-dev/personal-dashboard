'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Verify PIN with server
    const res = await fetch('/api/auth/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });

    if (!res.ok) {
      setError('Wrong PIN');
      setLoading(false);
      return;
    }

    // PIN correct — sign into Supabase with stored credentials
    const { email, password } = await res.json();
    const supabase = createClient();
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (authErr) {
      setError('Auth error — check server config');
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-base">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-xs glass rounded-2xl border border-white/[0.08] p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-bronze flex items-center justify-center font-bold text-bg-base">◆</div>
            <div>
              <h1 className="font-semibold tracking-tight text-white">Dashboard</h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-silver-dim">personal OS</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-silver-dim mb-2">Enter PIN</label>
              <input
                type="password"
                required
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-center text-lg tracking-[0.5em] focus:outline-none focus:border-gold/40 transition text-white placeholder:text-white/10"
              />
            </div>

            {error && <p className="text-xs text-red-400 text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-gold to-bronze text-bg-base font-medium py-3 rounded-lg text-sm hover:brightness-110 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Enter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

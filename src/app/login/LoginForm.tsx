'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/GlassCard';
import { Loader2 } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <GlassCard strong className="w-full max-w-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-bronze flex items-center justify-center font-bold text-bg-base">◆</div>
            <div>
              <h1 className="font-semibold tracking-tight">Personal Dashboard</h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-silver-dim">personal OS</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="block text-xs uppercase tracking-widest text-silver-dim mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold/40 transition"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-silver-dim mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gold/40 transition"
              />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-gold to-bronze text-bg-base font-medium py-2.5 rounded-lg text-sm hover:brightness-110 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <button
            onClick={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
            className="block w-full text-center text-xs text-silver-dim hover:text-gold mt-4 transition"
          >
            {mode === 'signin' ? "No account yet? Create one" : 'Have an account? Sign in'}
          </button>
        </GlassCard>
      </div>
    </div>
  );
}

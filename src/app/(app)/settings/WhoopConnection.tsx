'use client';

import { useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/Button';
import { Activity, CheckCircle2, RefreshCw, AlertCircle, Power } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  connected: boolean;
  autoSync: boolean;
  lastSync: string | null;
};

export function WhoopConnection({ connected, autoSync: initAuto, lastSync }: Props) {
  const supabase = createClient();
  const params = useSearchParams();
  const [autoSync, setAutoSync] = useState(initAuto);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const connectedFlag = params.get('whoop_connected') === '1';
  const errorFlag = params.get('whoop_error');

  async function syncNow() {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const res = await fetch('/api/whoop/sync', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) setSyncError(json.error ?? 'Sync failed');
      else setSyncResult(`Synced ${json.synced} day(s). Last: ${json.lastDate ?? '—'}`);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Network error');
    }
    setSyncing(false);
  }

  function toggleAutoSync() {
    const next = !autoSync;
    setAutoSync(next);
    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update({ whoop_auto_sync: next }).eq('user_id', user.id);
    });
  }

  async function disconnect() {
    if (!confirm('Disconnect Whoop? Your historical data stays — only the OAuth tokens are removed.')) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('whoop_tokens').delete().eq('user_id', user.id);
    window.location.reload();
  }

  const fmtLast = lastSync
    ? new Date(lastSync).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Never';

  return (
    <GlassCard className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gold" />
          <h2 className="text-xs uppercase tracking-widest text-silver-dim">Whoop integration</h2>
        </div>
        <span className={cn(
          'flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border',
          connected
            ? 'text-success border-success/30 bg-success/10'
            : 'text-silver-dim border-white/[0.08] bg-white/[0.03]',
        )}>
          {connected ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {connected ? 'Connected' : 'Not connected'}
        </span>
      </div>

      {(connectedFlag || errorFlag) && (
        <div className={cn(
          'text-xs rounded-lg px-3 py-2 border',
          connectedFlag
            ? 'text-success border-success/30 bg-success/10'
            : 'text-danger border-danger/30 bg-danger/10',
        )}>
          {connectedFlag && '✓ Whoop connected. Initial 30-day sync complete.'}
          {errorFlag && `Connection failed: ${errorFlag}`}
        </div>
      )}

      {!connected ? (
        <>
          <p className="text-xs text-silver-dim leading-relaxed">
            Authorize this app to pull your Recovery, Strain, Sleep, HRV, and RHR data from Whoop.
            Data syncs every 8 hours plus manual on-demand.
          </p>
          <a
            href="/api/whoop/connect"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-gold to-bronze text-bg-base font-medium px-4 py-2 rounded-lg text-sm hover:brightness-110 transition"
          >
            <Activity className="w-3.5 h-3.5" />
            Connect Whoop
          </a>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-silver-dim mb-0.5">Last synced</p>
              <p className="num text-white/90">{fmtLast}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-silver-dim mb-0.5">Schedule</p>
              <p className="text-white/90">Every 8 hours</p>
            </div>
          </div>

          {/* Auto-sync toggle */}
          <button
            onClick={toggleAutoSync}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition"
          >
            <div className="text-left">
              <p className="text-sm">Auto-sync every 8 hours</p>
              <p className="text-[10px] text-silver-dim">Background cron pulls fresh data on schedule</p>
            </div>
            <div className={cn(
              'w-10 h-6 rounded-full p-0.5 transition',
              autoSync ? 'bg-gold/40' : 'bg-white/[0.06]',
            )}>
              <div className={cn(
                'w-5 h-5 rounded-full bg-white transition-transform',
                autoSync && 'translate-x-4',
              )} />
            </div>
          </button>

          {syncError && <p className="text-xs text-danger">{syncError}</p>}
          {syncResult && <p className="text-xs text-success">{syncResult}</p>}

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              loading={syncing}
              onClick={syncNow}
              icon={syncing ? undefined : <RefreshCw className="w-3.5 h-3.5" />}
            >
              Sync now
            </Button>
            <Button size="sm" variant="ghost" onClick={disconnect} icon={<Power className="w-3.5 h-3.5" />}>
              Disconnect
            </Button>
          </div>
        </>
      )}
    </GlassCard>
  );
}

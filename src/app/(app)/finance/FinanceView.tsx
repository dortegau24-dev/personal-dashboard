'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { today } from '@/lib/dates';
import { GlassCard } from '@/components/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input, Select, Label, LabelText } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Wallet, CreditCard, ShoppingBag, Heart, DollarSign, TrendingUp, TrendingDown, RefreshCw, Banknote, ExternalLink } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import type { Account, Subscription, Purchase, WishListItem, IncomeLog } from './types';
import { ACCOUNT_TYPES, SUB_CYCLES, PURCHASE_CATEGORIES, PRIORITIES } from './types';

type Props = {
  accounts: Account[];
  subscriptions: Subscription[];
  purchases: Purchase[];
  wishList: WishListItem[];
  incomeLogs: IncomeLog[];
};

function fmtUsd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}

type Tab = 'accounts' | 'subscriptions' | 'purchases' | 'wishlist' | 'income';

export function FinanceView({ accounts: initAcc, subscriptions: initSubs, purchases: initPurch, wishList: initWish, incomeLogs: initIncome }: Props) {
  const supabase = createClient();
  const [accounts, setAccounts] = useState(initAcc);
  const [subs, setSubs] = useState(initSubs);
  const [purchases, setPurchases] = useState(initPurch);
  const [wishList, setWishList] = useState(initWish);
  const [incomeLogs, setIncomeLogs] = useState(initIncome);
  const [tab, setTab] = useState<Tab>('accounts');
  const [saving, setSaving] = useState(false);

  // Modals
  const [showAcct, setShowAcct] = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [showPurch, setShowPurch] = useState(false);
  const [showWish, setShowWish] = useState(false);
  const [showIncome, setShowIncome] = useState(false);

  // Account form
  const [acctName, setAcctName] = useState('');
  const [acctType, setAcctType] = useState('Checking');
  const [acctCurrency, setAcctCurrency] = useState('USD');
  const [acctBalance, setAcctBalance] = useState('');
  const [acctRate, setAcctRate] = useState('1');

  // Subscription form
  const [subName, setSubName] = useState('');
  const [subCost, setSubCost] = useState('');
  const [subCycle, setSubCycle] = useState('Monthly');
  const [subCategory, setSubCategory] = useState('');
  const [subRenewal, setSubRenewal] = useState('');

  // Purchase form
  const [purchItem, setPurchItem] = useState('');
  const [purchCost, setPurchCost] = useState('');
  const [purchDate, setPurchDate] = useState(today());
  const [purchCategory, setPurchCategory] = useState('Other');

  // Wish list form
  const [wishItem, setWishItem] = useState('');
  const [wishCost, setWishCost] = useState('');
  const [wishPriority, setWishPriority] = useState('Medium');
  const [wishLink, setWishLink] = useState('');
  const [wishImage, setWishImage] = useState('');

  // Income form
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeSource, setIncomeSource] = useState('');
  const [incomeDate, setIncomeDate] = useState(today());
  const [incomeNotes, setIncomeNotes] = useState('');

  const netWorth = useMemo(() => accounts.reduce((s, a) => s + (Number(a.balance_usd) || 0), 0), [accounts]);
  const totalIncome = useMemo(() => incomeLogs.reduce((s, i) => s + Number(i.amount_usd), 0), [incomeLogs]);
  const monthlySubCost = useMemo(() => {
    return subs.filter((s) => s.status === 'active').reduce((sum, s) => {
      const cost = Number(s.cost_usd);
      if (s.cycle === 'Yearly') return sum + cost / 12;
      if (s.cycle === 'Quarterly') return sum + cost / 3;
      if (s.cycle === 'Weekly') return sum + cost * 4.33;
      return sum + cost;
    }, 0);
  }, [subs]);
  const monthPurchases = useMemo(() => {
    const m = new Date().toISOString().slice(0, 7);
    return purchases.filter((p) => p.date.startsWith(m)).reduce((s, p) => s + Number(p.cost_usd), 0);
  }, [purchases]);

  // Build net worth history from account creation dates, purchases, and income
  const netWorthHistory = useMemo(() => {
    // Collect all financial events sorted by date
    type Event = { date: string; delta: number; label: string };
    const events: Event[] = [];

    // Account creations = initial balance added
    for (const a of accounts) {
      const date = a.created_at.split('T')[0];
      events.push({ date, delta: Number(a.balance_usd) || 0, label: `Account: ${a.name}` });
    }

    // Income adds to net worth
    for (const i of incomeLogs) {
      events.push({ date: i.date, delta: Number(i.amount_usd), label: `Income: ${i.source || 'Unknown'}` });
    }

    // Purchases subtract from net worth
    for (const p of purchases) {
      events.push({ date: p.date, delta: -Number(p.cost_usd), label: `Purchase: ${p.item_name}` });
    }

    events.sort((a, b) => a.date.localeCompare(b.date));

    if (events.length === 0) return [];

    // Build running total
    const dataMap = new Map<string, number>();
    let running = 0;
    for (const ev of events) {
      running += ev.delta;
      dataMap.set(ev.date, running);
    }

    // Convert to array
    return Array.from(dataMap.entries()).map(([date, value]) => ({
      date,
      label: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.round(value * 100) / 100,
    }));
  }, [accounts, incomeLogs, purchases]);

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Session expired — please log in again.'); window.location.href = '/login'; return; }
      const balLocal = Number(acctBalance) || 0;
      const rate = Number(acctRate) || 1;
      const { data, error } = await supabase.from('accounts').insert({
        user_id: user.id, name: acctName, type: acctType, currency: acctCurrency,
        balance_local: balLocal, exchange_rate_to_usd: rate, balance_usd: balLocal * rate,
      }).select().single();
      if (error) { alert(`Failed to add account: ${error.message}`); return; }
      if (data) { setAccounts((p) => [...p, data]); setShowAcct(false); setAcctName(''); setAcctBalance(''); }
    } finally { setSaving(false); }
  }

  async function deleteAccount(id: string) {
    await supabase.from('accounts').delete().eq('id', id);
    setAccounts((p) => p.filter((a) => a.id !== id));
  }

  async function addSubscription(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Session expired — please log in again.'); window.location.href = '/login'; return; }
      const { data, error } = await supabase.from('subscriptions').insert({
        user_id: user.id, name: subName, cost_usd: Number(subCost), cycle: subCycle,
        category: subCategory || null, renewal_date: subRenewal || null,
      }).select().single();
      if (error) { alert(`Failed to add subscription: ${error.message}`); return; }
      if (data) { setSubs((p) => [...p, data]); setShowSub(false); setSubName(''); setSubCost(''); }
    } finally { setSaving(false); }
  }

  async function deleteSub(id: string) {
    await supabase.from('subscriptions').delete().eq('id', id);
    setSubs((p) => p.filter((s) => s.id !== id));
  }

  async function addPurchase(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Session expired — please log in again.'); window.location.href = '/login'; return; }
      const cost = Number(purchCost);
      const nwPct = netWorth > 0 ? (cost / netWorth) * 100 : null;
      const { data, error } = await supabase.from('purchases').insert({
        user_id: user.id, item_name: purchItem, cost_usd: cost, date: purchDate,
        category: purchCategory, net_worth_percentage: nwPct,
      }).select().single();
      if (error) { alert(`Failed to add purchase: ${error.message}`); return; }
      if (data) { setPurchases((p) => [data, ...p]); setShowPurch(false); setPurchItem(''); setPurchCost(''); }
    } finally { setSaving(false); }
  }

  async function deletePurchase(id: string) {
    await supabase.from('purchases').delete().eq('id', id);
    setPurchases((p) => p.filter((x) => x.id !== id));
  }

  async function addWishItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Session expired — please log in again.'); window.location.href = '/login'; return; }
      const { data, error } = await supabase.from('wish_list').insert({
        user_id: user.id, item_name: wishItem, estimated_cost_usd: Number(wishCost) || null,
        priority: wishPriority, link: wishLink || null, image_url: wishImage || null,
      }).select().single();
      if (error) { alert(`Failed to add wish item: ${error.message}`); return; }
      if (data) { setWishList((p) => [...p, data]); setShowWish(false); setWishItem(''); setWishCost(''); setWishLink(''); setWishImage(''); }
    } finally { setSaving(false); }
  }

  async function deleteWishItem(id: string) {
    await supabase.from('wish_list').delete().eq('id', id);
    setWishList((p) => p.filter((w) => w.id !== id));
  }

  async function addIncome(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Session expired — please log in again.'); window.location.href = '/login'; return; }
      const { data, error } = await supabase.from('income_logs').insert({
        user_id: user.id, amount_usd: Number(incomeAmount), source: incomeSource || null,
        date: incomeDate, notes: incomeNotes || null,
      }).select().single();
      if (error) { alert(`Failed to add income: ${error.message}`); return; }
      if (data) { setIncomeLogs((p) => [data, ...p]); setShowIncome(false); setIncomeAmount(''); setIncomeSource(''); setIncomeNotes(''); }
    } finally { setSaving(false); }
  }

  async function deleteIncome(id: string) {
    await supabase.from('income_logs').delete().eq('id', id);
    setIncomeLogs((p) => p.filter((i) => i.id !== id));
  }

  const TABS = [
    { key: 'accounts' as Tab, label: 'Accounts', icon: Wallet },
    { key: 'income' as Tab, label: 'Income', icon: Banknote },
    { key: 'subscriptions' as Tab, label: 'Subs', icon: RefreshCw },
    { key: 'purchases' as Tab, label: 'Purchases', icon: ShoppingBag },
    { key: 'wishlist' as Tab, label: 'Wish List', icon: Heart },
  ];

  const PRIORITY_COLORS: Record<string, string> = { High: 'text-danger', Medium: 'text-warning', Low: 'text-success' };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] text-silver-dim mb-1">Money</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Finance</h1>
      </header>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GlassCard hover className="p-4 text-center">
          <DollarSign className="w-4 h-4 text-gold mx-auto mb-1" />
          <p className="num text-lg font-semibold text-gold-gradient">{fmtUsd(netWorth)}</p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">Net worth</p>
        </GlassCard>
        <GlassCard hover className="p-4 text-center">
          <TrendingUp className="w-4 h-4 text-success mx-auto mb-1" />
          <p className="num text-lg font-semibold text-success">{fmtUsd(totalIncome)}</p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">Total income</p>
        </GlassCard>
        <GlassCard hover className="p-4 text-center">
          <RefreshCw className="w-4 h-4 text-bronze mx-auto mb-1" />
          <p className="num text-lg font-semibold text-bronze">{fmtUsd(monthlySubCost)}</p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">Monthly subs</p>
        </GlassCard>
        <GlassCard hover className="p-4 text-center">
          <ShoppingBag className="w-4 h-4 text-silver mx-auto mb-1" />
          <p className="num text-lg font-semibold text-silver">{fmtUsd(monthPurchases)}</p>
          <p className="text-[10px] uppercase tracking-widest text-silver-dim">Spent this month</p>
        </GlassCard>
      </div>

      {/* Net Worth Graph */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-gold" />
          <span className="text-xs uppercase tracking-widest text-silver-dim">Net Worth Over Time</span>
        </div>
        {netWorthHistory.length < 2 ? (
          <div className="flex items-center justify-center h-32 text-sm text-silver-dim">
            Add accounts, income, or purchases to see your net worth trend
          </div>
        ) : (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netWorthHistory}>
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={50} />
                <Tooltip content={({ payload }) => {
                  if (!payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="glass rounded-lg px-3 py-2 text-xs border border-white/[0.08] shadow-2xl shadow-black/50">
                      <p className="font-medium text-white">{d.label}</p>
                      <p className="num text-gold">{fmtUsd(d.value)}</p>
                    </div>
                  );
                }} />
                <Area type="monotone" dataKey="value" stroke="#D4AF37" fill="url(#nwGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 glass rounded-xl w-fit overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition ${tab === key ? 'bg-white/[0.08] text-white' : 'text-silver-dim hover:text-white'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Accounts */}
      {tab === 'accounts' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowAcct(true)}>Add account</Button>
          </div>
          {accounts.length === 0 ? (
            <GlassCard className="p-8 text-center"><Wallet className="w-10 h-10 text-silver-dim/30 mx-auto mb-3" /><p className="text-sm text-silver-dim">No accounts yet</p></GlassCard>
          ) : (
            accounts.map((a) => (
              <GlassCard key={a.id} hover className="p-4 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-[10px] text-muted uppercase">{a.type} &middot; {a.currency}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('num text-lg font-semibold', Number(a.balance_usd) >= 0 ? 'text-success' : 'text-danger')}>{fmtUsd(Number(a.balance_usd) || 0)}</span>
                    <button onClick={() => deleteAccount(a.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-danger transition"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {/* Income */}
      {tab === 'income' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowIncome(true)}>Add income</Button>
          </div>
          {incomeLogs.length === 0 ? (
            <GlassCard className="p-8 text-center"><Banknote className="w-10 h-10 text-silver-dim/30 mx-auto mb-3" /><p className="text-sm text-silver-dim">No income logged yet</p></GlassCard>
          ) : (
            incomeLogs.map((i) => (
              <GlassCard key={i.id} hover className="p-4 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{i.source || 'Income'}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted">
                      <span className="num">{i.date}</span>
                      {i.notes && <span>{i.notes}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="num text-sm font-semibold text-success">+{fmtUsd(Number(i.amount_usd))}</span>
                    <button onClick={() => deleteIncome(i.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-danger transition"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {/* Subscriptions */}
      {tab === 'subscriptions' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowSub(true)}>Add subscription</Button>
          </div>
          {subs.length === 0 ? (
            <GlassCard className="p-8 text-center"><RefreshCw className="w-10 h-10 text-silver-dim/30 mx-auto mb-3" /><p className="text-sm text-silver-dim">No subscriptions yet</p></GlassCard>
          ) : (
            subs.map((s) => (
              <GlassCard key={s.id} hover className="p-4 group">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2"><p className="text-sm font-medium">{s.name}</p>{s.category && <span className="text-[10px] text-muted">{s.category}</span>}</div>
                    <p className="text-[10px] text-silver-dim num">{s.cycle}{s.renewal_date && ` · Renews ${s.renewal_date}`}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="num text-sm font-semibold text-bronze">{fmtUsd(Number(s.cost_usd))}<span className="text-muted text-[10px]">/{s.cycle === 'Yearly' ? 'yr' : s.cycle === 'Weekly' ? 'wk' : 'mo'}</span></span>
                    <button onClick={() => deleteSub(s.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-danger transition"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {/* Purchases */}
      {tab === 'purchases' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowPurch(true)}>Add purchase</Button>
          </div>
          {purchases.length === 0 ? (
            <GlassCard className="p-8 text-center"><ShoppingBag className="w-10 h-10 text-silver-dim/30 mx-auto mb-3" /><p className="text-sm text-silver-dim">No purchases logged</p></GlassCard>
          ) : (
            purchases.map((p) => (
              <GlassCard key={p.id} hover className="p-4 group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{p.item_name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted">
                      <span className="num">{p.date}</span>
                      {p.category && <span>{p.category}</span>}
                      {p.net_worth_percentage != null && <span className="num text-warning">{Number(p.net_worth_percentage).toFixed(2)}% NW</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="num text-sm font-semibold text-danger">{fmtUsd(Number(p.cost_usd))}</span>
                    <button onClick={() => deletePurchase(p.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-danger transition"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </GlassCard>
            ))
          )}
        </div>
      )}

      {/* Wish List */}
      {tab === 'wishlist' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowWish(true)}>Add item</Button>
          </div>
          {wishList.length === 0 ? (
            <GlassCard className="p-8 text-center"><Heart className="w-10 h-10 text-silver-dim/30 mx-auto mb-3" /><p className="text-sm text-silver-dim">Wish list is empty</p></GlassCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {wishList.map((w) => (
                <GlassCard key={w.id} hover className="p-4 group">
                  <div className="flex gap-3">
                    {w.image_url && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.04]">
                        <img src={w.image_url} alt={w.item_name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{w.item_name}</p>
                          <div className="flex items-center gap-2 text-[10px]">
                            {w.priority && <span className={cn('font-medium', PRIORITY_COLORS[w.priority])}>{w.priority}</span>}
                            {w.estimated_cost_usd && <span className="num text-muted">{fmtUsd(Number(w.estimated_cost_usd))}</span>}
                          </div>
                          {w.link && (
                            <a href={w.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5 mt-0.5">
                              <ExternalLink className="w-2.5 h-2.5" /> Link
                            </a>
                          )}
                        </div>
                        <button onClick={() => deleteWishItem(w.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-danger transition"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <Modal open={showAcct} onClose={() => setShowAcct(false)} title="Add Account">
        <form onSubmit={addAccount} className="space-y-3">
          <Label><LabelText>Name</LabelText><Input required placeholder="e.g. Chase Checking" value={acctName} onChange={(e) => setAcctName(e.target.value)} /></Label>
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Type</LabelText><Select value={acctType} onChange={(e) => setAcctType(e.target.value)}>{ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Label>
            <Label><LabelText>Currency</LabelText><Input value={acctCurrency} onChange={(e) => setAcctCurrency(e.target.value)} placeholder="USD" /></Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Balance</LabelText><Input type="number" step="0.01" required value={acctBalance} onChange={(e) => setAcctBalance(e.target.value)} /></Label>
            <Label><LabelText>Rate to USD</LabelText><Input type="number" step="0.0001" value={acctRate} onChange={(e) => setAcctRate(e.target.value)} /></Label>
          </div>
          <Button type="submit" loading={saving} className="w-full mt-2">Add account</Button>
        </form>
      </Modal>

      <Modal open={showSub} onClose={() => setShowSub(false)} title="Add Subscription">
        <form onSubmit={addSubscription} className="space-y-3">
          <Label><LabelText>Name</LabelText><Input required placeholder="e.g. Spotify" value={subName} onChange={(e) => setSubName(e.target.value)} /></Label>
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Cost (USD)</LabelText><Input type="number" step="0.01" required value={subCost} onChange={(e) => setSubCost(e.target.value)} /></Label>
            <Label><LabelText>Cycle</LabelText><Select value={subCycle} onChange={(e) => setSubCycle(e.target.value)}>{SUB_CYCLES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Label>
          </div>
          <Label><LabelText>Category</LabelText><Input placeholder="e.g. Entertainment" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} /></Label>
          <Label><LabelText>Renewal date</LabelText><Input type="date" value={subRenewal} onChange={(e) => setSubRenewal(e.target.value)} /></Label>
          <Button type="submit" loading={saving} className="w-full mt-2">Add subscription</Button>
        </form>
      </Modal>

      <Modal open={showPurch} onClose={() => setShowPurch(false)} title="Log Purchase">
        <form onSubmit={addPurchase} className="space-y-3">
          <Label><LabelText>Item</LabelText><Input required placeholder="What did you buy?" value={purchItem} onChange={(e) => setPurchItem(e.target.value)} /></Label>
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Cost (USD)</LabelText><Input type="number" step="0.01" required value={purchCost} onChange={(e) => setPurchCost(e.target.value)} /></Label>
            <Label><LabelText>Date</LabelText><Input type="date" required value={purchDate} onChange={(e) => setPurchDate(e.target.value)} /></Label>
          </div>
          <Label><LabelText>Category</LabelText><Select value={purchCategory} onChange={(e) => setPurchCategory(e.target.value)}>{PURCHASE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Label>
          <Button type="submit" loading={saving} className="w-full mt-2">Log purchase</Button>
        </form>
      </Modal>

      <Modal open={showWish} onClose={() => setShowWish(false)} title="Add Wish List Item">
        <form onSubmit={addWishItem} className="space-y-3">
          <Label><LabelText>Item</LabelText><Input required placeholder="What do you want?" value={wishItem} onChange={(e) => setWishItem(e.target.value)} /></Label>
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Est. cost (USD)</LabelText><Input type="number" step="0.01" value={wishCost} onChange={(e) => setWishCost(e.target.value)} /></Label>
            <Label><LabelText>Priority</LabelText><Select value={wishPriority} onChange={(e) => setWishPriority(e.target.value)}>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</Select></Label>
          </div>
          <Label><LabelText>Link</LabelText><Input placeholder="URL (optional)" value={wishLink} onChange={(e) => setWishLink(e.target.value)} /></Label>
          <Label><LabelText>Image URL</LabelText><Input placeholder="Image URL (optional)" value={wishImage} onChange={(e) => setWishImage(e.target.value)} /></Label>
          <Button type="submit" loading={saving} className="w-full mt-2">Add to wish list</Button>
        </form>
      </Modal>

      <Modal open={showIncome} onClose={() => setShowIncome(false)} title="Add Income">
        <form onSubmit={addIncome} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Label><LabelText>Amount (USD)</LabelText><Input type="number" step="0.01" required placeholder="0.00" value={incomeAmount} onChange={(e) => setIncomeAmount(e.target.value)} /></Label>
            <Label><LabelText>Date</LabelText><Input type="date" required value={incomeDate} onChange={(e) => setIncomeDate(e.target.value)} /></Label>
          </div>
          <Label><LabelText>Source</LabelText><Input placeholder="e.g. Salary, Freelance, Gift..." value={incomeSource} onChange={(e) => setIncomeSource(e.target.value)} /></Label>
          <Label><LabelText>Notes</LabelText><Input placeholder="Optional notes" value={incomeNotes} onChange={(e) => setIncomeNotes(e.target.value)} /></Label>
          <Button type="submit" loading={saving} className="w-full mt-2">Add income</Button>
        </form>
      </Modal>
    </div>
  );
}

export type TickerSeverity = 'red' | 'amber' | 'gold' | 'white';

export type TickerItem = {
  id: string;
  message: string;
  severity: TickerSeverity;
  href?: string;
};

export const MOCK_TICKER: TickerItem[] = [
  { id: '1', message: 'Creatine • missed morning dose',          severity: 'red',   href: '/health' },
  { id: '2', message: 'Netflix renews in 3 days • $15.99',       severity: 'amber', href: '/finance' },
  { id: '3', message: '14-day jiujitsu streak',                  severity: 'gold',  href: '/training' },
  { id: '4', message: 'Whoop recovery 78% • green to push',      severity: 'white', href: '/health' },
  { id: '5', message: 'Q2 goal: triathlon plan 62%',             severity: 'white', href: '/goals' },
  { id: '6', message: 'HRV down 22% vs 30-day baseline',         severity: 'amber', href: '/health' },
  { id: '7', message: 'New PR — back squat 145kg',               severity: 'gold',  href: '/training' },
  { id: '8', message: 'Water 1.2L / 3.4L target',                severity: 'white', href: '/health' },
  { id: '9', message: 'Sunday weekly summary ready',             severity: 'gold',  href: '/' },
  { id: '10', message: 'Subscription audit: 3 unused this month', severity: 'amber', href: '/finance' },
];

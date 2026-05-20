/** Shared date helpers used across modules */

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function dayOfWeek(date: string): number {
  return new Date(date + 'T00:00:00').getDay(); // 0=Sun … 6=Sat
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export function dateRange(start: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDays(start, i));
}

export function formatDate(date: string, style: 'short' | 'long' = 'short'): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', style === 'short'
    ? { month: 'short', day: 'numeric' }
    : { weekday: 'long', month: 'long', day: 'numeric' });
}

export function daysAgo(n: number): string {
  return addDays(today(), -n);
}

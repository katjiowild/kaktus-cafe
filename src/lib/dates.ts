import type { Recurrence } from '../types';

/** Local-time ISO date (yyyy-mm-dd). Never use toISOString() for dates — it
 *  shifts to UTC and can land you a day out. */
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Calendar-month step that clamps: Jan 31 + 1 month = Feb 28/29, not Mar 3. */
export function addMonths(d: Date, n: number): Date {
  const out = new Date(d);
  const day = out.getDate();
  out.setDate(1);
  out.setMonth(out.getMonth() + n);
  const last = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate();
  out.setDate(Math.min(day, last));
  return out;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = b.setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

/** Whole days elapsed since an ISO datetime, floored at 0. */
export function daysSince(iso: string): number {
  return Math.max(0, daysBetween(new Date(iso), new Date()));
}

export function isOverdue(dueDate: string | null, done: boolean): boolean {
  if (!dueDate || done) return false;
  return parseDate(dueDate) < today();
}

/** "Today" / "Tomorrow" / "Yesterday" / "Sep 14". */
export function dueLabel(iso: string | null): string {
  if (!iso) return 'No date';
  const diff = daysBetween(today(), parseDate(iso));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return parseDate(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

export function timeLabel(isoDatetime: string): string {
  return new Date(isoDatetime).toLocaleTimeString('en', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function recurrenceLabel(r: Recurrence | null): string {
  if (!r) return '';
  if (r.kind === 'weekly') return 'Weekly';
  if (r.kind === 'monthly') return 'Monthly';
  const days = [...r.days].sort((a, b) => a - b);
  if (days.length === 0) return 'Repeats';
  if (days.length === 5 && days.every((d) => d >= 1 && d <= 5)) return 'Weekdays';
  if (days.length === 7) return 'Daily';
  return days.map((d) => WEEKDAY_NAMES[d]).join(', ');
}

/**
 * The next occurrence after `from` (§3.3). Completing a recurring task calls
 * this to spawn the next instance, so "water plants" never falls off the list.
 */
export function nextOccurrence(r: Recurrence, from: Date): Date | null {
  if (r.kind === 'weekly') return addDays(from, 7);
  if (r.kind === 'monthly') return addMonths(from, 1);

  const days = [...new Set(r.days)].sort((a, b) => a - b);
  if (days.length === 0) return null;
  // Walk forward to the next selected weekday, wrapping around the week.
  for (let i = 1; i <= 7; i++) {
    const cand = addDays(from, i);
    if (days.includes(cand.getDay())) return cand;
  }
  return null;
}

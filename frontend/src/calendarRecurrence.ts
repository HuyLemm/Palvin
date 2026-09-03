import type { CalendarEvent } from './types';

// `date` on a recurring event is the anchor/first occurrence, never
// mutated afterward — everything else derives an actual occurrence from it
// on the fly, so editing/deleting always targets that one real row by id.

export function eventOccursOn(e: CalendarEvent, dateStr: string): boolean {
  if (!e.recurrence || e.recurrence === 'none') return e.date === dateStr;
  const anchor = new Date(e.date + 'T00:00:00');
  const target = new Date(dateStr + 'T00:00:00');
  if (target < anchor) return false; // recurrence never runs before its own start
  if (e.recurrence === 'yearly') return anchor.getMonth() === target.getMonth() && anchor.getDate() === target.getDate();
  if (e.recurrence === 'monthly') return anchor.getDate() === target.getDate();
  if (e.recurrence === 'weekly') return anchor.getDay() === target.getDay();
  return false;
}

// The next date (today or later) this event actually falls on — just its
// own `date` for a one-off, or the next repeat forward from `date` for a
// recurring one.
export function nextOccurrence(e: CalendarEvent, from: Date): string {
  const fromStr = from.toISOString().slice(0, 10);
  if (!e.recurrence || e.recurrence === 'none') return e.date;
  const anchor = new Date(e.date + 'T00:00:00');
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  if (anchor >= cursor) return e.date;
  const d = new Date(anchor);
  // Jump by whole years/months first (cheap), then linear for the rest —
  // a decades-old anchor date would otherwise need thousands of weekly steps.
  if (e.recurrence === 'yearly') {
    d.setFullYear(cursor.getFullYear());
    if (d < cursor) d.setFullYear(d.getFullYear() + 1);
  } else if (e.recurrence === 'monthly') {
    d.setFullYear(cursor.getFullYear(), cursor.getMonth());
    if (d < cursor) d.setMonth(d.getMonth() + 1);
  } else {
    while (d < cursor) d.setDate(d.getDate() + 7);
  }
  const result = d.toISOString().slice(0, 10);
  return result >= fromStr ? result : e.date;
}

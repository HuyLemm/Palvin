import type { CalendarEvent } from './types';

// `date` on a recurring event is the anchor/first occurrence, never
// mutated afterward — everything else derives an actual occurrence from it
// on the fly, so editing/deleting always targets that one real row by id.

// Formats a Date's own LOCAL y/m/d — never `.toISOString().slice(0, 10)`,
// which converts to UTC first and silently shifts the date back a day for
// any positive-UTC-offset timezone (e.g. Vietnam, UTC+7): a yearly event
// anchored on local midnight July 3rd is `2026-07-02T17:00:00.000Z` in UTC,
// so `.toISOString()` reported it as July 2nd.
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Exactly one calendar month out from `from` (e.g. Sep 3 -> Oct 3), used to
// cap the "Upcoming" widgets on the Dashboard and in Calendar to things
// actually coming up soon — an event further out than that just shows up
// normally once browsed to on the calendar grid, instead of permanently
// occupying an "Upcoming" slot months in advance.
export function oneMonthFrom(from: Date): string {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return toDateStr(d);
}

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
  const fromStr = toDateStr(from);
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
  const result = toDateStr(d);
  return result >= fromStr ? result : e.date;
}

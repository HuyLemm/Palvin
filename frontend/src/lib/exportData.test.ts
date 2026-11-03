import { describe, expect, it } from 'vitest';
import { eventToICS, toCSV } from './exportData';
import type { CalendarEvent } from '../types';

const ev = (over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'e1', title: 'Dinner, with "friends"', date: '2026-11-17', time: '7:30 PM', category: 'date',
  location: 'Cafe; Q1', notes: 'Line one\nLine two', recurrence: 'none', ...over,
} as CalendarEvent);

describe('eventToICS', () => {
  it('turns a 12-hour time into a 24-hour DTSTART and escapes text', () => {
    const ics = eventToICS(ev());
    expect(ics).toContain('DTSTART:20261117T193000');
    expect(ics).toContain('SUMMARY:Dinner\\, with "friends"');
    expect(ics).toContain('LOCATION:Cafe\\; Q1');
    expect(ics).toContain('DESCRIPTION:Line one\\nLine two');
    expect(ics).not.toContain('RRULE');
  });
  it('is an all-day event when there is no time, and keeps recurrence', () => {
    const ics = eventToICS(ev({ time: '', recurrence: 'yearly' }));
    expect(ics).toContain('DTSTART;VALUE=DATE:20261117');
    expect(ics).toContain('DTEND;VALUE=DATE:20261118');
    expect(ics).toContain('RRULE:FREQ=YEARLY');
  });
  it('handles 12 AM / 12 PM', () => {
    expect(eventToICS(ev({ time: '12:15 AM' }))).toContain('T001500');
    expect(eventToICS(ev({ time: '12:15 PM' }))).toContain('T121500');
  });
});

describe('toCSV', () => {
  it('quotes cells, doubles quotes and defuses spreadsheet formulas', () => {
    const csv = toCSV([{ a: 'x,y', b: 'say "hi"', c: '=SUM(A1)' }], ['a', 'b', 'c']);
    expect(csv).toContain('"x,y","say ""hi""",\'=SUM(A1)');
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });
});

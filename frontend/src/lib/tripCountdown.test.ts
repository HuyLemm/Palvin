import { describe, expect, it } from 'vitest';
import type { Trip } from '../types';
import { tripCountdown } from './tripCountdown';

const trip = (id: string, startDate?: string, endDate?: string, status: Trip['status'] = 'upcoming'): Trip =>
  ({ id, title: id, emoji: '✈️', destination: 'x', startDate, endDate, budget: 0, checklist: [], itinerary: [], lodging: [], notes: '', status });
const now = new Date(2026, 10, 1, 15, 0); // 1 Nov 2026

describe('tripCountdown', () => {
  it('picks the nearest upcoming trip inside the horizon', () => {
    const r = tripCountdown([trip('far', '2027-03-01'), trip('near', '2026-11-11'), trip('mid', '2026-12-20')], now);
    expect(r).toMatchObject({ kind: 'soon', days: 10 });
    expect(r?.trip.id).toBe('near');
  });
  it('prefers a trip that is under way today', () => {
    const r = tripCountdown([trip('soon', '2026-11-05'), trip('now', '2026-10-30', '2026-11-03')], now);
    expect(r).toMatchObject({ kind: 'ongoing', days: 2 });
    expect(r?.trip.id).toBe('now');
  });
  it('ignores completed trips, missing dates and trips beyond the horizon', () => {
    expect(tripCountdown([trip('done', '2026-11-10', undefined, 'completed'), trip('nodate'), trip('far', '2027-06-01')], now)).toBeNull();
  });
});

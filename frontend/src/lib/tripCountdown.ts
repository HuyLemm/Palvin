import type { Trip } from '../types';

export interface TripCountdown { trip: Trip; kind: 'ongoing' | 'soon'; days: number }

const dayStart = (iso: string) => new Date(iso + 'T00:00:00');
const todayStart = (now: Date) => new Date(now.getFullYear(), now.getMonth(), now.getDate());

/**
 * The trip to show a countdown for: one that is under way today, otherwise the nearest one starting
 * within `horizonDays`. Completed trips and trips without a start date are ignored.
 */
export function tripCountdown(trips: Trip[], now = new Date(), horizonDays = 90): TripCountdown | null {
  const today = todayStart(now).getTime();
  const DAY = 86_400_000;
  let best: TripCountdown | null = null;
  for (const t of trips) {
    if (t.status === 'completed' || !t.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(t.startDate)) continue;
    const start = dayStart(t.startDate).getTime();
    const end = t.endDate && /^\d{4}-\d{2}-\d{2}$/.test(t.endDate) ? dayStart(t.endDate).getTime() : start;
    if (start <= today && today <= end) return { trip: t, kind: 'ongoing', days: Math.round((end - today) / DAY) };
    const days = Math.round((start - today) / DAY);
    if (days > 0 && days <= horizonDays && (!best || days < best.days)) best = { trip: t, kind: 'soon', days };
  }
  return best;
}

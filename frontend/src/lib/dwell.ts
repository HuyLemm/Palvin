import { distanceMeters } from './location';

// "Stayed about an hour" detection and arrive/leave detection, both as pure steps so they can be
// tested without a phone. The hook feeds them position fixes.

export const STAY_RADIUS_M = 100;           // moving further than this restarts the stay
export const DWELL_MS = 60 * 60_000;        // an hour in one spot counts as a visit
export const MAX_GAP_MS = 45 * 60_000;      // a longer silence (app closed) cannot be bridged

export interface DwellState { lat: number; lng: number; since: number; lastAt: number; reported: boolean }
export interface Fix { lat: number; lng: number; t: number }

/**
 * Returns the next state, and `reached: true` exactly once per stay, when the hour is first complete.
 * `stayStart` is when the stay began (use it as the visit's arrival time).
 */
export function stepDwell(prev: DwellState | null, fix: Fix): { state: DwellState; reached: boolean } {
  const fresh: DwellState = { lat: fix.lat, lng: fix.lng, since: fix.t, lastAt: fix.t, reported: false };
  if (!prev) return { state: fresh, reached: false };
  const near = distanceMeters(prev, fix) <= STAY_RADIUS_M;
  if (!near || fix.t - prev.lastAt > MAX_GAP_MS) return { state: fresh, reached: false };
  const state = { ...prev, lastAt: fix.t };
  if (!prev.reported && fix.t - prev.since >= DWELL_MS) return { state: { ...state, reported: true }, reached: true };
  return { state, reached: false };
}

// ------------------------------------------------------------ arrive / leave
export const CONFIRM_MS = 90_000;       // be inside/outside for this long before announcing (GPS jitter)
export const LEAVE_FACTOR = 1.4;        // you leave once you are 40% beyond the radius
export const COOLDOWN_MS = 10 * 60_000; // never repeat the same announcement within this

export interface PlaceLike { id: string; name: string; emoji: string; lat: number; lng: number; radiusM: number }
export interface PresenceState {
  placeId: string | null;                          // the place we have announced being at
  cand: { placeId: string | null; since: number } | null; // what the latest fixes suggest, and since when
  announced: Record<string, number>;               // `${type}:${placeId}` -> time, for the cooldown
  ready: boolean;                                  // the first reading only sets the baseline, silently
}
export interface PresenceEvent { type: 'arrive' | 'leave'; place: PlaceLike }

export const initialPresence = (): PresenceState => ({ placeId: null, cand: null, announced: {}, ready: false });

function placeNow(places: PlaceLike[], at: { lat: number; lng: number }, current: string | null): string | null {
  let best: string | null = null, bestD = Infinity;
  for (const p of places) {
    const d = distanceMeters(p, at);
    const limit = p.id === current ? p.radiusM * LEAVE_FACTOR : p.radiusM; // hysteresis: harder to leave than to enter
    if (d <= limit && d < bestD) { best = p.id; bestD = d; }
  }
  return best;
}

export function stepPresence(prev: PresenceState, places: PlaceLike[], fix: Fix): { state: PresenceState; event: PresenceEvent | null } {
  const seen = placeNow(places, fix, prev.placeId);
  if (!prev.ready) return { state: { ...prev, placeId: seen, cand: null, ready: true }, event: null };
  if (seen === prev.placeId) return { state: { ...prev, cand: null }, event: null };

  const cand = prev.cand && prev.cand.placeId === seen ? prev.cand : { placeId: seen, since: fix.t };
  if (fix.t - cand.since < CONFIRM_MS) return { state: { ...prev, cand }, event: null };

  // Confirmed: the place changed. Leaving one place and entering another is two events, in that order;
  // we report the more recent (the arrival), since "left X" is implied.
  const target = seen ? places.find(p => p.id === seen)! : places.find(p => p.id === prev.placeId);
  const type: 'arrive' | 'leave' = seen ? 'arrive' : 'leave';
  const next: PresenceState = { ...prev, placeId: seen, cand: null };
  if (!target) return { state: next, event: null }; // the place was deleted meanwhile
  const key = `${type}:${target.id}`;
  if (fix.t - (prev.announced[key] ?? -Infinity) < COOLDOWN_MS) return { state: next, event: null };
  return { state: { ...next, announced: { ...prev.announced, [key]: fix.t } }, event: { type, place: target } };
}

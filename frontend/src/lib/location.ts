import { supabase } from './supabaseClient';
import { isMissing } from './serverFeatures';

// Live location sharing (migration 0098). Everything here is opt-in and time-boxed: a share has an
// end time, and the database only lets your partner read your row while that time is in the future.

export interface Position { lat: number; lng: number; accuracyM: number | null; updatedAt: string }

export const SHARE_OPTIONS = [
  { key: '1h', label: '1 hour', ms: 60 * 60_000 },
  { key: '8h', label: '8 hours', ms: 8 * 60 * 60_000 },
  { key: 'always', label: 'Until I stop', ms: 365 * 24 * 60 * 60_000 },
] as const;

/** Great-circle distance in metres. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(m: number): string {
  if (m < 50) return 'right next to you';
  if (m < 1000) return `${Math.round(m / 10) * 10} m away`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km away`;
}

export function formatAge(updatedAt: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(updatedAt).getTime()) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

/** Time left on a share, for the "Sharing for 52 min" label. Null when not sharing. */
export function shareRemaining(until: number | null, now = Date.now()): string | null {
  if (!until || until <= now) return null;
  const ms = until - now;
  if (ms > 30 * 24 * 60 * 60_000) return 'until you stop';
  const m = Math.ceil(ms / 60_000);
  if (m < 60) return `${m} min left`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min left` : `${h} h left`;
}

/** Whether a new fix is worth writing: moved at least 15 m, or the last write is over 30 s old. */
export function shouldPublish(prev: { lat: number; lng: number; at: number } | null, next: { lat: number; lng: number }, now: number): boolean {
  if (!prev) return true;
  if (now - prev.at >= 30_000) return true;
  return distanceMeters(prev, next) >= 15;
}

export const googleMapsLink = (to: { lat: number; lng: number }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${to.lat},${to.lng}`;

// ---------------------------------------------------------------- server
const toPosition = (r: { lat: number | null; lng: number | null; accuracy_m: number | null; updated_at: string }): Position | null =>
  r.lat == null || r.lng == null ? null : { lat: r.lat, lng: r.lng, accuracyM: r.accuracy_m, updatedAt: r.updated_at };

export async function publishPosition(myProfileId: string, lat: number, lng: number, accuracyM: number | null, until: number): Promise<boolean> {
  const { error } = await supabase.from('locations').upsert({
    profile_id: myProfileId, lat, lng, accuracy_m: accuracyM,
    sharing_until: new Date(until).toISOString(), updated_at: new Date().toISOString(),
  }, { onConflict: 'profile_id' });
  return !error;
}

/** Stops sharing: the coordinates are wiped, not just hidden. */
export async function clearPosition(myProfileId: string): Promise<boolean> {
  const { error } = await supabase.from('locations')
    .update({ lat: null, lng: null, accuracy_m: null, sharing_until: null, updated_at: new Date().toISOString() })
    .eq('profile_id', myProfileId);
  return !error;
}

/** Your partner's last position, or null when they are not sharing (the database hides it). */
export async function fetchPartnerPosition(partnerId: string): Promise<{ pos: Position | null; missing: boolean }> {
  const { data, error } = await supabase.from('locations').select('lat, lng, accuracy_m, updated_at').eq('profile_id', partnerId).maybeSingle();
  if (error) return { pos: null, missing: isMissing(error) };
  return { pos: data ? toPosition(data) : null, missing: false };
}

// ------------------------------------------------ my share state (this device)
const KEY = 'palvin:loc-share-until:v1';
type Listener = () => void;
const listeners = new Set<Listener>();
let until: number | null = (() => {
  try { const v = Number(localStorage.getItem(KEY)); return v > Date.now() ? v : null; } catch { return null; }
})();

export const getShareUntil = () => (until && until > Date.now() ? until : null);
export function setShareUntil(v: number | null) {
  until = v;
  try { if (v) localStorage.setItem(KEY, String(v)); else localStorage.removeItem(KEY); } catch { /* private mode */ }
  listeners.forEach(l => l());
}
export function subscribeShare(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }

// ----------------------------------------------------------------- places
export interface Place { id: string; name: string; emoji: string; lat: number; lng: number; radiusM: number }

export const PLACE_PRESETS = [
  { emoji: '🏠', name: 'Home' }, { emoji: '🏢', name: 'Work' }, { emoji: '🎓', name: 'School' },
  { emoji: '☕', name: 'Café' }, { emoji: '💖', name: 'Our spot' },
] as const;

/** The saved place a position is inside of (nearest when several overlap), or null. */
export function placeAt(places: Place[], pos: { lat: number; lng: number } | null): Place | null {
  if (!pos) return null;
  let best: Place | null = null, bestD = Infinity;
  for (const p of places) {
    const d = distanceMeters(p, pos);
    if (d <= p.radiusM && d < bestD) { best = p; bestD = d; }
  }
  return best;
}

export async function fetchPlaces(): Promise<{ places: Place[]; missing: boolean }> {
  const { data, error } = await supabase.from('saved_places').select('id, name, emoji, lat, lng, radius_m').order('created_at');
  if (error) return { places: [], missing: isMissing(error) };
  return { places: (data ?? []).map(r => ({ id: r.id, name: r.name, emoji: r.emoji, lat: r.lat, lng: r.lng, radiusM: r.radius_m })), missing: false };
}

export async function addPlace(name: string, emoji: string, lat: number, lng: number, radiusM = 150): Promise<boolean> {
  const { error } = await supabase.from('saved_places').insert({ name: name.trim().slice(0, 40), emoji, lat, lng, radius_m: radiusM });
  return !error;
}

export async function deletePlace(id: string): Promise<boolean> {
  const { error } = await supabase.from('saved_places').delete().eq('id', id);
  return !error;
}

// ----------------------------------------------- "remember places I stay" switch
const REMEMBER_KEY = 'palvin:loc-remember:v1';
let remember = (() => { try { return localStorage.getItem(REMEMBER_KEY) === '1'; } catch { return false; } })();
export const getRemember = () => remember;
export function setRemember(v: boolean) {
  remember = v;
  try { if (v) localStorage.setItem(REMEMBER_KEY, '1'); else localStorage.removeItem(REMEMBER_KEY); } catch { /* private mode */ }
  listeners.forEach(l => l());
}

// -------------------------------------------------------------------- visits
export interface Visit { id: string; lat: number; lng: number; label: string | null; placeId: string | null; arrivedAt: string; lastSeenAt: string }

export async function fetchVisits(limit = 20): Promise<{ visits: Visit[]; missing: boolean }> {
  const { data, error } = await supabase.from('visits').select('id, lat, lng, label, place_id, arrived_at, last_seen_at').order('arrived_at', { ascending: false }).limit(limit);
  if (error) return { visits: [], missing: isMissing(error) };
  return { visits: (data ?? []).map(r => ({ id: r.id, lat: r.lat, lng: r.lng, label: r.label, placeId: r.place_id, arrivedAt: r.arrived_at, lastSeenAt: r.last_seen_at })), missing: false };
}

export async function recordVisit(v: { lat: number; lng: number; label: string | null; placeId: string | null; arrivedAt: number }): Promise<string | null> {
  const { data, error } = await supabase.from('visits').insert({
    lat: v.lat, lng: v.lng, label: v.label, place_id: v.placeId,
    arrived_at: new Date(v.arrivedAt).toISOString(), last_seen_at: new Date().toISOString(),
  }).select('id').single();
  return error ? null : data.id;
}

export async function touchVisit(id: string): Promise<void> {
  await supabase.from('visits').update({ last_seen_at: new Date().toISOString() }).eq('id', id);
}

export async function deleteVisit(id: string): Promise<boolean> {
  const { error } = await supabase.from('visits').delete().eq('id', id);
  return !error;
}

/** How long a visit lasted, e.g. "1 h 20 min". */
export function formatStay(arrivedAt: string, lastSeenAt: string): string {
  const m = Math.max(0, Math.round((new Date(lastSeenAt).getTime() - new Date(arrivedAt).getTime()) / 60_000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** A short human name for a spot, from OpenStreetMap's free geocoder. Null when it cannot be found. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=vi,en&lat=${lat}&lon=${lng}`, { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const j = await res.json() as { name?: string; display_name?: string };
    const label = (j.name || (j.display_name ?? '').split(',').slice(0, 2).join(',')).trim();
    return label ? label.slice(0, 80) : null;
  } catch { return null; }
}

/** Tells your partner (in-app notification + push) that you arrived at / left a saved place. */
export async function announcePlace(myProfileId: string, myName: string, type: 'arrive' | 'leave', place: { name: string; emoji: string }): Promise<void> {
  await supabase.from('notifications').insert({
    emoji: place.emoji,
    message: `${myName} ${type === 'arrive' ? 'arrived at' : 'left'} ${place.name}`,
    actor_profile_id: myProfileId, target_screen: 'map', category: 'location',
  });
}

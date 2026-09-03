import type { AppState, User } from './types';
import type { AuthProfile } from './auth';

// Lets a warm reopen (home-screen icon relaunch after the OS killed the
// backgrounded tab) skip the loading screen entirely: render instantly with
// whatever was on screen last time, while the normal refresh*() effects
// quietly refetch and overwrite everything with fresh data in the
// background — same as they already do on a first-ever login, just seeded
// from a non-empty starting point instead of blank state.
const CACHE_KEY = 'palvin_boot_cache_v1';

export interface BootCache {
  userId: string;
  currentUser: User;
  myProfile: AuthProfile;
  partnerProfile: AuthProfile | null;
  isLinked: boolean;
  state: AppState;
  savedAt: number;
}

export function readBootCache(): BootCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BootCache;
    if (!parsed?.userId || !parsed.myProfile) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeBootCache(snapshot: Omit<BootCache, 'savedAt'>): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...snapshot, savedAt: Date.now() }));
  } catch {
    // Storage full/unavailable (private browsing, quota) — the app still
    // works fine, it just won't have a warm cache for the next reopen.
  }
}

export function clearBootCache(): void {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* no-op */ }
}

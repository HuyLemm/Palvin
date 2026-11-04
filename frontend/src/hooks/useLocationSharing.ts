import { useEffect, useRef, useSyncExternalStore } from 'react';
import {
  announcePlace, clearPosition, distanceMeters, fetchPlaces, fetchVisits, getRemember, getSendStatus, getShareUntil, publishPosition,
  recordVisit, reverseGeocode, setShareUntil, shouldPublish, subscribeShare, touchVisit, type Place,
} from '../lib/location';
import { initialPresence, stepDwell, stepPresence, type DwellState, type PresenceState } from '../lib/dwell';

export const useShareUntil = () => useSyncExternalStore(subscribeShare, getShareUntil, () => null);
export const useRemember = () => useSyncExternalStore(subscribeShare, getRemember, () => false);
export const useSendStatus = () => useSyncExternalStore(subscribeShare, getSendStatus, () => null);

/** Fired by the Map screen after places are added or removed so the tracker reloads them. */
export const PLACES_CHANGED = 'palvin:places-changed';
/** Fired by the tracker after it saves a new visit so the Map screen can refresh its list. */
export const VISITS_CHANGED = 'palvin:visits-changed';

const PRESENCE_KEY = 'palvin:presence:v1';
const loadPresence = (): PresenceState => {
  try {
    const s = JSON.parse(localStorage.getItem(PRESENCE_KEY) ?? 'null') as (PresenceState & { savedAt: number }) | null;
    if (s && Date.now() - s.savedAt < 6 * 3600_000) return { ...s, cand: null };
  } catch { /* ignore */ }
  return initialPresence();
};
const savePresence = (s: PresenceState) => {
  try { localStorage.setItem(PRESENCE_KEY, JSON.stringify({ ...s, savedAt: Date.now() })); } catch { /* ignore */ }
};

/**
 * One position watcher for everything location-related, at the App level so it keeps going while you
 * browse other screens:
 *  - while sharing: publishes your position, and tells your partner when you arrive at / leave a saved place;
 *  - while "Remember places" is on: notices when you stay about an hour somewhere and saves it as a visit.
 * A web app cannot read the location once the phone is locked or the app is closed, so none of this
 * advances then. When a share ends (timer or permission lost) the coordinates are wiped on the server.
 */
export function useLocationSharing(myProfileId: string | undefined, myName: string, enabled: boolean) {
  const until = useShareUntil();
  const remember = useRemember();
  const sharing = !!until;
  const places = useRef<Place[]>([]);

  useEffect(() => {
    if (!enabled || !myProfileId || !(sharing || remember) || !('geolocation' in navigator)) return;
    let lastPub: { lat: number; lng: number; at: number } | null = null;
    let lastFix: { lat: number; lng: number; t: number } | null = null;
    let dwell: DwellState | null = null;
    let presence = loadPresence();
    let visitId: string | null = null, visitTouched = 0, recording = false;
    const stopShare = (wipe: boolean) => { setShareUntil(null); if (wipe) void clearPosition(myProfileId); };

    const reloadPlaces = () => { void fetchPlaces().then(r => { places.current = r.places; }); };
    reloadPlaces();
    const placesTimer = window.setInterval(reloadPlaces, 5 * 60_000);
    window.addEventListener(PLACES_CHANGED, reloadPlaces);

    // Presence and dwell are re-evaluated on a timer too, because a phone that stands still sends no new fixes.
    const evaluate = (fix: { lat: number; lng: number; t: number }) => {
      if (getShareUntil() && places.current.length) {
        const r = stepPresence(presence, places.current, fix);
        presence = r.state; savePresence(presence);
        if (r.event) void announcePlace(myProfileId, myName, r.event.type, r.event.place);
      }
      if (!getRemember()) return;
      const d = stepDwell(dwell, fix);
      dwell = d.state;
      if (d.reached && !recording) {
        recording = true;
        const at = { lat: d.state.lat, lng: d.state.lng };
        void (async () => {
          const here = places.current.find(p => distanceMeters(p, at) <= p.radiusM) ?? null;
          const label = here ? here.name : await reverseGeocode(at.lat, at.lng);
          // Opening the app again at the same spot soon after is the same visit, not a new one.
          const recent = (await fetchVisits(5)).visits.find(v => distanceMeters(v, at) <= 80 && Date.now() - new Date(v.lastSeenAt).getTime() < 30 * 60_000);
          if (recent) { visitId = recent.id; void touchVisit(recent.id); }
          else visitId = await recordVisit({ ...at, label, placeId: here?.id ?? null, arrivedAt: d.state.since });
          visitTouched = Date.now(); recording = false;
          window.dispatchEvent(new Event(VISITS_CHANGED));
        })();
      } else if (!dwell.reported) {
        visitId = null;
      } else if (visitId && Date.now() - visitTouched > 2 * 60_000) {
        visitTouched = Date.now(); void touchVisit(visitId);
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      pos => {
        const now = Date.now();
        const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: now };
        lastFix = fix;
        const cur = getShareUntil();
        if (cur && shouldPublish(lastPub, fix, now)) {
          lastPub = { ...fix, at: now };
          void publishPosition(myProfileId, fix.lat, fix.lng, pos.coords.accuracy ?? null, cur);
        }
        evaluate(fix);
      },
      err => { if (err.code === err.PERMISSION_DENIED && getShareUntil()) stopShare(true); },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    );
    const tickTimer = window.setInterval(() => { if (lastFix) evaluate({ ...lastFix, t: Date.now() }); }, 30_000);
    const endTimer = until ? window.setTimeout(() => stopShare(true), Math.max(1000, until - Date.now())) : 0;

    return () => {
      navigator.geolocation.clearWatch(watchId);
      window.clearInterval(tickTimer); window.clearInterval(placesTimer); window.clearTimeout(endTimer);
      window.removeEventListener(PLACES_CHANGED, reloadPlaces);
    };
  }, [enabled, myProfileId, myName, sharing, remember, until]);
}

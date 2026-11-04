import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useApp } from '../context';
import { supabase } from '../lib/supabaseClient';
import {
  PLACE_PRESETS, SHARE_OPTIONS, addPlace, clearPosition, deletePlace, deleteVisit, distanceMeters, fetchPartnerPosition,
  fetchPlaces, fetchVisits, formatAge, formatDistance, formatStay, googleMapsLink, placeAt, setRemember, setShareUntil,
  shareRemaining, type Place, type Position, type Visit,
} from '../lib/location';
import { PLACES_CHANGED, VISITS_CHANGED, useRemember, useSendStatus, useShareUntil } from '../hooks/useLocationSharing';
import EmptyState from '../components/EmptyState';

// OpenFreeMap: free vector tiles, no API key. "Positron" is a clean, soft light style; at night the
// same style is inverted with a CSS filter on the map canvas only (markers stay untouched).
const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const DARK_FILTER = 'invert(0.9) hue-rotate(180deg) brightness(1.45) contrast(0.9) saturate(0.8)';

type LL = { lat: number; lng: number };
const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const el = (html: string, pointer = true) => {
  const d = document.createElement('div');
  d.innerHTML = html;
  const node = d.firstElementChild as HTMLElement;
  if (!pointer) node.style.pointerEvents = 'none';
  return node;
};

/** A round avatar (photo, or the initial when there is none) with a little pointer, like a chat head on the map. */
const avatarPin = (name: string, photo: string | undefined, ring: string) => {
  const url = photo ? encodeURI(photo).replace(/['"()]/g, c => `%${c.charCodeAt(0).toString(16)}`) : '';
  const face = url
    ? `background:#ddd url(${url}) center/cover`
    : `background:${ring};color:#fff;font:700 18px system-ui,sans-serif`;
  return el(`<div style="position:relative;width:48px;height:58px"><div style="width:48px;height:48px;border-radius:50%;border:3px solid ${ring};box-shadow:0 2px 8px rgba(0,0,0,.4);box-sizing:border-box;display:flex;align-items:center;justify-content:center;${face}">${url ? '' : esc(name[0]?.toUpperCase() ?? '?')}</div><div style="position:absolute;left:18px;top:44px;width:0;height:0;border:6px solid transparent;border-top:10px solid ${ring}"></div></div>`);
};
const placePin = (emoji: string) => el(`<div style="width:34px;height:34px;border-radius:50%;background:#fff;border:2px solid #A83F5F;box-shadow:0 1px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1">${esc(emoji)}</div>`, false);
const visitPin = () => el('<div style="width:30px;height:30px;border-radius:50%;background:#fff;border:2px solid #7A5CCB;box-shadow:0 1px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:15px;line-height:1;cursor:pointer">👣</div>');
const draftPin = () => el('<div style="width:34px;height:34px;border-radius:50%;background:rgba(168,63,95,.2);border:2px dashed #A83F5F"></div>', false);

/** A circle of `r` metres around a point, as a polygon ring for a map layer. */
function circleRing(c: LL, r: number, n = 48): [number, number][] {
  const out: [number, number][] = [];
  for (let k = 0; k <= n; k++) {
    const a = (k / n) * 2 * Math.PI;
    out.push([c.lng + (r * Math.cos(a)) / (111_320 * Math.cos(c.lat * Math.PI / 180)), c.lat + (r * Math.sin(a)) / 110_540]);
  }
  return out;
}

const btn = (primary: boolean): React.CSSProperties => ({
  minHeight: 44, padding: '0 16px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
  border: primary ? 'none' : '1px solid var(--border)',
  background: primary ? 'var(--btn-grad)' : 'var(--bg)', color: primary ? '#fff' : 'var(--ink)',
});
const card: React.CSSProperties = { marginTop: 12, padding: 14, borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)' };

export default function MapScreen() {
  const { screen, myProfile, partnerProfile, profilePhotos, toast } = useApp();
  const active = screen === 'map';
  const shareUntil = useShareUntil();
  const sharing = !!shareUntil;
  const remember = useRemember();
  const sendStatus = useSendStatus();

  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const meMarker = useRef<{ m: maplibregl.Marker; key: string } | null>(null);
  const themMarker = useRef<{ m: maplibregl.Marker; key: string } | null>(null);
  const placeMarkers = useRef<maplibregl.Marker[]>([]);
  const visitMarkers = useRef<maplibregl.Marker[]>([]);
  const draftMarker = useRef<maplibregl.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const fitted = useRef<'none' | 'one' | 'both'>('none');
  const addingRef = useRef(false);

  const [partner, setPartner] = useState<Position | null>(null);
  const [missing, setMissing] = useState(false);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [pName, setPName] = useState('');
  const [pEmoji, setPEmoji] = useState<string>(PLACE_PRESETS[0].emoji);
  const [, tick] = useState(0);

  const myName = myProfile?.displayName ?? 'Me';
  const partnerName = partnerProfile?.displayName ?? 'Your partner';
  const partnerId = partnerProfile?.id;
  const coupleId = myProfile?.coupleId;
  addingRef.current = adding;

  // Create the map the first time the screen is shown (it cannot measure itself while hidden).
  useEffect(() => {
    if (!active || mapRef.current || !elRef.current) return;
    const map = new maplibregl.Map({
      container: elRef.current, style: STYLE_URL, center: [106.7, 10.78], zoom: 12,
      attributionControl: { compact: true }, pitchWithRotate: false, dragRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.on('click', e => { if (addingRef.current) setDraft({ lat: e.lngLat.lat, lng: e.lngLat.lng }); });
    map.on('load', () => {
      elRef.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
      elRef.current?.querySelector('.maplibregl-ctrl-attrib')?.removeAttribute('open');
      map.addSource('place-radius', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({ id: 'place-radius-fill', type: 'fill', source: 'place-radius', paint: { 'fill-color': '#A83F5F', 'fill-opacity': 0.12 } });
      map.addLayer({ id: 'place-radius-line', type: 'line', source: 'place-radius', paint: { 'line-color': '#A83F5F', 'line-width': 1.5, 'line-opacity': 0.7 } });
      setMapReady(true);
    });
    mapRef.current = map;
  }, [active]);
  useEffect(() => { if (active) setTimeout(() => mapRef.current?.resize(), 60); }, [active]);
  useEffect(() => {
    const c = mapRef.current?.getCanvas();
    if (c) c.style.filter = myProfile?.darkMode ? DARK_FILTER : '';
  }, [myProfile?.darkMode, active, mapReady]);
  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  // Partner + places: initial load, realtime, and a slow poll (a stopped share is hidden by the
  // database, so no realtime event reaches us for it).
  const loadPartner = useCallback(async () => {
    if (!partnerId) return;
    const r = await fetchPartnerPosition(partnerId);
    setMissing(r.missing);
    setPartner(r.pos);
  }, [partnerId]);
  const loadPlaces = useCallback(async () => { setPlaces((await fetchPlaces()).places); }, []);
  const loadVisits = useCallback(async () => { setVisits((await fetchVisits()).visits); }, []);
  useEffect(() => {
    if (!active) return;
    void loadVisits();
    window.addEventListener(VISITS_CHANGED, loadVisits);
    return () => window.removeEventListener(VISITS_CHANGED, loadVisits);
  }, [active, loadVisits]);
  useEffect(() => {
    if (!active || !coupleId) return;
    void loadPartner(); void loadPlaces();
    const ch = supabase.channel(`locations-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations', filter: `couple_id=eq.${coupleId}` }, () => { void loadPartner(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_places', filter: `couple_id=eq.${coupleId}` }, () => { void loadPlaces(); })
      .subscribe();
    const poll = window.setInterval(() => { void loadPartner(); tick(n => n + 1); }, 30_000);
    return () => { void supabase.removeChannel(ch); window.clearInterval(poll); };
  }, [active, coupleId, loadPartner, loadPlaces]);

  // My own pin: while this screen is open. Opening the map is what asks for permission (the
  // permissions API is not reliable on iOS, so we simply ask).
  useEffect(() => {
    if (!active || !('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      p => { setGeoError(null); setMe({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      e => setGeoError(e.code === e.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active]);

  const myPhoto = profilePhotos[myName];
  const partnerPhoto = profilePhotos[partnerName];

  const fit = (a: LL, b: LL) => mapRef.current?.fitBounds(
    [[Math.min(a.lng, b.lng), Math.min(a.lat, b.lat)], [Math.max(a.lng, b.lng), Math.max(a.lat, b.lat)]],
    { padding: 70, maxZoom: 16, duration: 600 });
  const fly = (c: LL, zoom: number) => mapRef.current?.flyTo({ center: [c.lng, c.lat], zoom, duration: 600 });

  // Keep the two avatar pins in sync and frame both people once.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const sync = (ref: React.RefObject<{ m: maplibregl.Marker; key: string } | null>, p: LL | null, key: string, build: () => HTMLElement) => {
      if (!p) { ref.current?.m.remove(); ref.current = null; return; }
      if (ref.current && ref.current.key === key) { ref.current.m.setLngLat([p.lng, p.lat]); return; }
      ref.current?.m.remove();
      ref.current = { m: new maplibregl.Marker({ element: build(), anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(map), key };
    };
    sync(meMarker, me, `${myName}|${myPhoto}`, () => avatarPin(myName, myPhoto, '#A83F5F'));
    sync(themMarker, partner, `${partnerName}|${partnerPhoto}`, () => avatarPin(partnerName, partnerPhoto, '#7A5CCB'));
    // Frame whoever we know first, then re-frame once when both are known.
    if (me && partner && fitted.current !== 'both') { fit(me, partner); fitted.current = 'both'; }
    else if ((me || partner) && fitted.current === 'none') { fly((me ?? partner)!, 15); fitted.current = 'one'; }
  }, [me, partner, myName, partnerName, myPhoto, partnerPhoto, active, mapReady]);

  // Saved places as landmarks (with a soft circle showing the radius).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    placeMarkers.current.forEach(m => m.remove());
    placeMarkers.current = places.map(p => new maplibregl.Marker({ element: placePin(p.emoji), anchor: 'center' }).setLngLat([p.lng, p.lat]).addTo(map));
    (map.getSource('place-radius') as maplibregl.GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: places.map(p => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [circleRing(p, p.radiusM)] } })),
    });
  }, [places, mapReady]);

  // Spots you stopped at ("visited"), as small footprint pins; tap one for its name and date.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    visitMarkers.current.forEach(m => m.remove());
    visitMarkers.current = visits.filter(v => !v.placeId).map(v => {
      const when = new Date(v.arrivedAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
      const popup = new maplibregl.Popup({ offset: 18, closeButton: false, maxWidth: '220px' })
        .setHTML(`<strong style="color:#332A2D">${esc(v.label ?? 'Unnamed place')}</strong><br><span style="color:#6F5F65">Visited ${esc(when)} · ${esc(formatStay(v.arrivedAt, v.lastSeenAt))}</span>`);
      return new maplibregl.Marker({ element: visitPin(), anchor: 'center' }).setLngLat([v.lng, v.lat]).setPopup(popup).addTo(map);
    });
  }, [visits, mapReady]);

  // The spot being chosen for a new place.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!adding || !draft) { draftMarker.current?.remove(); draftMarker.current = null; return; }
    if (draftMarker.current) draftMarker.current.setLngLat([draft.lng, draft.lat]);
    else draftMarker.current = new maplibregl.Marker({ element: draftPin(), anchor: 'center' }).setLngLat([draft.lng, draft.lat]).addTo(map);
  }, [adding, draft]);

  const startShare = (ms: number) => {
    if (!('geolocation' in navigator)) { toast('This device cannot share its location', '📍'); return; }
    // Only a refusal stops us: a slow or missing first fix is fine, the watcher keeps trying.
    const begin = () => { setShareUntil(Date.now() + ms); toast(`Sharing with ${partnerName}`, '📍'); };
    navigator.geolocation.getCurrentPosition(
      begin,
      e => { if (e.code === e.PERMISSION_DENIED) toast('Location is blocked — allow it in your browser settings', '📍'); else begin(); },
      { maximumAge: 60_000, timeout: 10_000 },
    );
  };
  const stopShare = () => {
    setShareUntil(null);
    if (myProfile) void clearPosition(myProfile.id);
    toast('Stopped sharing', '📍');
  };
  const goToMe = () => {
    if (me) { fly(me, Math.max(mapRef.current?.getZoom() ?? 0, 16)); return; }
    toast(geoError === 'denied' ? 'Location is blocked — allow it in your browser or phone settings' : 'Finding your location…', '📍');
  };
  const recenter = () => { if (me && partner) fit(me, partner); else if (me ?? partner) fly((me ?? partner)!, 15); };

  const openAdd = () => { elRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); setAdding(true); setDraft(null); setPName(PLACE_PRESETS[0].name); setPEmoji(PLACE_PRESETS[0].emoji); };
  const closeAdd = () => { setAdding(false); setDraft(null); };
  const savePlace = async () => {
    if (!draft || !pName.trim()) return;
    const ok = await addPlace(pName, pEmoji, draft.lat, draft.lng);
    if (!ok) { toast('Could not save the place', '📍'); return; }
    toast(`Saved ${pName.trim()}`, pEmoji);
    closeAdd();
    void loadPlaces();
    window.dispatchEvent(new Event(PLACES_CHANGED));
  };
  const removePlace = async (p: Place) => {
    if (!window.confirm(`Remove "${p.name}"?`)) return;
    if (await deletePlace(p.id)) { setPlaces(list => list.filter(x => x.id !== p.id)); window.dispatchEvent(new Event(PLACES_CHANGED)); void loadVisits(); }
    else toast('Could not remove the place', '📍');
  };
  const saveVisitAsPlace = (v: Visit) => {
    elRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    setAdding(true); setDraft({ lat: v.lat, lng: v.lng }); setPName((v.label ?? 'New place').slice(0, 40)); setPEmoji('📍');
    fly(v, 17);
  };
  const removeVisit = async (v: Visit) => {
    if (await deleteVisit(v.id)) setVisits(list => list.filter(x => x.id !== v.id));
    else toast('Could not remove this visit', '📍');
  };

  const remaining = shareRemaining(shareUntil);
  const dist = me && partner ? distanceMeters(me, partner) : null;
  const partnerAt = placeAt(places, partner);
  const meAt = placeAt(places, me);

  if (missing) return <EmptyState icon="📍" title="Map isn't set up yet" sub="The location table has not been added to the database." />;

  return (
    <div style={{ paddingBottom: 24 }}>
      <div style={{ position: 'relative' }}>
        {/* Dragging inside the map moves the map only: no page scroll, no swipe-back (touch-action none). */}
        <div ref={elRef} role="application" aria-label="Map showing you, your partner and your saved places" data-own-touch
          style={{ touchAction: 'none', overscrollBehavior: 'contain', height: 'min(52dvh, 440px)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--pink-glow)', cursor: adding ? 'crosshair' : undefined }} />
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 500, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={goToMe} aria-label="Show my location"
            style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', color: me ? 'var(--sakura-deep)' : 'var(--ink-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7"/></svg>
          </button>
          <button onClick={recenter} aria-label="Show both of us" disabled={!me || !partner}
            style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--ink)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !me || !partner ? 0.5 : 1, boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/></svg>
          </button>
        </div>
        {adding && (
          <div role="status" style={{ position: 'absolute', left: 10, right: 64, top: 10, zIndex: 500, padding: '8px 12px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--ink)', fontSize: 14, fontWeight: 600 }}>
            {draft ? 'Drag the map and tap to move the spot' : 'Tap the map where the place is'}
          </div>
        )}
      </div>

      {/* Partner */}
      <section aria-label={`${partnerName}'s location`} style={{ ...card, marginTop: 14 }}>
        {partner ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                {partnerName}{partnerAt ? ` · ${partnerAt.emoji} at ${partnerAt.name}` : ''}
              </p>
              <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>
                {dist != null ? `${formatDistance(dist)} · ` : ''}updated {formatAge(partner.updatedAt)}
              </p>
            </div>
            <a href={googleMapsLink(partner)} target="_blank" rel="noopener noreferrer"
              style={{ ...btn(true), display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Directions</a>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{partnerName} isn't sharing</p>
            <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>Their pin appears here when they turn on sharing.</p>
          </div>
        )}
      </section>

      {/* Mine */}
      <section aria-label="Share my location" style={card}>
        {sharing ? (
          <>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Sharing with {partnerName}{meAt ? ` · ${meAt.emoji} at ${meAt.name}` : ''}</p>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: sendStatus && !sendStatus.ok ? 4 : 12 }}>
              {remaining}. {sendStatus?.ok ? `${partnerName} can see you · sent ${formatAge(new Date(sendStatus.at).toISOString())}.` : 'Keep Palvin open for your pin to keep moving.'}
            </p>
            {sendStatus && !sendStatus.ok && <p role="alert" style={{ fontSize: 14, color: 'var(--sakura-deep)', marginBottom: 12 }}>Could not send your location to {partnerName}. Check your connection.</p>}
            <button onClick={stopShare} style={{ ...btn(false), width: '100%' }}>Stop sharing</button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Share my location</p>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 12 }}>{partnerName} can't see where you are yet — the pin above is only visible to you. Choose how long to share; only {partnerName} can see it.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SHARE_OPTIONS.map((o, i) => (
                <button key={o.key} onClick={() => startShare(o.ms)} style={{ ...btn(i === 0), flex: '1 1 30%' }}>{o.label}</button>
              ))}
            </div>
          </>
        )}
        {geoError === 'denied' && <p role="alert" style={{ fontSize: 14, color: 'var(--sakura-deep)', marginTop: 10 }}>Location is blocked for Palvin. Allow it in your browser or phone settings.</p>}
      </section>

      {/* Places */}
      <section aria-label="Our places" style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: places.length || adding ? 10 : 0 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Our places</p>
            {!places.length && !adding && <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>Add Home, Work or anywhere that matters to you both.</p>}
          </div>
          {!adding && <button onClick={openAdd} style={btn(true)}>+ Add place</button>}
        </div>

        {adding && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: places.length ? 12 : 0 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PLACE_PRESETS.map(p => (
                <button key={p.name} onClick={() => { setPEmoji(p.emoji); setPName(p.name); }} aria-pressed={pEmoji === p.emoji && pName === p.name}
                  style={{ ...btn(false), minHeight: 44, padding: '0 12px', borderColor: pEmoji === p.emoji && pName === p.name ? 'var(--sakura-deep)' : 'var(--border)', borderWidth: pEmoji === p.emoji && pName === p.name ? 2 : 1 }}>
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>
            <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
              Name
              <input value={pName} onChange={e => setPName(e.target.value)} maxLength={40} placeholder="e.g. Our favourite café"
                style={{ display: 'block', width: '100%', marginTop: 4, minHeight: 44, padding: '0 12px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 16 }} />
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => { if (me) { setDraft(me); fly(me, 17); } else toast('Turn on location first, or tap the map', '📍'); }} style={{ ...btn(false), flex: '1 1 auto' }}>Use my spot</button>
              <button onClick={closeAdd} style={{ ...btn(false), flex: '1 1 auto' }}>Cancel</button>
              <button onClick={() => void savePlace()} disabled={!draft || !pName.trim()} style={{ ...btn(true), flex: '1 1 100%', opacity: !draft || !pName.trim() ? 0.5 : 1 }}>
                {draft ? 'Save place' : 'Tap the map to choose a spot'}
              </button>
            </div>
          </div>
        )}

        {places.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {places.map(p => {
              const d = me ? distanceMeters(me, p) : null;
              return (
                <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => fly(p, 16)} aria-label={`Show ${p.name} on the map`}
                    style={{ flex: 1, minWidth: 0, minHeight: 48, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', padding: 0 }}>
                    <span style={{ fontSize: 22 }} aria-hidden="true">{p.emoji}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      {d != null && <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-2)' }}>{formatDistance(d).replace(' away', ' from you')}</span>}
                    </span>
                  </button>
                  <button onClick={() => void removePlace(p)} aria-label={`Remove ${p.name}`}
                    style={{ width: 44, height: 44, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Visits */}
      <section aria-label="Places you have been" style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p id="remember-label" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Places you've been</p>
            <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>
              {remember ? 'Saving spots where you stop for a minute or more. Only you can see them.' : 'Turn on to remember spots where you stop for a minute or more. Only you can see them.'}
            </p>
          </div>
          <button role="switch" aria-checked={remember} aria-labelledby="remember-label" onClick={() => setRemember(!remember)}
            style={{ flexShrink: 0, width: 52, height: 44, border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ position: 'relative', width: 46, height: 28, borderRadius: 14, background: remember ? 'var(--sakura-accent)' : 'var(--border)', transition: 'background .15s' }}>
              <span style={{ position: 'absolute', top: 3, left: remember ? 21 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
            </span>
          </button>
        </div>
        {remember && <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 8 }}>Works while Palvin is open — it cannot see your location when the phone is locked.</p>}
        {visits.length > 0 && (
          <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {visits.map(v => {
              const saved = places.find(p => p.id === v.placeId);
              return (
                <li key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => fly(v, 16)} aria-label={`Show ${saved?.name ?? v.label ?? 'this place'} on the map`}
                    style={{ flex: 1, minWidth: 0, minHeight: 52, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', padding: 0 }}>
                    <span style={{ fontSize: 20 }} aria-hidden="true">{saved?.emoji ?? '📍'}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{saved?.name ?? v.label ?? 'Unnamed place'}</span>
                      <span style={{ display: 'block', fontSize: 13, color: 'var(--ink-2)' }}>
                        Visited {new Date(v.arrivedAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · {formatStay(v.arrivedAt, v.lastSeenAt)}
                      </span>
                    </span>
                  </button>
                  {!saved && <button onClick={() => saveVisitAsPlace(v)} style={{ ...btn(false), minHeight: 44, padding: '0 10px', fontSize: 13 }}>Save</button>}
                  <button onClick={() => void removeVisit(v)} aria-label={`Remove visit to ${saved?.name ?? v.label ?? 'this place'}`}
                    style={{ width: 44, height: 44, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 12, textAlign: 'center' }}>
        When your screen is locked or Palvin is closed, {partnerName} sees your last known spot.
      </p>
    </div>
  );
}

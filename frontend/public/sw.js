// PALVIN service worker — makes reopening the app (from the home-screen icon
// or after the OS kills the backgrounded tab) feel instant instead of a bare
// white screen while JS/CSS re-downloads. Strategy: stale-while-revalidate
// for same-origin GET requests — serve whatever's cached immediately, then
// fetch fresh in the background and update the cache for next time. Never
// touches cross-origin requests (Supabase REST/Realtime/Storage), so actual
// app data always comes straight from the network as before.
const CACHE_NAME = 'palvin-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

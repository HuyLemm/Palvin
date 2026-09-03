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

// Web Push — shows a real system notification even with Palvin fully closed
// (installed to the home screen). The send-push edge function posts a plain
// JSON payload ({ title, body, url }); the DB trigger that calls it only
// fires for a chat message from the *other* profile, so there's no "your
// own message notified you" case to filter out here.
self.addEventListener('push', (event) => {
  let data = { title: 'Palvin', body: '', url: '/' };
  try { data = { ...data, ...event.data.json() }; } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url },
      tag: 'palvin-chat',
      vibrate: [200, 100, 200], // Android only — iOS Safari ignores this
      // `silent` is deliberately left unset (defaults to false) so the
      // OS's normal notification sound plays, same as any other app.
    })
  );
});

// Focuses an already-open Palvin tab/window instead of always opening a new
// one, so tapping the notification doesn't leave duplicate tabs behind.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

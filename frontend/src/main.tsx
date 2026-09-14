import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AppProvider } from './context'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>,
)

// Caches the app shell (JS/CSS/HTML) so reopening from the home-screen icon
// after the OS kills the backgrounded tab repaints instantly from cache
// instead of waiting on a full re-download — see public/sw.js. Production
// builds only: registering this against the Vite dev server would cache
// dev-mode module responses too, serving a stale bundle on reload and
// masking whatever was just changed until the cache happens to refresh.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // True only if some earlier session already had a service worker
  // controlling this origin before this page load — i.e. NOT a first-ever
  // install. Captured before registering, so the very first activation
  // (nothing to "update" from) never fires the banner.
  const hadController = !!navigator.serviceWorker.controller;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      // The normal browser update check only runs on navigation — for an
      // installed PWA that's reopened and just sits in the foreground
      // without ever navigating, that could mean a long wait to notice a
      // fresh deploy. Re-checking whenever the tab becomes visible again
      // (reopening from the home screen counts) catches that case too.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
    }).catch(() => {});
  });

  // sw.js's install/activate handlers call skipWaiting()+clients.claim()
  // unconditionally, so a new version takes over as the controller in the
  // background on its own — this fires the moment that swap actually
  // happens. Only meaningful (worth telling the user about) if a
  // DIFFERENT service worker was already in control before; the very
  // first controllerchange ever for this origin is just that initial
  // activation, not an update.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) window.dispatchEvent(new CustomEvent('palvin:update-available'));
  });
}

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
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

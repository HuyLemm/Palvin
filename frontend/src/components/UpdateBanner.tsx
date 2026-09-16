import { useEffect, useState } from 'react';
import Icon from './Icon';

// Palvin's service worker (public/sw.js) calls skipWaiting()+clients.claim()
// unconditionally, so a freshly deployed version takes over as this page's
// controlling service worker automatically in the background — no user
// action needed for that part (see main.tsx's registration code, which
// fires the 'palvin:update-available' event this listens for). But a page
// that's already open keeps running the JS it already parsed; only a
// reload actually swaps it for the new bundle. This is a blocking modal
// rather than a dismissible banner on purpose — the new bundle only loads
// once the user taps the button, and there's no backdrop-click/✕ to skip
// past it, so a stale tab can't keep running silently out of date.
export default function UpdateBanner() {
  const [visible, setVisible] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener('palvin:update-available', handler);
    return () => window.removeEventListener('palvin:update-available', handler);
  }, []);

  if (!visible) return null;

  const handleUpdate = () => {
    setReloading(true);
    window.location.reload();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(51,42,45,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ background: 'var(--white)', borderRadius: 20, padding: '28px 24px 24px', width: '100%', maxWidth: 320, textAlign: 'center', animation: 'popIn 0.2s cubic-bezier(0.32,0.72,0,1) both' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--sakura-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <Icon emoji="✨" size={26} />
        </div>
        <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>A new version is ready</p>
        <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 20, lineHeight: 1.4 }}>Palvin has been updated. Tap below to load the latest version.</p>
        <button
          onClick={handleUpdate}
          disabled={reloading}
          style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: 'var(--sakura-accent)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: reloading ? 0.7 : 1 }}
        >{reloading ? 'Updating…' : 'Update now'}</button>
      </div>
    </div>
  );
}

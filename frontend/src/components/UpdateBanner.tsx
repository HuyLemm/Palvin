import { useEffect, useState } from 'react';
import Icon from './Icon';

// Palvin's service worker (public/sw.js) calls skipWaiting()+clients.claim()
// unconditionally, so a freshly deployed version takes over as this page's
// controlling service worker automatically in the background — no user
// action needed for that part (see main.tsx's registration code, which
// fires the 'palvin:update-available' event this listens for). But a page
// that's already open keeps running the JS it already parsed; only a
// reload actually swaps it for the new bundle, hence this banner.
export default function UpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener('palvin:update-available', handler);
    return () => window.removeEventListener('palvin:update-available', handler);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', left: 16, right: 16, bottom: 'calc(84px + env(safe-area-inset-bottom))',
      zIndex: 95, background: 'var(--ink)', color: 'white', borderRadius: 16, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      animation: 'slideUp 0.3s cubic-bezier(0.32,0.72,0,1)',
    }}>
      <Icon emoji="✨" size={18} style={{ flexShrink: 0 }} />
      <p style={{ flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.3, margin: 0 }}>A new version of Palvin is ready.</p>
      <button
        onClick={() => window.location.reload()}
        style={{ background: 'var(--sakura-accent)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}
      >Refresh</button>
    </div>
  );
}

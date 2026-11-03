import { useEffect, useState } from 'react';
import { pendingCount, subscribeQueue } from '../lib/offlineQueue';

// Slim notice while the device has no connection, so a failed save or a
// stale screen has an obvious explanation instead of silently misbehaving.
export default function OfflineBanner() {
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  const [waiting, setWaiting] = useState(() => pendingCount());
  useEffect(() => subscribeQueue(() => setWaiting(pendingCount())), []);

  useEffect(() => {
    const down = () => setOffline(true);
    const up = () => setOffline(false);
    window.addEventListener('offline', down);
    window.addEventListener('online', up);
    return () => { window.removeEventListener('offline', down); window.removeEventListener('online', up); };
  }, []);

  if (!offline && !waiting) return null;
  return (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 96, zIndex: 150,
      background: 'rgba(51,42,45,0.94)', color: '#fff', padding: '8px 16px', borderRadius: 99,
      fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(51,42,45,0.25)', maxWidth: 'calc(100vw - 48px)', whiteSpace: 'nowrap',
      animation: 'toastIn 0.3s cubic-bezier(0.32,0.72,0,1)',
    }}>
      {offline
        ? (waiting ? `Offline · ${waiting} waiting to sync` : "You're offline")
        : `Syncing ${waiting}…`}
    </div>
  );
}

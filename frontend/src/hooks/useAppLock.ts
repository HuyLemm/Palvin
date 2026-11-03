import { useCallback, useEffect, useState } from 'react';
import { getLockConfig } from '../lib/appLock';

// Decides when the lock screen is showing: on app start, and after the app has been
// in the background for longer than the user's chosen delay.
export function useAppLock(authed: boolean) {
  const [locked, setLocked] = useState(() => getLockConfig().enabled);

  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      const cfg = getLockConfig();
      if (!cfg.enabled) return;
      if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
      if (hiddenAt && (Date.now() - hiddenAt) / 1000 >= cfg.relockSeconds) setLocked(true);
      hiddenAt = 0;
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Settings can turn the lock on/off or lock right now.
  useEffect(() => {
    const onChange = () => { if (!getLockConfig().enabled) setLocked(false); };
    const onNow = () => { if (getLockConfig().enabled) setLocked(true); };
    window.addEventListener('palvin:lock-changed', onChange);
    window.addEventListener('palvin:lock-now', onNow);
    return () => { window.removeEventListener('palvin:lock-changed', onChange); window.removeEventListener('palvin:lock-now', onNow); };
  }, []);

  const unlock = useCallback(() => setLocked(false), []);
  // Only gate the app once someone is signed in; the login screen has nothing to protect.
  return { locked: locked && authed, unlock };
}

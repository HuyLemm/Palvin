import { useCallback, useState } from 'react';

// Remembers whether a Home block is folded away, per device. Storage can throw (private
// mode), so every access is guarded and the block simply starts open.
export function useCollapsed(key: string): [boolean, () => void] {
  const storageKey = `palvin:collapsed:${key}`;
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
  });
  const toggle = useCallback(() => {
    setCollapsed(c => {
      try { if (c) localStorage.removeItem(storageKey); else localStorage.setItem(storageKey, '1'); } catch { /* ignore */ }
      return !c;
    });
  }, [storageKey]);
  return [collapsed, toggle];
}

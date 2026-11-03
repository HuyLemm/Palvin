import { useCallback, useEffect, useState } from 'react';

// useState that survives an accidental close/refresh: the value is mirrored
// to localStorage under `key` and restored on the next mount. Call `clear()`
// once the form has been submitted successfully. Storage can throw (private
// mode, quota), so every access is guarded and the form works without it.
export function useDraft(key: string, initial = ''): [string, (v: string) => void, () => void] {
  const storageKey = `palvin:draft:${key}`;
  const [value, setValue] = useState(() => {
    try { return localStorage.getItem(storageKey) ?? initial; } catch { return initial; }
  });

  useEffect(() => {
    try {
      if (value) localStorage.setItem(storageKey, value);
      else localStorage.removeItem(storageKey);
    } catch { /* ignore */ }
  }, [storageKey, value]);

  const clear = useCallback(() => {
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
  }, [storageKey]);

  return [value, setValue, clear];
}

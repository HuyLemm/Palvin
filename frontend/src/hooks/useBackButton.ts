import { useEffect, useRef } from 'react';
import { registerBack } from '../navHistory';

// While `active`, the device Back button / swipe-back calls `onBack` (typically
// "close this sub-screen") instead of leaving the app. See navHistory.ts.
export function useBackButton(active: boolean, onBack: () => void) {
  const ref = useRef(onBack);
  ref.current = onBack;
  useEffect(() => {
    if (!active) return;
    return registerBack(() => ref.current());
  }, [active]);
}

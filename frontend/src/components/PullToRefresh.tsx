import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

const THRESHOLD = 64;
const MAX_PULL = 90;

// Wraps <main> in App.tsx — the one shared scroll container every top-level
// screen renders into — so a downward drag from the very top of any screen
// re-syncs everything (context.tsx's refreshAll) instead of needing bespoke
// pull-to-refresh wiring on each individual screen.
//
// Uses real (non-passive) touch listeners rather than React's onTouchMove,
// which Chrome/Safari treat as passive by default — a passive listener
// can't call preventDefault(), and without that, dragging past the top of
// `containerRef` triggers iOS's own rubber-band bounce fighting the custom
// indicator underneath it.
export default function PullToRefresh({ containerRef, onRefresh, children }: {
  containerRef: RefObject<HTMLElement | null>;
  onRefresh: () => Promise<void>;
  children: ReactNode;
}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !window.matchMedia('(max-width: 480px)').matches) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current || el.scrollTop > 0) { startYRef.current = null; return; }
      startYRef.current = e.touches[0].clientY;
      draggingRef.current = true;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current || startYRef.current == null) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) { draggingRef.current = false; startYRef.current = null; setPull(0); pullRef.current = 0; return; }
      e.preventDefault();
      const next = Math.min(MAX_PULL, delta * 0.5);
      setPull(next);
      pullRef.current = next;
    };
    const onTouchEnd = async () => {
      draggingRef.current = false;
      startYRef.current = null;
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true);
        refreshingRef.current = true;
        setPull(THRESHOLD);
        try { await onRefresh(); } finally {
          setRefreshing(false);
          refreshingRef.current = false;
          setPull(0);
          pullRef.current = 0;
        }
      } else {
        setPull(0);
        pullRef.current = 0;
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [containerRef, onRefresh]);

  const dragging = draggingRef.current;
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        position: 'absolute', top: -36, left: 0, right: 0, height: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: pull > 4 || refreshing ? 1 : 0,
        transform: `translateY(${pull}px)`,
        transition: dragging ? 'none' : 'opacity 0.2s ease, transform 0.25s ease',
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%', border: '2.5px solid var(--border)', borderTopColor: 'var(--sakura-accent)',
          animation: refreshing ? 'palvin-ptr-spin 0.7s linear infinite' : 'none',
          transform: refreshing ? undefined : `rotate(${Math.min(pull / THRESHOLD, 1) * 360}deg)`,
        }} />
      </div>
      <div style={{ transform: `translateY(${pull}px)`, transition: dragging ? 'none' : 'transform 0.25s ease' }}>
        {children}
      </div>
      <style>{`@keyframes palvin-ptr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

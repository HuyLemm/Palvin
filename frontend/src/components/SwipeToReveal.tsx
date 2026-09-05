import { useEffect, useRef, useState, type ReactNode } from 'react';

const REVEAL_WIDTH = 132;
const ACTIVATE_RATIO = 0.4;

// Wraps a list row so a left swipe reveals action buttons (Edit/Delete, ...)
// behind it instead of needing small icon buttons crowded into the row
// itself. Native (non-passive) touch listeners, not React's onTouchMove —
// same reason as PullToRefresh: once a drag is confirmed horizontal, it
// needs preventDefault() to stop the list's own vertical scroll from also
// reacting, and passive listeners (React's default) can't do that.
//
// Axis is locked on the first ~8px of movement so a normal vertical scroll
// that merely starts on top of a row never gets mistaken for a swipe.
export default function SwipeToReveal({ actions, children, borderRadius = 16 }: { actions: ReactNode; children: ReactNode; borderRadius?: number }) {
  const [dragX, setDragX] = useState(0);
  const [open, setOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  const dragXRef = useRef(0);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const axisRef = useRef<'x' | 'y' | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => { openRef.current = open; }, [open]);
  useEffect(() => { dragXRef.current = dragX; }, [dragX]);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      axisRef.current = null;
      draggingRef.current = true;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!draggingRef.current || !startRef.current) return;
      const dx = e.touches[0].clientX - startRef.current.x;
      const dy = e.touches[0].clientY - startRef.current.y;
      if (!axisRef.current) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axisRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (axisRef.current === 'y') return;
      e.preventDefault();
      const base = openRef.current ? -REVEAL_WIDTH : 0;
      setDragX(Math.max(-REVEAL_WIDTH, Math.min(0, base + dx)));
    };
    const onTouchEnd = () => {
      draggingRef.current = false;
      if (axisRef.current === 'x') {
        const shouldOpen = dragXRef.current <= -REVEAL_WIDTH * ACTIVATE_RATIO;
        setOpen(shouldOpen);
        setDragX(shouldOpen ? -REVEAL_WIDTH : 0);
      }
      axisRef.current = null;
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
  }, []);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: REVEAL_WIDTH, display: 'flex' }}>
        {actions}
      </div>
      <div
        ref={rowRef}
        onClickCapture={e => { if (open) { e.preventDefault(); e.stopPropagation(); setOpen(false); setDragX(0); } }}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: draggingRef.current ? 'none' : 'transform 0.2s ease',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  );
}

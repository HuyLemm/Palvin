import { useEffect } from 'react';
import { canGoBackInApp } from '../navHistory';

const EDGE = 28;        // px from the left edge where a swipe may start
const TRIGGER = 90;     // px of rightward travel that counts as "go back"
const FLING = 0.5;      // px/ms: a quick flick also counts

/**
 * Facebook-style swipe back: drag from the left edge to the right and the current screen follows
 * your finger; release past the threshold and the app steps back exactly like the device Back
 * button (closing a sub-screen, leaving a screen — see navHistory.ts). Does nothing on a root
 * screen. `getTarget` returns the element to slide. It moves the element with the independent CSS
 * `translate` property, so it never fights an inline `transform` that React manages.
 */
export function useSwipeBack(enabled: boolean, getTarget: () => HTMLElement | null) {
  useEffect(() => {
    if (!enabled) return;
    let startX = 0, startY = 0, startT = 0, dx = 0;
    let mode: 'idle' | 'maybe' | 'drag' = 'idle';
    let target: HTMLElement | null = null;
    let savedTransition = '';

    const dialogOpen = () => !!document.querySelector('.kb-modal-overlay, .bottom-sheet-overlay');

    const restore = (animate: boolean) => {
      if (!target) return;
      const el = target;
      el.style.transition = animate ? 'translate 0.2s ease' : savedTransition;
      el.style.translate = '';
      if (animate) setTimeout(() => { el.style.transition = savedTransition; }, 220);
      target = null;
    };

    const onStart = (e: TouchEvent) => {
      mode = 'idle';
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (t.clientX > EDGE || !canGoBackInApp() || dialogOpen()) return;
      if ((e.target as Element | null)?.closest?.('[data-own-touch]')) return; // e.g. dragging a map
      startX = t.clientX; startY = t.clientY; startT = e.timeStamp; dx = 0;
      mode = 'maybe';
    };

    const onMove = (e: TouchEvent) => {
      if (mode === 'idle') return;
      const t = e.touches[0];
      dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (mode === 'maybe') {
        if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { mode = 'idle'; return; } // a vertical scroll
        if (dx < 10) return;
        target = getTarget();
        if (!target) { mode = 'idle'; return; }
        savedTransition = target.style.transition;
        target.style.transition = 'none';
        mode = 'drag';
      }
      if (e.cancelable) e.preventDefault(); // keep the page from scrolling while dragging sideways
      const x = Math.max(0, dx);
      if (target) {
        target.style.translate = `${x}px 0`;
      }
    };

    const onEnd = (e: TouchEvent) => {
      if (mode !== 'drag') { mode = 'idle'; return; }
      mode = 'idle';
      const speed = dx / Math.max(1, e.timeStamp - startT);
      if (dx > TRIGGER || (dx > 40 && speed > FLING)) {
        // slide the rest of the way out, then step back
        if (target) {
          const el = target;
          el.style.transition = 'translate 0.16s ease-out';
          el.style.translate = `${window.innerWidth}px 0`;
          setTimeout(() => { history.back(); requestAnimationFrame(() => requestAnimationFrame(() => restore(false))); }, 140);
        }
      } else {
        restore(true);
      }
    };

    const onCancel = () => { if (mode === 'drag') restore(true); mode = 'idle'; };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onCancel, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onCancel);
      restore(false);
    };
  }, [enabled, getTarget]);
}

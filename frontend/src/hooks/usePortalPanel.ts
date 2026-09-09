import { useEffect, useRef, useState } from 'react';

// For any overlay that's createPortal'd straight to document.body instead
// of rendered inline (needed when a scrolling/overflow:hidden ancestor
// would otherwise clip it — a comment bar pinned above the keyboard, a
// dropdown escaping a scrollable modal, ...). A portal like that ignores
// the display:none an inactive kept-alive screen would normally hide it
// behind (see App.tsx's ScreenRouter — every visited screen stays mounted,
// just hidden), so without this it keeps floating on top of whatever
// screen you navigate to next.
//
// `closeKey` is whatever identifies "am I still the active thing" — pass
// the app's current `screen` for a panel that only makes sense on one
// specific screen, or `` `${screen}:${selectedId}` `` for one of several
// kept-alive instances of the same screen (e.g. PostDetail, one per post
// id). Any change to it force-closes the panel instantly, since that
// means whatever it lives under just got hidden (or swapped for a sibling
// instance) out from under it.
export function usePortalPanel(closeKey: unknown) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const show = () => { clearTimer(); setClosing(false); setOpen(true); };
  // durationMs: how long to play an exit animation before actually
  // unmounting (0 = disappear immediately, no animation).
  const hide = (durationMs = 0) => {
    clearTimer();
    if (durationMs <= 0) { setOpen(false); setClosing(false); return; }
    setClosing(true);
    timerRef.current = setTimeout(() => { setOpen(false); setClosing(false); timerRef.current = null; }, durationMs);
  };

  useEffect(() => {
    hide(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeKey]);
  useEffect(() => () => clearTimer(), []);

  return { open, closing, show, hide };
}

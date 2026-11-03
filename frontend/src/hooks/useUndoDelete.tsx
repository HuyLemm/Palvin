import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const UNDO_MS = 5000;

// "Delete, then offer Undo" for actions that have no confirmation step.
// The item is hidden immediately (isHidden) but the real delete only runs once
// the undo window closes — or at once if the screen unmounts, so nothing the
// user deleted is ever silently kept. Closing the app inside the window keeps
// the item (the safe direction). `bar` must be rendered by the caller.
export function useUndoDelete() {
  const [pending, setPending] = useState<{ id: string; label: string }[]>([]);
  const timers = useRef(new Map<string, { t: number; commit: () => void }>());

  const drop = useCallback((id: string) => setPending(p => p.filter(x => x.id !== id)), []);

  const finish = useCallback((id: string) => {
    const e = timers.current.get(id);
    if (!e) return;
    window.clearTimeout(e.t);
    timers.current.delete(id);
    drop(id);
    e.commit();
  }, [drop]);

  const run = useCallback((id: string, label: string, commit: () => void) => {
    setPending(p => [...p.filter(x => x.id !== id), { id, label }]);
    timers.current.get(id) && window.clearTimeout(timers.current.get(id)!.t);
    timers.current.set(id, { t: window.setTimeout(() => finish(id), UNDO_MS), commit });
  }, [finish]);

  const undo = useCallback((id: string) => {
    const e = timers.current.get(id);
    if (!e) return;
    window.clearTimeout(e.t);
    timers.current.delete(id);
    drop(id);
  }, [drop]);

  useEffect(() => () => {
    timers.current.forEach(e => { window.clearTimeout(e.t); e.commit(); });
    timers.current.clear();
  }, []);

  // "Already done, offer to take it back": the change was applied right away,
  // `restore` re-applies the opposite if the user taps Undo within the window.
  const [offered, setOffered] = useState<{ label: string; restore: () => void } | null>(null);
  const offerTimer = useRef<number | undefined>(undefined);
  const offer = useCallback((label: string, restore: () => void) => {
    window.clearTimeout(offerTimer.current);
    setOffered({ label, restore });
    offerTimer.current = window.setTimeout(() => setOffered(null), UNDO_MS);
  }, []);
  useEffect(() => () => window.clearTimeout(offerTimer.current), []);

  const last = pending[pending.length - 1];
  const shown = last ? { label: last.label, onUndo: () => undo(last.id) }
    : offered ? { label: offered.label, onUndo: () => { window.clearTimeout(offerTimer.current); offered.restore(); setOffered(null); } }
    : null;
  const bar = shown ? createPortal(
    <div role="status" aria-live="polite" style={{
      position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 96, zIndex: 150,
      display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px 4px 18px', borderRadius: 99,
      background: 'rgba(51,42,45,0.95)', color: '#fff', fontSize: 14, fontWeight: 600,
      boxShadow: '0 4px 20px rgba(51,42,45,0.3)', maxWidth: 'calc(100vw - 48px)',
      animation: 'toastIn 0.25s cubic-bezier(0.32,0.72,0,1)',
    }}>
      <span>{shown.label}</span>
      <button onClick={shown.onUndo} style={{
        background: 'none', border: 'none', color: '#F3A6B9', fontWeight: 800, fontSize: 14,
        cursor: 'pointer', padding: '10px 14px', minHeight: 44,
      }}>Undo</button>
    </div>,
    document.body,
  ) : null;

  return { run, offer, isHidden: (id: string) => pending.some(p => p.id === id), bar };
}

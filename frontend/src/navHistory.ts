// Connects the app's own navigation to the browser history, so the phone's Back
// button / swipe-back steps back inside the app (closing a dialog, leaving a
// sub-screen, returning to the previous screen) instead of leaving the app.
//
// Every in-app "level" the user can step out of pushes one history entry:
//  - a screen pushed on context.tsx's navigation stack  (kind "screen")
//  - a sub-screen that lives in a component's local state (kind "handler")
// When the user closes something with the app's own UI, its entry is not
// removed (only the top one could be) but marked "dead"; a later Back press
// skips dead entries silently. Dialogs don't get entries: Back just closes the
// topmost open dialog and puts the history entry back.

type Entry = { kind: 'screen' } | { kind: 'handler'; fn: () => void } | { kind: 'dead' };

const entries: Entry[] = [];
let popScreen: (() => void) | null = null;
let prevStackLen = 1;
let consumedScreens = 0; // screens already removed by a Back press (don't mark them dead again)
let started = false;

function push() {
  try { history.pushState({ palvin: entries.length }, ''); } catch { /* sandboxed */ }
}

function topDialog(): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>('.kb-modal-overlay, .bottom-sheet-overlay');
  return all.length ? all[all.length - 1] : null;
}

function onPopState() {
  const e = entries.pop();
  if (!e) return; // back from the very first entry: let the browser leave the app
  if (e.kind === 'dead') { history.back(); return; }

  const dlg = topDialog();
  if (dlg) {
    entries.push(e); push(); // the dialog consumes this Back press, nothing else changes
    if (dlg.classList.contains('bottom-sheet-overlay')) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    } else {
      dlg.click();
    }
    return;
  }
  if (e.kind === 'handler') { e.fn(); return; }
  consumedScreens++;
  popScreen?.();
}

/** Call once; `pop` removes the top screen from the app's navigation stack. */
export function startNavHistory(pop: () => void) {
  popScreen = pop;
  if (started) return;
  started = true;
  try { history.replaceState({ palvin: -1 }, ''); } catch { /* ignore */ }
  window.addEventListener('popstate', onPopState);
}

/** Keep history in step with the navigation stack's length. */
export function syncScreenDepth(len: number) {
  if (len > prevStackLen) {
    for (let i = prevStackLen; i < len; i++) { entries.push({ kind: 'screen' }); push(); }
  } else if (len < prevStackLen) {
    let n = prevStackLen - len;
    const fromBack = Math.min(n, consumedScreens);
    consumedScreens -= fromBack; n -= fromBack;
    for (let i = entries.length - 1; i >= 0 && n > 0; i--) {
      if (entries[i].kind === 'screen') { entries[i] = { kind: 'dead' }; n--; }
    }
  }
  prevStackLen = len;
}

/** A sub-screen/overlay that lives in local state: Back should call `fn`. Returns an unregister function. */
export function registerBack(fn: () => void): () => void {
  const entry: Entry = { kind: 'handler', fn };
  entries.push(entry); push();
  return () => {
    const i = entries.indexOf(entry);
    if (i >= 0) entries[i] = { kind: 'dead' };
  };
}

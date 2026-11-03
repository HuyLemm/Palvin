import { beforeEach, describe, expect, it, vi } from 'vitest';

const settle = () => new Promise(r => setTimeout(r, 30));

// navHistory keeps module-level state, so each test gets a fresh copy.
async function fresh() {
  vi.resetModules();
  document.body.innerHTML = '';
  return import('./navHistory');
}

describe('navHistory (device Back button)', () => {
  beforeEach(() => { history.replaceState(null, ''); });

  it('Back pops the app navigation stack instead of leaving', async () => {
    const nav = await fresh();
    const pop = vi.fn();
    nav.startNavHistory(pop);
    nav.syncScreenDepth(2);           // user navigated one screen deeper
    history.back(); await settle();
    expect(pop).toHaveBeenCalledTimes(1);
  });

  it('Back closes a local sub-screen via its registered handler', async () => {
    const nav = await fresh();
    const pop = vi.fn(); const close = vi.fn();
    nav.startNavHistory(pop);
    nav.registerBack(close);
    history.back(); await settle();
    expect(close).toHaveBeenCalledTimes(1);
    expect(pop).not.toHaveBeenCalled();
  });

  it('skips entries whose screen the user already closed with the app UI', async () => {
    const nav = await fresh();
    const pop = vi.fn();
    nav.startNavHistory(pop);
    nav.syncScreenDepth(2);
    nav.syncScreenDepth(3);
    nav.syncScreenDepth(2);           // closed one with the in-app Back button -> its entry is now dead
    history.back(); await settle();   // hits the dead entry, then continues to the live one
    expect(pop).toHaveBeenCalledTimes(1);
  });

  it('closes an open dialog first and leaves the screen stack alone', async () => {
    const nav = await fresh();
    const pop = vi.fn();
    nav.startNavHistory(pop);
    nav.syncScreenDepth(2);
    const overlay = document.createElement('div');
    overlay.className = 'kb-modal-overlay';
    const onClick = vi.fn();
    overlay.addEventListener('click', onClick);
    document.body.appendChild(overlay);
    history.back(); await settle();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(pop).not.toHaveBeenCalled();
    overlay.remove();
    history.back(); await settle();   // second Back now really goes back a screen
    expect(pop).toHaveBeenCalledTimes(1);
  });
});

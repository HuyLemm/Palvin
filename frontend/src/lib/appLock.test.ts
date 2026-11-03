import { beforeEach, describe, expect, it } from 'vitest';
import { checkPin, clearFailures, clearLock, getLockConfig, isValidPin, lockoutRemainingMs, recordFailure, saveLockConfig, setPin } from './appLock';

describe('app lock', () => {
  beforeEach(() => { localStorage.clear(); });

  it('accepts only 4–6 digit PINs', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
    for (const bad of ['123', '1234567', 'abcd', '12 34', '']) expect(isValidPin(bad)).toBe(false);
  });

  it('stores a salted hash, never the PIN, and verifies it', async () => {
    const stored = await setPin('4821');
    expect(JSON.stringify(stored)).not.toContain('4821');
    expect(stored!.length).toBe(4);
    expect(await checkPin('4821', stored!)).toBe(true);
    expect(await checkPin('4822', stored!)).toBe(false);
    const again = await setPin('4821');
    expect(again!.hash).not.toBe(stored!.hash); // fresh salt each time
  });

  it('rejects a bad PIN at setup', async () => { await expect(setPin('12')).rejects.toThrow(/4 to 6/); });

  it('persists and clears its configuration', () => {
    expect(getLockConfig().enabled).toBe(false);
    saveLockConfig({ enabled: true, relockSeconds: 300 });
    expect(getLockConfig()).toMatchObject({ enabled: true, relockSeconds: 300 });
    clearLock();
    expect(getLockConfig().enabled).toBe(false);
  });

  it('pauses after 5 wrong PINs, for longer each round, and resets on success', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) recordFailure(t0);
    expect(lockoutRemainingMs(t0)).toBe(0);
    recordFailure(t0);                       // 5th miss
    expect(lockoutRemainingMs(t0)).toBe(30_000);
    for (let i = 0; i < 5; i++) recordFailure(t0 + 40_000);
    expect(lockoutRemainingMs(t0 + 40_000)).toBe(60_000); // second round doubles
    clearFailures();
    expect(lockoutRemainingMs(t0)).toBe(0);
  });
});

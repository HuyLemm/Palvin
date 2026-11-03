import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { checkPin, clearFailures, getLockConfig, lockoutRemainingMs, recordFailure, unlockWithBiometrics } from '../lib/appLock';

// Full-screen gate shown over the app while it is locked.
export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const cfg = getLockConfig();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [waitMs, setWaitMs] = useState(() => lockoutRemainingMs());
  const [busy, setBusy] = useState(false);
  const triedBio = useRef(false);
  const len = cfg.pin?.length ?? 4;

  const tryBiometrics = useCallback(async () => {
    if (!cfg.credId) return;
    setBusy(true);
    const ok = await unlockWithBiometrics(cfg.credId);
    setBusy(false);
    if (ok) { clearFailures(); onUnlock(); } else setError(cfg.pin ? 'Biometrics did not match. Use your PIN.' : 'Biometrics did not match. Try again.');
  }, [cfg.credId, cfg.pin, onUnlock]);

  // Offer biometrics straight away when the lock screen appears.
  useEffect(() => {
    if (cfg.credId && !triedBio.current) { triedBio.current = true; void tryBiometrics(); }
  }, [cfg.credId, tryBiometrics]);

  // Count down a wrong-PIN pause.
  useEffect(() => {
    if (waitMs <= 0) return;
    const t = setInterval(() => setWaitMs(lockoutRemainingMs()), 500);
    return () => clearInterval(t);
  }, [waitMs]);

  const submit = useCallback(async (value: string) => {
    if (!cfg.pin || lockoutRemainingMs() > 0) return;
    setBusy(true);
    const ok = await checkPin(value, cfg.pin);
    setBusy(false);
    if (ok) { clearFailures(); onUnlock(); return; }
    recordFailure();
    setWaitMs(lockoutRemainingMs());
    setPin('');
    setError(lockoutRemainingMs() > 0 ? 'Too many attempts.' : 'Wrong PIN.');
  }, [cfg.pin, onUnlock]);

  const press = (d: string) => {
    if (busy || waitMs > 0) return;
    setError('');
    const next = (pin + d).slice(0, len);
    setPin(next);
    if (next.length === len) void submit(next);
  };

  const key = (label: string, onClick: () => void, aria?: string) => (
    <button key={label} onClick={onClick} aria-label={aria ?? label} disabled={busy || waitMs > 0}
      style={{ height: 64, borderRadius: 18, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--ink)', fontSize: 24, fontWeight: 600, cursor: 'pointer', font: 'inherit' }}>
      {label}
    </button>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="PALVIN is locked" style={{
      position: 'absolute', inset: 0, zIndex: 900, background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px 28px', gap: 18,
    }}>
      <Icon emoji="🔒" size={30} style={{ color: 'var(--sakura-deep)' }} />
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: 'var(--ink)', margin: 0 }}>PALVIN</h1>
      <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: 0 }}>{cfg.pin ? 'Enter your PIN' : 'Unlock to continue'}</p>

      {cfg.pin && (
        <>
          <div aria-hidden="true" style={{ display: 'flex', gap: 14, margin: '4px 0' }}>
            {Array.from({ length: len }).map((_, i) => (
              <span key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < pin.length ? 'var(--fill-strong)' : 'transparent', border: '2px solid var(--sakura-deep)' }} />
            ))}
          </div>
          <div role="status" aria-live="polite" style={{ minHeight: 20, fontSize: 13, color: 'var(--sakura-deep)', fontWeight: 600 }}>
            {waitMs > 0 ? `${error ? error + ' ' : ''}Try again in ${Math.ceil(waitMs / 1000)}s.` : error}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 72px)', gap: 12 }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => key(d, () => press(d)))}
            {cfg.credId ? key('Face', () => void tryBiometrics(), 'Unlock with Face ID or fingerprint') : <span />}
            {key('0', () => press('0'))}
            {key('⌫', () => { setError(''); setPin(p => p.slice(0, -1)); }, 'Delete')}
          </div>
        </>
      )}

      {!cfg.pin && cfg.credId && (
        <>
          <div role="status" aria-live="polite" style={{ minHeight: 20, fontSize: 13, color: 'var(--sakura-deep)', fontWeight: 600 }}>{error}</div>
          <button className="btn-primary" onClick={() => void tryBiometrics()} disabled={busy} style={{ padding: '14px 28px' }}>Unlock with Face ID / fingerprint</button>
        </>
      )}
    </div>
  );
}

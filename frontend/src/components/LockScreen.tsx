import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { checkPin, clearFailures, getLockConfig, lockoutRemainingMs, recordFailure, unlockWithBiometricsResult } from '../lib/appLock';

// Full-screen gate shown over the app while it is locked.
export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const cfg = getLockConfig();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [waitMs, setWaitMs] = useState(() => lockoutRemainingMs());
  const [busy, setBusy] = useState(false);
  const triedBio = useRef(false);
  const len = cfg.pin?.length ?? 4;

  // `auto` = started by the app (not a tap). Some browsers, iPhone especially, refuse a scan that
  // was not started by a tap; that is not a failure, so stay quiet and let one tap start it.
  const scanning = useRef(false);
  const tryBiometrics = useCallback(async (auto = false) => {
    if (!cfg.credId || scanning.current) return;
    scanning.current = true;
    setBusy(true);
    const r = await unlockWithBiometricsResult(cfg.credId);
    scanning.current = false;
    setBusy(false);
    if (r === 'ok') { clearFailures(); onUnlock(); return; }
    if (auto && r === 'declined') return;
    setError(r === 'declined' ? 'Scan cancelled. Tap Face ID to try again.' : cfg.pin ? 'Biometrics did not match. Use your PIN.' : 'Biometrics did not match. Try again.');
  }, [cfg.credId, cfg.pin, onUnlock]);

  // Offer biometrics straight away when the lock screen appears, and again each time the app
  // comes back to the front while it is still locked.
  useEffect(() => {
    if (!cfg.credId) return;
    if (!triedBio.current) { triedBio.current = true; void tryBiometrics(true); }
    const onVis = () => { if (document.visibilityState === 'visible') void tryBiometrics(true); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
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
      style={{ font: 'inherit', height: 'min(76px, 10dvh)', borderRadius: 22, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--ink)', fontSize: 30, fontWeight: 600, cursor: 'pointer' }}>
      {label}
    </button>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="PALVIN is locked" style={{
      position: 'absolute', inset: 0, zIndex: 900, background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px 28px', gap: 'min(18px, 2dvh)', overflowY: 'auto',
    }}>
      <Icon emoji="🔒" size={30} style={{ color: 'var(--sakura-deep)' }} />
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: 'var(--ink)', margin: 0 }}>PALVIN</h1>
      <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: 0 }}>{cfg.pin ? 'Enter your PIN' : 'Unlock to continue'}</p>

      {cfg.pin && cfg.credId && (
        <button className="btn-primary" onClick={() => void tryBiometrics()} disabled={busy || waitMs > 0} style={{ padding: '12px 24px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Icon emoji="🔒" size={16} /> Unlock with Face ID / fingerprint
        </button>
      )}
      {cfg.pin && (
        <>
          <div aria-hidden="true" style={{ display: 'flex', gap: 18, margin: '6px 0' }}>
            {Array.from({ length: len }).map((_, i) => (
              <span key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: i < pin.length ? 'var(--fill-strong)' : 'transparent', border: '2px solid var(--sakura-deep)' }} />
            ))}
          </div>
          <div role="status" aria-live="polite" style={{ minHeight: 20, fontSize: 14, color: 'var(--sakura-deep)', fontWeight: 600 }}>
            {waitMs > 0 ? `${error ? error + ' ' : ''}Try again in ${Math.ceil(waitMs / 1000)}s.` : error}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, width: '100%', maxWidth: 330 }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => key(d, () => press(d)))}
            <span />
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

import { useEffect, useState } from 'react';
import Icon from './Icon';
import { biometricsAvailable, checkPin, clearLock, enrollBiometrics, getLockConfig, isValidPin, saveLockConfig, setPin, type LockConfig } from '../lib/appLock';

const notify = (name: 'palvin:lock-changed' | 'palvin:lock-now') => window.dispatchEvent(new Event(name));

const RELOCK: { label: string; seconds: number }[] = [
  { label: 'Immediately', seconds: 0 }, { label: 'After 1 minute', seconds: 60 }, { label: 'After 5 minutes', seconds: 300 },
];

const row: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' };

// Settings > App lock: turn it on with a PIN (+ optional Face ID / fingerprint), change it, or turn it off.
export default function AppLockSettings({ userName, toast }: { userName: string; toast: (m: string, e?: string) => void }) {
  const [cfg, setCfg] = useState<LockConfig>(getLockConfig);
  const [bio, setBio] = useState(false);
  const [step, setStep] = useState<null | 'new' | 'confirm' | 'verify-off' | 'verify-change'>(null);
  const [first, setFirst] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { void biometricsAvailable().then(setBio); }, []);

  const update = (next: LockConfig) => { saveLockConfig(next); setCfg(next); notify('palvin:lock-changed'); };
  const reset = () => { setStep(null); setFirst(''); setInput(''); setError(''); };

  const submit = async () => {
    setError('');
    if (!isValidPin(input)) { setError('Use 4 to 6 digits.'); return; }
    setBusy(true);
    try {
      if (step === 'new') { setFirst(input); setInput(''); setStep('confirm'); }
      else if (step === 'confirm') {
        if (input !== first) { setError('The PINs do not match.'); setInput(''); return; }
        update({ ...getLockConfig(), enabled: true, pin: await setPin(input) });
        toast('App lock is on', '🔒'); reset();
      } else if (step === 'verify-off' || step === 'verify-change') {
        if (!cfg.pin || !(await checkPin(input, cfg.pin))) { setError('Wrong PIN.'); setInput(''); return; }
        if (step === 'verify-off') { clearLock(); setCfg(getLockConfig()); notify('palvin:lock-changed'); toast('App lock is off', '🔓'); reset(); }
        else { setInput(''); setStep('new'); }
      }
    } finally { setBusy(false); }
  };

  const toggleBio = async () => {
    setError('');
    if (cfg.credId) { update({ ...cfg, credId: undefined }); return; }
    try { update({ ...cfg, credId: await enrollBiometrics(userName) }); toast('Face ID / fingerprint added', '🔒'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not set up biometrics', '⚠️'); }
  };

  const prompt = step === 'new' ? 'Choose a PIN (4–6 digits)' : step === 'confirm' ? 'Enter it again' : 'Enter your current PIN';

  return (
    <div>
      <div className="settings-row" style={row}>
        <Icon emoji="🔒" size={20} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>Lock PALVIN</span>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)', marginTop: 2 }}>Ask for a PIN{bio ? ' or Face ID / fingerprint' : ''} when the app opens.</span>
        </span>
        <button role="switch" aria-checked={cfg.enabled} aria-label="Lock PALVIN" onClick={() => (cfg.enabled ? setStep('verify-off') : setStep('new'))}
          style={{ width: 48, height: 27, borderRadius: 99, border: 'none', background: cfg.enabled ? 'var(--sakura-accent)' : 'var(--border)', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
          <span style={{ position: 'absolute', top: 3, left: cfg.enabled ? 24 : 3, width: 21, height: 21, borderRadius: '50%', background: '#FFFFFF', transition: 'left 0.2s' }} />
        </button>
      </div>

      {step && (
        <div role="group" aria-label="PIN" style={{ padding: '12px 16px', background: 'var(--pink-glow)', borderBottom: '1px solid var(--border)' }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--ink)', marginBottom: 8 }}>{prompt}
            <input className="input-field" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={input}
              onChange={e => { setInput(e.target.value.replace(/\D/g, '')); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') void submit(); }} style={{ marginTop: 6, letterSpacing: 6 }} />
          </label>
          {error && <p role="alert" style={{ color: 'var(--sakura-deep)', fontSize: 12, margin: '0 0 8px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={reset} style={{ flex: 1, padding: '10px' }}>Cancel</button>
            <button className="btn-primary" onClick={() => void submit()} disabled={busy} style={{ flex: 2, padding: '10px' }}>{step === 'new' ? 'Next' : 'Confirm'}</button>
          </div>
        </div>
      )}

      {cfg.enabled && !step && (
        <>
          <div className="settings-row" style={row}>
            <Icon emoji="⏳" size={20} style={{ flexShrink: 0 }} />
            <label style={{ flex: 1, fontSize: 14, color: 'var(--ink)' }} htmlFor="relock">Lock the app</label>
            <select id="relock" className="input-field" value={cfg.relockSeconds} onChange={e => update({ ...cfg, relockSeconds: Number(e.target.value) })} style={{ width: 'auto' }}>
              {RELOCK.map(r => <option key={r.seconds} value={r.seconds}>{r.label}</option>)}
            </select>
          </div>
          {bio && (
            <div className="settings-row" style={row}>
              <Icon emoji="🔒" size={20} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)' }}>Face ID / fingerprint</span>
              <button className="btn-ghost" onClick={() => void toggleBio()} style={{ padding: '6px 12px' }}>{cfg.credId ? 'Turn off' : 'Turn on'}</button>
            </div>
          )}
          <div className="settings-row" style={{ ...row, gap: 8 }}>
            <button className="btn-ghost" onClick={() => setStep('verify-change')} style={{ flex: 1, padding: '10px' }}>Change PIN</button>
            <button className="btn-ghost" onClick={() => notify('palvin:lock-now')} style={{ flex: 1, padding: '10px' }}>Lock now</button>
          </div>
        </>
      )}
    </div>
  );
}

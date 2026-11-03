import { useState } from 'react';
import { useApp } from '../context';
import { requestRecap, type RecapInput } from '../lib/serverFeatures';

const HIDE_KEY = 'palvin:recap-unavailable';
const hiddenRecently = () => { try { return Date.now() - Number(localStorage.getItem(HIDE_KEY) || 0) < 86_400_000; } catch { return false; } };

// Optional AI recap of a month's spending (Money > Stats). Only totals per category leave the
// phone — never titles, notes or names — and only after the user accepts the notice.
export default function RecapCard({ input }: { input: RecapInput }) {
  const { toast } = useApp();
  const [step, setStep] = useState<'idle' | 'notice' | 'loading' | 'done'>('idle');
  const [text, setText] = useState('');
  const [hidden, setHidden] = useState(hiddenRecently);

  if (hidden || (input.expense === 0 && input.income === 0)) return null;

  const run = async () => {
    setStep('loading');
    const r = await requestRecap(input);
    if (r.text) { setText(r.text); setStep('done'); return; }
    setStep('idle');
    if (r.unavailable) { try { localStorage.setItem(HIDE_KEY, String(Date.now())); } catch { /* ignore */ } setHidden(true); toast("Recap isn't set up yet", 'ℹ️'); }
    else toast('Could not write the recap — try again later', '⚠️');
  };

  return (
    <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Month recap</p>

      {step === 'idle' && (
        <button className="btn-ghost" onClick={() => setStep('notice')} style={{ width: '100%', padding: '10px' }}>Write my recap</button>
      )}

      {step === 'notice' && (
        <div role="group" aria-label="Before we write your recap">
          <p style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 6 }}>
            To write this, PALVIN sends <strong>only this month&apos;s totals</strong> (income, spending and the amount per category) to Claude, an AI service run by Anthropic.
          </p>
          <p style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 10 }}>Titles, notes, names and photos are never included.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={() => setStep('idle')} style={{ flex: 1, padding: '10px' }}>Not now</button>
            <button className="btn-primary" onClick={() => void run()} style={{ flex: 2, padding: '10px' }}>Send totals and write</button>
          </div>
        </div>
      )}

      {step === 'loading' && <p role="status" style={{ fontSize: 13, color: 'var(--ink-2)' }}>Writing your recap…</p>}

      {step === 'done' && (
        <div>
          <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 10 }}>{text}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={() => { void navigator.clipboard?.writeText(text); toast('Copied', '📋'); }} style={{ flex: 1, padding: '8px' }}>Copy</button>
            <button className="btn-ghost" onClick={() => setStep('idle')} style={{ flex: 1, padding: '8px' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

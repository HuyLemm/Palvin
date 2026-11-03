import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context';
import { fetchDaily, submitDailyAnswer, type DailyState } from '../lib/serverFeatures';

const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// "Question of the day": answer first, then see your partner's answer (enforced by the database).
// Renders nothing until the daily-question migration is applied.
export default function DailyQuestionCard() {
  const { myProfile, partnerProfile, toast } = useApp();
  const [daily, setDaily] = useState<DailyState | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const partner = partnerProfile?.displayName ?? 'your partner';
  const date = localDate();

  const load = useCallback(async () => {
    if (!myProfile?.id) return;
    setDaily(await fetchDaily(date, myProfile.id));
  }, [date, myProfile?.id]);

  useEffect(() => {
    void load();
    const onVis = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVis);
    const t = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 60_000);
    return () => { document.removeEventListener('visibilitychange', onVis); clearInterval(t); };
  }, [load]);

  if (!daily || daily.missing || !daily.question) return null;

  const send = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    const ok = await submitDailyAnswer(daily.question!.id, date, draft);
    setBusy(false);
    if (!ok) { toast('Could not save your answer', '⚠️'); return; }
    setDraft('');
    toast('Answer saved', '💬');
    void load();
  };

  return (
    <div className="card" style={{ padding: '16px 18px', marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 8 }}>Question of the day</p>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--ink)', lineHeight: 1.4, marginBottom: 12 }}>{daily.question.body}</p>

      {daily.mine === null ? (
        <div>
          <textarea className="input-field" aria-label="Your answer" rows={2} maxLength={1000} placeholder="Your answer…" value={draft} onChange={e => setDraft(e.target.value)} style={{ marginBottom: 8 }} />
          <button className="btn-primary" onClick={() => void send()} disabled={busy || !draft.trim()} style={{ width: '100%', padding: '10px', opacity: !draft.trim() ? 0.6 : 1 }}>Send answer</button>
          <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 8 }}>You will see {partner}&apos;s answer once you have sent yours.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '10px 12px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 2 }}>You</p>
            <p style={{ fontSize: 14, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{daily.mine}</p>
          </div>
          <div style={{ background: 'var(--pink-glow)', borderRadius: 12, padding: '10px 12px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 2 }}>{partner}</p>
            {daily.theirs
              ? <p style={{ fontSize: 14, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{daily.theirs}</p>
              : <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>Waiting for {partner}…</p>}
          </div>
        </div>
      )}
    </div>
  );
}

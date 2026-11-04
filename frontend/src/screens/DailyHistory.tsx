import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import { useApp } from '../context';
import { fetchDailyHistory, type DailyHistoryDay } from '../lib/serverFeatures';

const fmt = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });

// Every "question of the day" the two of you have answered, newest first — a small shared diary.
export default function DailyHistory({ onBack }: { onBack: () => void }) {
  const { myProfile, partnerProfile } = useApp();
  const [days, setDays] = useState<DailyHistoryDay[] | null>(null);
  const partner = partnerProfile?.displayName ?? 'Partner';

  useEffect(() => {
    if (!myProfile?.id) return;
    let live = true;
    void fetchDailyHistory(myProfile.id).then(r => { if (live) setDays(r.days); });
    return () => { live = false; };
  }, [myProfile?.id]);

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 25, color: 'var(--ink)', marginBottom: 4 }}>Our Questions</p>
      <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 20 }}>The little questions you answered together.</p>

      {days === null && [0, 1, 2].map(i => <div key={i} className="card skeleton" aria-hidden="true" style={{ height: 110, marginBottom: 12 }} />)}
      {days?.length === 0 && <EmptyState icon="💬" title="No answers yet" sub="Answer today's question on Home and it will be kept here." />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {days?.map(d => (
          <div key={d.date} className="card" style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 6 }}>{fmt(d.date)}</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: 'var(--ink)', lineHeight: 1.4, marginBottom: 10 }}>{d.question}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '8px 12px' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 2 }}>You</p>
                <p style={{ fontSize: 14, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{d.mine ?? 'No answer'}</p>
              </div>
              <div style={{ background: 'var(--pink-glow)', borderRadius: 12, padding: '8px 12px' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)', marginBottom: 2 }}>{partner}</p>
                <p style={{ fontSize: 14, color: d.theirs ? 'var(--ink)' : 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>{d.theirs ?? (d.mine ? 'No answer' : 'Answer first to see this')}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

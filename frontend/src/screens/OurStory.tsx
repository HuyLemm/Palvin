import { useMemo } from 'react';
import EmptyState from '../components/EmptyState';
import { useApp } from '../context';
import Icon from '../components/Icon';
import { getDaysTogether } from '../data';

interface Item { key: string; date: Date; emoji: string; title: string; sub?: string; go?: () => void }

const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

// "Our Story": one timeline built from data the app already has — the day it
// started, 100-day milestones and anniversaries, memories, trips and the
// anniversary/birthday events. Newest first, grouped by year.
export default function OurStory({ onBack, onOpenTrips }: { onBack: () => void; onOpenTrips: () => void }) {
  const { state, navigate } = useApp();

  const { items, days } = useMemo(() => {
    const out: Item[] = [];
    const start = state.relationshipStart ? new Date(state.relationshipStart + 'T00:00:00') : null;
    const today = new Date();
    let days = 0;
    if (start) {
      days = getDaysTogether(start);
      out.push({ key: 'start', date: start, emoji: '💕', title: 'The day we became us', sub: 'Day 1' });
      for (let n = 100; n <= days; n += 100) {
        const d = new Date(start); d.setDate(d.getDate() + n - 1);
        const isYear = n % 365 === 0;
        out.push({ key: `ms${n}`, date: d, emoji: isYear ? '🎉' : '✨', title: `Day ${n.toLocaleString()}`, sub: isYear ? `${n / 365} year${n === 365 ? '' : 's'} together` : 'Milestone' });
      }
      for (let y = 1; ; y++) {
        const d = new Date(start); d.setFullYear(start.getFullYear() + y);
        if (d > today) break;
        out.push({ key: `an${y}`, date: d, emoji: '🎂', title: `${y}${y === 1 ? 'st' : y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'} anniversary` });
      }
    }
    for (const m of state.memories) {
      const d = new Date(m.date);
      if (!isNaN(d.getTime())) out.push({ key: `m${m.id}`, date: d, emoji: '🌸', title: m.title, sub: m.location || undefined, go: () => navigate('memory-detail', m.id) });
    }
    for (const t of state.trips) {
      if (t.startDate && t.status !== 'planning') out.push({ key: `t${t.id}`, date: new Date(t.startDate + 'T12:00:00'), emoji: '✈️', title: t.title, sub: t.destination || undefined, go: onOpenTrips });
    }
    for (const e of state.events) {
      if ((e.category === 'anniversary' || e.category === 'birthday') && e.recurrence === 'none') {
        out.push({ key: `e${e.id}`, date: new Date(e.date + 'T12:00:00'), emoji: e.category === 'birthday' ? '🎂' : '💌', title: e.title, go: () => navigate('calendar') });
      }
    }
    const past = out.filter(i => i.date <= today).sort((a, b) => b.date.getTime() - a.date.getTime());
    return { items: past, days };
  }, [state.relationshipStart, state.memories, state.trips, state.events, navigate, onOpenTrips]);

  const years = [...new Set(items.map(i => i.date.getFullYear()))];

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}>
        <Icon emoji="←" size={16} /> Back
      </button>
      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 25, color: 'var(--ink)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>Our Story <Icon emoji="💕" size={20} /></p>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 22 }}>
        {days > 0 ? `Day ${days.toLocaleString()} and counting — every milestone, memory and trip in one place.` : 'Set your anniversary in Settings to start your timeline.'}
      </p>

      {items.length === 0 && <EmptyState icon="📖" title="Your story starts here" sub="Add memories, trips and events and they will appear on this timeline." />}

      {years.map(y => (
        <section key={y} aria-label={String(y)} style={{ marginBottom: 8 }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, color: 'var(--sakura-deep)', margin: '4px 0 12px' }}>{y}</p>
          <ol style={{ listStyle: 'none', margin: 0, padding: '0 0 0 18px', borderLeft: '2px solid var(--border)' }}>
            {items.filter(i => i.date.getFullYear() === y).map(i => {
              const body = (
                <>
                  <span aria-hidden="true" style={{ position: 'absolute', left: -30, top: 12, width: 20, height: 20, borderRadius: '50%', background: 'var(--white)', border: '2px solid var(--sakura)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon emoji={i.emoji} size={11} />
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)' }}>{fmt(i.date)}</span>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginTop: 1 }}>{i.title}</span>
                  {i.sub && <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-2)', marginTop: 1 }}>{i.sub}</span>}
                </>
              );
              return (
                <li key={i.key} style={{ position: 'relative', marginBottom: 10 }}>
                  {i.go
                    ? <button onClick={i.go} style={{ position: 'relative', width: '100%', textAlign: 'left', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 14px', cursor: 'pointer', font: 'inherit' }}>{body}</button>
                    : <div style={{ position: 'relative', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14, padding: '10px 14px' }}>{body}</div>}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

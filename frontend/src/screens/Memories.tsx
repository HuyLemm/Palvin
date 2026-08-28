import { useState } from 'react';
import { useApp } from '../context';
import AddMemoryForm from '../components/forms/AddMemoryForm';

type Filter = 'All' | '2026' | '2025' | '2024' | '2023';
const FILTERS: Filter[] = ['All', '2026', '2025', '2024', '2023'];

export default function Memories() {
  const { state, navigate, toggleFavorite } = useApp();
  const [filter, setFilter] = useState<Filter>('All');
  const [showAdd, setShowAdd] = useState(false);

  const memories = filter === 'All'
    ? state.memories
    : state.memories.filter(m => m.year === +filter);

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            flexShrink: 0, padding: '7px 16px', borderRadius: 99, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none',
            background: filter === f ? 'var(--sakura-deep)' : 'var(--white)',
            color: filter === f ? 'white' : 'var(--ink-2)',
            outline: filter === f ? 'none' : '1.5px solid var(--border)',
            transition: 'all 0.15s'
          } as any}>{f}</button>
        ))}
      </div>

      {memories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌸</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>No memories yet</p>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 20 }}>Let's create your first little memory.</p>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>Add Memory</button>
        </div>
      ) : (
        <div className="memory-grid">
          {memories.map((m, i) => (
            <div key={m.id} onClick={() => navigate('memory-detail', m.id)} style={{ borderRadius: 16, overflow: 'hidden', cursor: 'pointer', background: 'var(--white)', border: '1px solid var(--border)', display: 'block', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(201,95,124,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
              <div style={{ aspectRatio: i % 3 === 0 ? '4/5' : '1', background: 'var(--sakura-light)', overflow: 'hidden' }}>
                <img src={m.image} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ padding: '10px 12px 12px' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 3 }}>{m.title}</p>
                <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>{m.date}</p>
                {m.location && <p style={{ fontSize: 11, color: 'var(--ink-2)' }}>📍 {m.location}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowAdd(true)}
        style={{ position: 'fixed', bottom: 96, right: 20, width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, var(--sakura-accent), var(--sakura-deep))', color: 'white', border: 'none', fontSize: 22, cursor: 'pointer', boxShadow: '0 4px 16px rgba(201,95,124,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
      >+</button>

      {showAdd && <AddMemoryForm onClose={() => setShowAdd(false)} />}
    </div>
  );
}

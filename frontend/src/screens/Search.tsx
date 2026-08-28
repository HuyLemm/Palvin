import { useState } from 'react';
import { useApp } from '../context';

export default function Search() {
  const { state, navigate } = useApp();
  const [query, setQuery] = useState('');

  const q = query.toLowerCase().trim();

  const results = q === '' ? [] : [
    ...state.posts.filter(p => p.caption.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q))
      .map(p => ({ type: 'Post', title: p.caption.slice(0, 50), sub: `by ${p.author} · ${p.date}`, emoji: '📸', action: () => navigate('post-detail', p.id) })),
    ...state.memories.filter(m => m.title.toLowerCase().includes(q) || m.location.toLowerCase().includes(q) || m.description.toLowerCase().includes(q))
      .map(m => ({ type: 'Memory', title: m.title, sub: `${m.date} · ${m.location}`, emoji: '🌸', action: () => navigate('memory-detail', m.id) })),
    ...state.loveNotes.filter(n => n.message.toLowerCase().includes(q))
      .map(n => ({ type: 'Love Note', title: n.message.slice(0, 50), sub: `from ${n.from}`, emoji: '💌', action: () => navigate('love-notes') })),
    ...state.savingsGoals.filter(g => g.title.toLowerCase().includes(q))
      .map(g => ({ type: 'Savings Goal', title: g.title, sub: `$${g.current} / $${g.target}`, emoji: '💰', action: () => navigate('money') })),
    ...state.events.filter(e => e.title.toLowerCase().includes(q) || e.location.toLowerCase().includes(q))
      .map(e => ({ type: 'Event', title: e.title, sub: `${e.date} · ${e.location}`, emoji: '📅', action: () => navigate('calendar') })),
    ...state.places.filter(p => p.name.toLowerCase().includes(q))
      .map(p => ({ type: 'Place', title: p.name, sub: `${p.memoryIds.length} memories`, emoji: '📍', action: () => navigate('us') })),
  ];

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--ink-2)' }}>🔍</span>
        <input
          className="input-field"
          placeholder="Search posts, memories, notes, places..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
          style={{ paddingLeft: 44 }}
        />
      </div>

      {q === '' && (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Search PALVIN</p>
          <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>Posts, memories, notes, goals, events and places</p>
        </div>
      )}

      {q !== '' && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌸</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>No results for "{query}"</p>
          <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>Try a different search term.</p>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500, marginBottom: 4 }}>{results.length} result{results.length !== 1 ? 's' : ''}</p>
          {results.map((r, i) => (
            <div key={i} onClick={r.action} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14, cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--white)'}
            >
              <div style={{ width: 40, height: 40, background: 'var(--sakura-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{r.emoji}</div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</p>
                <p style={{ fontSize: 12, color: 'var(--ink-2)' }}>{r.type} · {r.sub}</p>
              </div>
              <span style={{ color: 'var(--ink-2)', fontSize: 16 }}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

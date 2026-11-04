import { useMemo, useState } from 'react';
import { useApp } from '../context';
import Icon from '../components/Icon';
import { matchesAll } from '../lib/searchText';

interface Result { type: string; title: string; sub: string; emoji: string; action: () => void }

export default function Search() {
  const { state, navigate } = useApp();
  const [query, setQuery] = useState('');
  const [only, setOnly] = useState<string | null>(null);

  const q = query.trim();

  // Accent-insensitive ("da lat" finds "Đà Lạt"), every word must match, across everything
  // the app keeps: posts, memories, notes, goals, events, places, to-dos, expenses, trips,
  // gratitude entries and chat messages.
  const all = useMemo<Result[]>(() => q === '' ? [] : [
    ...state.posts.filter(p => matchesAll(q, p.caption, p.location))
      .map(p => ({ type: 'Post', title: p.caption.slice(0, 50), sub: `by ${p.author} · ${p.date}`, emoji: '📸', action: () => navigate('post-detail', p.id) })),
    ...state.memories.filter(m => matchesAll(q, m.title, m.location, m.description))
      .map(m => ({ type: 'Memory', title: m.title, sub: `${m.date} · ${m.location}`, emoji: '🌸', action: () => navigate('memory-detail', m.id) })),
    ...state.loveNotes.filter(n => matchesAll(q, n.message))
      .map(n => ({ type: 'Love Note', title: n.message.slice(0, 50), sub: `from ${n.from}`, emoji: '💌', action: () => navigate('love-notes') })),
    ...state.chatMessages.filter(m => m.text && matchesAll(q, m.text))
      .slice(-30).reverse()
      .map(m => ({ type: 'Chat', title: (m.text ?? '').slice(0, 50), sub: `${m.mine ? 'You' : m.sender}`, emoji: '💬', action: () => navigate('chat') })),
    ...state.expenses.filter(e => matchesAll(q, e.title, e.note, e.category))
      .slice(0, 30)
      .map(e => ({ type: 'Expense', title: e.title, sub: `${e.date} · ${Math.round(e.amount).toLocaleString('en-US')} VND`, emoji: e.categoryEmoji || '💰', action: () => navigate('money') })),
    ...state.savingsGoals.filter(g => matchesAll(q, g.title))
      .map(g => ({ type: 'Savings Goal', title: g.title, sub: `${Math.round(g.current).toLocaleString('en-US')} / ${Math.round(g.target).toLocaleString('en-US')} VND`, emoji: '💰', action: () => navigate('goals') })),
    ...state.events.filter(e => matchesAll(q, e.title, e.location))
      .map(e => ({ type: 'Event', title: e.title, sub: `${e.date} · ${e.location}`, emoji: '📅', action: () => navigate('calendar') })),
    ...state.todos.filter(t => matchesAll(q, t.title))
      .map(t => ({ type: 'To Do', title: t.title, sub: t.completed ? 'Done' : 'To do', emoji: '✅', action: () => navigate('todos') })),
    ...state.trips.filter(t => matchesAll(q, t.title, t.destination, t.notes))
      .map(t => ({ type: 'Trip', title: t.title, sub: t.destination, emoji: t.emoji || '✈️', action: () => navigate('us') })),
    ...state.gratitude.filter(g => matchesAll(q, g.text))
      .map(g => ({ type: 'Gratitude', title: g.text.slice(0, 50), sub: `${g.from} · ${g.date}`, emoji: '🌸', action: () => navigate('gratitude') })),
    ...state.places.filter(p => matchesAll(q, p.name))
      .map(p => ({ type: 'Place', title: p.name, sub: `${p.memoryIds.length} memories`, emoji: '📍', action: () => navigate('places') })),
  ], [q, state, navigate]);

  const types = useMemo(() => [...new Set(all.map(r => r.type))], [all]);
  const activeOnly = only && types.includes(only) ? only : null;
  const results = activeOnly ? all.filter(r => r.type === activeOnly) : all;

  return (
    <div style={{ paddingBottom: 32 }}>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-2)' }}><Icon emoji="🔍" size={18} /></span>
        <input
          className="input-field"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search posts, memories, chat, expenses…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOnly(null); }}
          autoFocus
          style={{ paddingLeft: 44 }}
        />
      </div>

      {types.length > 1 && (
        <div role="group" aria-label="Filter results by type" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 4 }}>
          {[null, ...types].map(t => {
            const on = (t ?? null) === activeOnly;
            return (
              <button key={t ?? 'all'} aria-pressed={on} onClick={() => setOnly(t)}
                style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 99, border: on ? 'none' : '1px solid var(--border)', background: on ? 'var(--btn-grad)' : 'var(--white)', color: on ? '#fff' : 'var(--ink)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {t ?? 'All'}{t ? ` ${all.filter(r => r.type === t).length}` : ''}
              </button>
            );
          })}
        </div>
      )}

      {q === '' && (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><Icon emoji="🔍" size={40} /></div>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Search PALVIN</p>
          <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>Posts, memories, chat, expenses, trips, to-dos and more. Accents don't matter: "da lat" finds "Đà Lạt".</p>
        </div>
      )}

      {q !== '' && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><Icon emoji="🌸" size={40} /></div>
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
              <div style={{ width: 40, height: 40, background: 'var(--sakura-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon emoji={r.emoji} size={20} /></div>
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

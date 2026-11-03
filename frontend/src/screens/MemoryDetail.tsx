import { useApp } from '../context';
import { shareMemory } from '../lib/shareCard';
import MapLink from '../components/MapLink';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import FadeImage from '../components/FadeImage';

export default function MemoryDetail({ id }: { id?: string } = {}) {
  const { state, selectedId, goBack, toggleFavorite, toast } = useApp();
  const memory = state.memories.find(m => m.id === (id ?? selectedId));

  if (!memory) return null;

  return (
    <div style={{ paddingBottom: 32 }}>
      <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sakura-deep)', fontWeight: 600, cursor: 'pointer', padding: '0 0 16px', fontSize: 15 }}><Icon emoji="←" size={16} /> Back</button>

      <div style={{ borderRadius: 20, overflow: 'hidden', background: 'var(--sakura-light)', marginBottom: 20, maxHeight: 440 }}>
        <FadeImage src={memory.image} alt={memory.title} style={{ width: '100%', height: '100%', maxHeight: 440 }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 27, color: 'var(--ink)', lineHeight: 1.2, marginBottom: 4 }}>{memory.title}</h1>
          <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>{memory.date}</p>
          {memory.location && <p style={{ fontSize: 14, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 4 }}><Icon emoji="📍" size={14} /> {memory.location}<MapLink place={memory.location} /></p>}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button aria-label="Share this memory" title="Share" onClick={async () => {
          const r = await shareMemory({ title: memory.title, date: memory.date, location: memory.location, description: memory.description, image: memory.image });
          if (r === 'saved') toast('Card saved to your device', '📥');
          else if (r === 'copied') toast('Copied to clipboard', '📋');
          else if (r === 'failed') toast('Could not share', '⚠️');
        }} style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 12, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ink-2)' }}>
          <Icon emoji="📤" size={18} />
        </button>
        <button onClick={() => toggleFavorite(memory.id)} style={{ background: memory.favorite ? 'var(--sakura-light)' : 'var(--bg)', border: `1.5px solid ${memory.favorite ? 'var(--sakura)' : 'var(--border)'}`, borderRadius: 12, padding: '8px 14px', cursor: 'pointer', transition: 'background-color 0.2s, border-color 0.2s, color 0.2s, opacity 0.2s, box-shadow 0.2s, transform 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon emoji={memory.favorite ? '❤️' : '🤍'} size={18} />
        </button>
        </div>
      </div>

      {memory.description && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 16, color: 'var(--ink)', lineHeight: 1.7 }}>{memory.description}</p>
        </div>
      )}

      <div className="card" style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-2)', marginBottom: 10 }}>People</p>
        <div style={{ display: 'flex', gap: 12 }}>
          {memory.people.map(p => (
            <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar user={p} size={36} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
